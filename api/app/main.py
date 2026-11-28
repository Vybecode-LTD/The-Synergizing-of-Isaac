"""The HTTP surface: the AI analysis endpoint, crawler-ready pages, and the built web app's files."""

from __future__ import annotations

import asyncio
import logging
import mimetypes
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, PlainTextResponse, Response

from . import admin, server_copy, submissions
from .analysis import (
    SCHEMA,
    SYSTEM,
    AnalysisFailed,
    Analyzer,
    ClaudeAnalyzer,
    Reading,
    build_prompt,
    cache_key,
    read_answer,
)
from .community import Community
from .gamedata import GameData
from .inflight import KeyedLocks
from .pages import describe
from .settings import Settings
from .store import LimitReached, Store
from .web import MESSAGES, BuildRequest, check_build, client_ip, problem
from .wiki import Wiki

__all__ = ["MESSAGES", "client_ip", "create_app", "problem"]

log = logging.getLogger("isaac_toys")

# Used when the web app has not been built (tests, API-only development).
BARE_SHELL = (
    '<!doctype html><html lang="en"><head><meta charset="utf-8" />'
    '<!--head-start--><!--head-end--></head><body><div id="root"><!--server-copy--></div></body></html>'
)
HEAD_START, HEAD_END, COPY = "<!--head-start-->", "<!--head-end-->", "<!--server-copy-->"

# Google Tag Manager and Analytics (owner, 2026-11-28) are let in by the hosts Google's CSP guide lists for
# Tag Manager and for GA4 without ad features (developers.google.com/tag-platform/security/guides/csp), nothing
# more: still no inline script and no eval, so a Tag Manager "Custom HTML" tag will not run. *.google.com is
# for requests only (the guide lists it in connect-src alone; CodeRabbit, PR #15).
GOOGLE_SCRIPTS = "https://*.googletagmanager.com"
GOOGLE_IMAGES = "https://*.google-analytics.com https://*.googletagmanager.com"
GOOGLE_BEACONS = (
    "https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.google.com"
)
CSP = (
    f"default-src 'self'; script-src 'self' {GOOGLE_SCRIPTS}; style-src 'self' 'unsafe-inline'; "
    f"img-src 'self' data: {GOOGLE_IMAGES}; font-src 'self'; connect-src 'self' {GOOGLE_BEACONS}; "
    "base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
)
# Added to every production page but the owner's inbox: no visits counted from local runs or CI's browser test.
ANALYTICS_TAG = '<script src="/analytics.js" async></script>'

# The type of every kind of file the web build writes. Python's own list depends on the host: 3.12 knows
# neither .webp nor .woff2, and the slim image has no system list, so those went out as octet-stream.
BUILT_TYPES = {
    ".js": "text/javascript",
    ".css": "text/css",
    ".woff2": "font/woff2",
    ".webp": "image/webp",
    ".png": "image/png",
    ".svg": "image/svg+xml",
}


class AnalyzeRequest(BuildRequest):
    pass


def create_app(
    settings: Settings | None = None,
    analyzer: Analyzer | None = None,
    store: Store | None = None,
    wiki: Wiki | None = None,
) -> FastAPI:
    settings = settings or Settings.from_env()
    data = GameData.load(settings.data_path)
    store = store or Store(settings.data_dir / "isaac-toys.sqlite3")
    community = Community(data, store)
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
        path = request.url.path
        if not settings.indexable or path == "/admin" or path.startswith("/admin/"):
            response.headers["X-Robots-Tag"] = "noindex"
        if path.startswith("/api/admin/"):
            # The inbox is the owner's alone: no shared cache, and no back-button copy after signing out.
            response.headers["Cache-Control"] = "no-store"
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
        return {
            "status": "ok",
            "ai": analyzer is not None,
            "items": len(data.items),
            "synergies": len(data.synergies),
            "community": len(community.synergies()),
        }

    @app.get("/api/community")
    async def community_list() -> JSONResponse:
        """The live community synergies as data/synergies.json entries: public, and the weekly backup's source."""
        return JSONResponse({"entries": community.entries()}, headers={"Cache-Control": "no-cache"})

    def visitor_of(request: Request) -> str:
        return store.visitor(client_ip(request, settings.client_ip_header))

    app.include_router(submissions.routes(settings, data, store, visitor_of))
    app.include_router(admin.routes(settings, data, store, visitor_of, analyzer, wiki))

    @app.post("/api/analyze")
    async def analyze(body: AnalyzeRequest, request: Request) -> dict[str, object]:
        # Order of pickup does not change a build: one prompt, and so one saved answer, per build.
        build = check_build(data, body).canonical()
        if analyzer is None:
            raise problem(503, "not_configured")

        prompt = build_prompt(data, build)
        key = cache_key(settings.ai_model, SYSTEM, prompt, SCHEMA)
        visitor = visitor_of(request)
        limit = settings.per_visitor_per_day

        def answer(reading: Reading, cached: bool) -> dict[str, object]:
            return {
                "read": reading.read,
                "found": reading.found,
                "cached": cached,
                "remaining": max(0, limit - store.used(visitor)),
                "limit": limit,
            }

        def saved_reading() -> Reading | None:
            saved = store.cached(key)
            if saved is None:
                return None
            try:
                return read_answer(saved, community.view(), build)
            except AnalysisFailed:
                return None  # only readable answers are saved, so this is a reader stricter than the writer

        reading = saved_reading()
        if reading is not None:
            return answer(reading, cached=True)

        # One model call per build at a time. A request that arrives while the same build is being
        # answered waits here, then finds the saved answer: no second paid call, nothing off its allowance.
        async with in_flight.hold(key):
            reading = saved_reading()
            if reading is not None:
                return answer(reading, cached=True)
            try:
                reservation = store.reserve(visitor, limit, settings.site_per_day)
            except LimitReached as refused:
                raise problem(429, refused.code) from refused
            try:
                async with upstream:
                    text = await analyzer.analyze(SYSTEM, prompt)
                # An answer that doesn't fit the schema was paid for but can't be shown: billed, not saved.
                reading = read_answer(text, community.view(), build)
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
        return answer(reading, cached=False)

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
        return PlainTextResponse(server_copy.llms_txt(community.view(), settings.site_url, domain))

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
            guessed = mimetypes.guess_type(found.name)[0]
            media_type = BUILT_TYPES.get(found.suffix.lower()) or guessed or "application/octet-stream"
            return FileResponse(found, media_type=media_type, headers={"Cache-Control": cache})
        if "." in path.rsplit("/", 1)[-1]:
            # Looks like a file and is not one we have: a plain 404, not a page.
            return PlainTextResponse("Not found", status_code=404)

        view = community.view()
        described = describe("/" + path, view, domain)
        head = server_copy.render_head(described, view, settings.site_url, domain) + "\n    " + community.inline_tag()
        if settings.indexable and path != "admin" and not path.startswith("admin/"):
            head += "\n    " + ANALYTICS_TAG
        body = server_copy.render_copy(described, view, domain)
        html = before_head + HEAD_START + "\n    " + head + "\n    " + HEAD_END + after_head.replace(COPY, body, 1)
        return HTMLResponse(html, status_code=200 if described.found else 404, headers={"Cache-Control": "no-cache"})

    return app
