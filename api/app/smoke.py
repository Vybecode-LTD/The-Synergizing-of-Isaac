"""Checks a running copy of the site over HTTP: the Docker image in CI, and the live site after a deploy.

Standard library only, so it runs wherever Python 3.12 does. From `api/`:

    python -m app.smoke http://localhost:8080 --ai off
    python -m app.smoke https://isaac.toys --ai on --indexable --site-url https://isaac.toys

It never asks the model anything: `--ai on` reads /api/health only, so a live run costs nothing.
"""

from __future__ import annotations

import argparse
import contextlib
import importlib
import json
import re
import sys
import urllib.error
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass


@dataclass(frozen=True)
class Reply:
    status: int
    headers: dict[str, str]  # names in lower case
    body: bytes

    @property
    def text(self) -> str:
        return self.body.decode("utf-8", "replace")

    @property
    def type(self) -> str:
        return self.headers.get("content-type", "").split(";")[0].strip()


# (method, path, body) -> reply. A 4xx or 5xx is a reply, not an exception.
Fetch = Callable[[str, str, bytes | None], Reply]


@dataclass(frozen=True)
class Options:
    ai: bool | None = None  # True or False: what /api/health must say. None: not checked.
    indexable: bool = False  # production: robots allows crawlers and no noindex header
    site_url: str | None = None  # the address canonical links and the sitemap must use


class CheckFailed(Exception):
    pass


def expect(condition: bool, message: str) -> None:
    if not condition:
        raise CheckFailed(message)


def get(fetch: Fetch, path: str, status: int = 200) -> Reply:
    reply = fetch("GET", path, None)
    expect(reply.status == status, f"{path} answered {reply.status}, expected {status}")
    return reply


# ---------------------------------------------------------------- the checks


def check_health(fetch: Fetch, options: Options) -> None:
    body = json.loads(get(fetch, "/api/health").body)
    expect(body.get("status") == "ok", f"status is {body.get('status')!r}")
    for count in ("items", "synergies"):
        expect(isinstance(body.get(count), int) and body[count] > 0, f"{count} is {body.get(count)!r}")
    if options.ai is not None:
        expect(body.get("ai") is options.ai, f"ai is {body.get('ai')!r}, expected {options.ai}")


def check_home(fetch: Fetch, options: Options) -> None:
    reply = get(fetch, "/")
    expect(reply.type == "text/html", f"/ is {reply.type}")
    expect(reply.text.count("<h1") == 1, f"/ has {reply.text.count('<h1')} h1 elements")
    expect('<div id="root">' in reply.text, "/ has no element for the app to mount into")


def built_assets(fetch: Fetch) -> list[str]:
    return re.findall(r'(?:src|href)="(/assets/[^"]+)"', get(fetch, "/").text)


def check_built_app(fetch: Fetch, options: Options) -> None:
    assets = built_assets(fetch)
    scripts = [a for a in assets if a.endswith(".js")]
    styles = [a for a in assets if a.endswith(".css")]
    expect(bool(scripts) and bool(styles), f"/ links {len(scripts)} scripts and {len(styles)} stylesheets")
    for path, kind in [(p, "text/javascript") for p in scripts] + [(p, "text/css") for p in styles]:
        reply = get(fetch, path)
        expect(reply.type == kind, f"{path} is {reply.type}, expected {kind}")
        expect(bool(reply.body.strip()), f"{path} is empty")
        expect("immutable" in reply.headers.get("cache-control", ""), f"{path} is not cached as immutable")


def check_fonts(fetch: Fetch, options: Options) -> None:
    fonts: set[str] = set()
    for path in (a for a in built_assets(fetch) if a.endswith(".css")):
        fonts.update(re.findall(r"url\(\s*[\"']?(/assets/[^\"')]+\.woff2)", get(fetch, path).text))
    expect(bool(fonts), "the stylesheets load no .woff2 font")
    for path in sorted(fonts):
        reply = get(fetch, path)
        expect(reply.type == "font/woff2", f"{path} is {reply.type}, expected font/woff2")
        expect(reply.body[:4] == b"wOF2", f"{path} is not a WOFF2 file")


