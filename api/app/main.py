"""The HTTP surface: the AI analysis endpoint, crawler-ready pages, and the built web app's files."""

from __future__ import annotations

import asyncio
import ipaddress
import logging
import mimetypes
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, PlainTextResponse, Response
from pydantic import BaseModel, Field

from . import server_copy
from .analysis import SYSTEM, AnalysisFailed, Analyzer, ClaudeAnalyzer, build_prompt, cache_key
from .gamedata import Build, GameData
from .inflight import KeyedLocks
from .pages import describe
from .settings import MAX_ITEMS, MAX_TRINKETS, Settings
from .store import LimitReached, Store

log = logging.getLogger("isaac_toys")

# Used when the web app has not been built (tests, API-only development).
BARE_SHELL = (
    '<!doctype html><html lang="en" data-theme="dark"><head><meta charset="utf-8" />'
    '<!--head-start--><!--head-end--></head><body><div id="root"><!--server-copy--></div></body></html>'
)
HEAD_START, HEAD_END, COPY = "<!--head-start-->", "<!--head-end-->", "<!--server-copy-->"

MESSAGES = {
    "rate_limited": "You've used today's AI analyses. They reset at midnight UTC.",
    "budget_exhausted": "The site's AI budget for today is used up. It resets at midnight UTC.",
    "not_configured": "AI analysis isn't switched on for this site yet.",
    "failed": "The AI didn't answer. Try again in a moment.",
}

CSP = (
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
    "font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
)


class AnalyzeRequest(BaseModel):
    character: str | None = Field(default=None, max_length=40)
    items: list[int] = Field(default_factory=list, max_length=MAX_ITEMS)
    trinkets: list[int] = Field(default_factory=list, max_length=MAX_TRINKETS)


def problem(status: int, code: str, message: str | None = None) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message or MESSAGES[code]})


def client_ip(request: Request, header: str) -> str:
    """Who to count a request against: the visitor's address behind Railway's edge (and Cloudflare, when
    it proxies the domain).

    Railway's edge overwrites X-Forwarded-For, so its first entry is the real peer. CF-Connecting-IP is
    only trustworthy when every request comes through Cloudflare, which is why it is opt-in.

    An IPv6 visitor is counted by their /64: a subscriber is handed the whole network, so counting single
    addresses would give them a fresh allowance for every one they cared to use.
    """
    candidates = []
    if header == "cf-connecting-ip":
        candidates.append(request.headers.get("cf-connecting-ip", ""))
    candidates.append(request.headers.get("x-forwarded-for", "").split(",")[0])
    for candidate in candidates:
        try:
            address = ipaddress.ip_address(candidate.strip())
        except ValueError:
            continue
        if isinstance(address, ipaddress.IPv6Address):
            if address.ipv4_mapped is not None:
                return str(address.ipv4_mapped)
            return str(ipaddress.ip_network((address, 64), strict=False))
        return str(address)
    return request.client.host if request.client else "unknown"


def create_app(
    settings: Settings | None = None,
    analyzer: Analyzer | None = None,
    store: Store | None = None,
) -> FastAPI:
    settings = settings or Settings.from_env()
    data = GameData.load(settings.data_path)
    store = store or Store(settings.data_dir / "isaac-toys.sqlite3")
    if analyzer is None and settings.anthropic_api_key:
        analyzer = ClaudeAnalyzer(settings)
    upstream = asyncio.Semaphore(4)
    in_flight = KeyedLocks()
    domain = settings.site_domain

    index = settings.web_dist / "index.html"
    shell = index.read_text(encoding="utf-8") if index.exists() else BARE_SHELL
    if HEAD_START not in shell or HEAD_END not in shell or COPY not in shell:
        raise RuntimeError("index.html has lost its server-copy markers")
    before_head, rest = shell.split(HEAD_START, 1)
    after_head = rest.split(HEAD_END, 1)[1]

    app = FastAPI(title=domain, docs_url=None, redoc_url=None, openapi_url=None)

    @app.middleware("http")
    async def headers(request: Request, call_next):  # type: ignore[no-untyped-def]
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = CSP
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if not settings.indexable:
            response.headers["X-Robots-Tag"] = "noindex"
        return response

    @app.exception_handler(RequestValidationError)
    async def invalid(_: Request, error: RequestValidationError) -> JSONResponse:
        first = error.errors()[0] if error.errors() else {}
        where = ".".join(str(p) for p in first.get("loc", ()) if p != "body")
        message = f"{where}: {first.get('msg', 'invalid')}" if where else "That build couldn't be read."
        return JSONResponse({"detail": {"code": "invalid", "message": message}}, status_code=422)

    # ------------------------------------------------------------ API

    @app.get("/api/health")
    async def health() -> dict[str, object]:
        return {"status": "ok", "ai": analyzer is not None, "items": len(data.items), "synergies": len(data.synergies)}

    @app.post("/api/analyze")
    async def analyze(body: AnalyzeRequest, request: Request) -> dict[str, object]:
        if body.character is not None and body.character not in data.character_by_slug:
            raise problem(422, "invalid", "Unknown character.")
        if any(i not in data.item_by_id for i in body.items) or any(t not in data.trinket_by_id for t in body.trinkets):
            raise problem(422, "invalid", "Unknown item or trinket.")
        if len(set(body.items)) != len(body.items) or len(set(body.trinkets)) != len(body.trinkets):
            raise problem(422, "invalid", "The same pickup is listed twice.")
        if not body.items and not body.trinkets:
            raise problem(422, "invalid", "Add at least one item or trinket first.")
        if analyzer is None:
            raise problem(503, "not_configured")

        # Order of pickup does not change a build: one prompt, and so one saved answer, per build.
        build = Build(character=body.character, items=tuple(body.items), trinkets=tuple(body.trinkets))
        prompt = build_prompt(data, build.canonical())
        key = cache_key(settings.ai_model, SYSTEM, prompt)
        visitor = store.visitor(client_ip(request, settings.client_ip_header))
        limit = settings.per_visitor_per_day

        def from_cache(saved: str) -> dict[str, object]:
            return {"text": saved, "cached": True, "remaining": max(0, limit - store.used(visitor)), "limit": limit}

        saved = store.cached(key)
        if saved is not None:
            return from_cache(saved)

        # One model call per build at a time. A request that arrives while the same build is being
        # answered waits here, then finds the saved answer: no second paid call, nothing off its allowance.
        async with in_flight.hold(key):
            saved = store.cached(key)
            if saved is not None:
                return from_cache(saved)
            try:
                reservation = store.reserve(visitor, limit, settings.site_per_day)
            except LimitReached as refused:
                raise problem(429, refused.code) from refused
            try:
                async with upstream:
                    text = await analyzer.analyze(SYSTEM, prompt)
            except AnalysisFailed as error:
                # The visitor got nothing either way. The site's budget is refunded only if nobody paid.
                store.release(reservation, site=not error.billed)
                log.warning("analysis failed: %s", error)
                raise problem(502, "failed") from error
            except Exception as error:
                # Anything the analyzer did not expect (a changed SDK, a new kind of answer) must not keep
                # the visitor's allowance or answer a bare 500.
                store.release(reservation)
                log.exception("analysis failed unexpectedly")
                raise problem(502, "failed") from error
            store.remember(key, text)
        return {"text": text, "cached": False, "remaining": max(0, limit - store.used(visitor)), "limit": limit}

    @app.api_route("/api/{rest:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], include_in_schema=False)
    async def no_such_endpoint(rest: str) -> JSONResponse:
        return JSONResponse({"detail": {"code": "not_found", "message": "No such endpoint."}}, status_code=404)

    # ------------------------------------------------------------ site-wide files

    @app.get("/sitemap.xml", include_in_schema=False)
    async def sitemap() -> Response:
        return Response(server_copy.sitemap_xml(data, settings.site_url), media_type="application/xml")

    @app.get("/robots.txt", include_in_schema=False)
    async def robots() -> PlainTextResponse:
        return PlainTextResponse(server_copy.robots_txt(settings.site_url, settings.indexable))

    @app.get("/llms.txt", include_in_schema=False)
    async def llms() -> PlainTextResponse:
        return PlainTextResponse(server_copy.llms_txt(data, settings.site_url, domain))

    # ------------------------------------------------------------ pages and files

    dist = settings.web_dist.resolve()

    def built_file(path: str) -> Path | None:
        """A file from the web build, never anything outside it."""
        if not path or path.endswith("/"):
            return None
        try:
            candidate = (dist / path).resolve()
            if dist in candidate.parents and candidate.is_file() and candidate.name != "index.html":
                return candidate
        except (OSError, ValueError):
            # A null byte, or a name longer than the file system allows: an address, but never a file.
            return None
        return None

    @app.get("/{path:path}", include_in_schema=False)
    async def page(path: str) -> Response:
        found = built_file(path)
        if found is not None:
            # Vite puts a content hash in everything under /assets, so those never change.
            cache = "public, max-age=31536000, immutable" if path.startswith("assets/") else "public, max-age=3600"
            media_type = mimetypes.guess_type(found.name)[0] or "application/octet-stream"
            return FileResponse(found, media_type=media_type, headers={"Cache-Control": cache})
        if "." in path.rsplit("/", 1)[-1]:
            # Looks like a file and is not one we have: a plain 404, not a page.
            return PlainTextResponse("Not found", status_code=404)

        described = describe("/" + path, data, domain)
        head = server_copy.render_head(described, data, settings.site_url, domain)
        body = server_copy.render_copy(described, data, domain)
        html = before_head + HEAD_START + "\n    " + head + "\n    " + HEAD_END + after_head.replace(COPY, body, 1)
        return HTMLResponse(html, status_code=200 if described.found else 404, headers={"Cache-Control": "no-cache"})

    return app