def check_sprites(fetch: Fetch, options: Options) -> None:
    for sheet in ("items", "trinkets"):
        path = f"/sprites/{sheet}.webp"
        reply = get(fetch, path)
        expect(reply.type == "image/webp", f"{path} is {reply.type}, expected image/webp")
        expect(reply.body[:4] == b"RIFF" and reply.body[8:12] == b"WEBP", f"{path} is not a WebP file")


def check_item_page(fetch: Fetch, options: Options) -> None:
    html = get(fetch, "/items/brimstone").text
    expect(re.findall(r"<h1[^>]*>(.*?)</h1>", html, flags=re.S) == ["Brimstone"], "the h1 is not Brimstone alone")
    expect("<article>" in html, "/items/brimstone lists no synergies")
    if options.site_url:
        canonical = f'<link rel="canonical" href="{options.site_url.rstrip("/")}/items/brimstone"'
        expect(canonical in html, f"the canonical link is not {options.site_url}/items/brimstone")


def check_missing_page(fetch: Fetch, options: Options) -> None:
    reply = get(fetch, "/items/nope", status=404)
    expect(reply.type == "text/html", f"/items/nope is {reply.type}")
    expect('<meta name="robots" content="noindex"' in reply.text, "the 404 page may be indexed")


def check_missing_file(fetch: Fetch, options: Options) -> None:
    reply = get(fetch, "/assets/nope.js", status=404)
    expect("<html" not in reply.text, "a missing file answers with a page")


def check_missing_endpoint(fetch: Fetch, options: Options) -> None:
    reply = get(fetch, "/api/nope", status=404)
    expect(reply.type == "application/json", f"/api/nope is {reply.type}")
    expect(json.loads(reply.body)["detail"]["code"] == "not_found", "/api/nope has the wrong error code")


def check_robots(fetch: Fetch, options: Options) -> None:
    text = get(fetch, "/robots.txt").text
    if options.indexable:
        for bot in ("GPTBot", "ClaudeBot", "PerplexityBot"):
            expect(f"User-agent: {bot}\nAllow: /" in text, f"robots.txt does not allow {bot}")
        expect("Sitemap: " in text, "robots.txt names no sitemap")
    else:
        expect("Disallow: /\n" in text and "Allow:" not in text, "robots.txt lets crawlers in outside production")


def check_sitemap(fetch: Fetch, options: Options) -> None:
    reply = get(fetch, "/sitemap.xml")
    expect(reply.type == "application/xml", f"/sitemap.xml is {reply.type}")
    locs = re.findall(r"<loc>([^<]+)</loc>", reply.text)
    expect(len(locs) > 100, f"the sitemap lists {len(locs)} pages")
    expect(any(loc.endswith("/items/brimstone") for loc in locs), "the sitemap leaves out /items/brimstone")
    if options.site_url:
        prefix = options.site_url.rstrip("/") + "/"
        expect(all(loc.startswith(prefix) for loc in locs), f"the sitemap lists pages outside {prefix}")


def check_headers(fetch: Fetch, options: Options) -> None:
    for path, status in (("/", 200), ("/api/health", 200), ("/items/nope", 404)):
        headers = get(fetch, path, status).headers
        expect("script-src 'self'" in headers.get("content-security-policy", ""), f"{path} has no script policy")
        expect(headers.get("x-content-type-options") == "nosniff", f"{path} lets the browser sniff types")
        noindex = bool({"noindex", "none"} & robots_directives(headers.get("x-robots-tag", "")))
        expect(noindex != options.indexable, f"{path} {'is' if noindex else 'is not'} marked noindex")


def robots_directives(header: str) -> set[str]:
    """X-Robots-Tag directives in lower case, any "botname:" in front dropped: "noindex, nofollow" is both."""
    return {part.split(":", 1)[-1].strip().lower() for part in header.split(",") if part.strip()}


def check_analyze_is_off(fetch: Fetch, options: Options) -> None:
    # A build sent to a site with a key is a paid analysis, so ask only a site whose own health says AI is off.
    health = fetch("GET", "/api/health", None)
    try:
        body = json.loads(health.body) if health.status == 200 else {}
    except ValueError:
        body = {}
    ai = body.get("ai") if isinstance(body, dict) else None
    expect(ai is False, f"not sent: /api/health does not say AI is off (ai is {ai!r})")
    reply = fetch("POST", "/api/analyze", b'{"items": [1]}')
    expect(reply.status == 503, f"/api/analyze answered {reply.status}, expected 503 with AI off")
    expect(json.loads(reply.body)["detail"]["code"] == "not_configured", "/api/analyze has the wrong error code")


Check = Callable[[Fetch, Options], None]
CHECKS: list[tuple[str, Check, Callable[[Options], bool]]] = [
    ("health", check_health, lambda o: True),
    ("home", check_home, lambda o: True),
    ("built app", check_built_app, lambda o: True),
    ("fonts", check_fonts, lambda o: True),
    ("sprite sheets", check_sprites, lambda o: True),
    ("item page", check_item_page, lambda o: True),
    ("missing page", check_missing_page, lambda o: True),
    ("missing file", check_missing_file, lambda o: True),
    ("missing endpoint", check_missing_endpoint, lambda o: True),
    ("robots", check_robots, lambda o: True),
    ("sitemap", check_sitemap, lambda o: True),
    ("headers", check_headers, lambda o: True),
    # Only with AI known to be off: with it on, this would spend a real analysis.
    ("analyze is off", check_analyze_is_off, lambda o: o.ai is False),
]


def run(fetch: Fetch, options: Options) -> list[tuple[str, str | None]]:
    """Every check that applies, in order, as (name, None) or (name, why it failed). Never raises."""
    results: list[tuple[str, str | None]] = []
    for name, check, applies in CHECKS:
        if not applies(options):
            continue
        try:
            check(fetch, options)
            results.append((name, None))
        except CheckFailed as failed:
            results.append((name, str(failed)))
        except Exception as error:
            results.append((name, f"{type(error).__name__}: {error}"))
    return results


# ---------------------------------------------------------------- over the network


def http_fetch(base_url: str, timeout: float = 20.0) -> Fetch:
    base = base_url.rstrip("/")

    def fetch(method: str, path: str, body: bytes | None) -> Reply:
        headers = {"user-agent": "isaac-toys-smoke/1"}
        if body is not None:
            headers["content-type"] = "application/json"
        request = urllib.request.Request(base + path, data=body, method=method, headers=headers)
        try:
            # main() refuses anything but http and https, so urlopen never sees a file: address.
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return Reply(response.status, {k.lower(): v for k, v in response.headers.items()}, response.read())
        except urllib.error.HTTPError as error:
            return Reply(error.code, {k.lower(): v for k, v in error.headers.items()}, error.read())

    return fetch


def use_system_certificates() -> None:
    """Trust the operating system's certificates where truststore is installed (it is in api/.venv)."""
    with contextlib.suppress(ImportError):
        importlib.import_module("truststore").inject_into_ssl()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.smoke", description="Check a running copy of the site.")
    parser.add_argument("base_url", help="where the site runs, e.g. http://localhost:8080")
    parser.add_argument("--ai", choices=["on", "off", "skip"], default="skip", help="what /api/health must say")
    parser.add_argument("--indexable", action="store_true", help="expect production: crawlers allowed")
    parser.add_argument("--site-url", help="the address canonical links and the sitemap must use")
    args = parser.parse_args(argv)
    if not args.base_url.startswith(("http://", "https://")):
        parser.error("base_url must start with http:// or https://")

    use_system_certificates()
    options = Options(
        ai={"on": True, "off": False, "skip": None}[args.ai], indexable=args.indexable, site_url=args.site_url
    )
    results = run(http_fetch(args.base_url), options)
    for name, error in results:
        print(f"ok    {name}" if error is None else f"FAIL  {name}: {error}")
    failed = sum(error is not None for _, error in results)
    print(f"{len(results) - failed} of {len(results)} checks passed against {args.base_url}")
    return 1 if failed or not results else 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
