"""The smoke checker that runs against the Docker image in CI and the live site after a deploy.

It is run here against the real app in-process. Every check must pass against a healthy site, and each
deliberate break below must turn exactly the checks it names red, or the check proves nothing."""

from __future__ import annotations

import sys
import threading
import types
from collections.abc import Callable, Iterator
from dataclasses import replace
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import smoke
from app.smoke import Fetch, Options, Reply

WEBP = b"RIFF\x1a\x00\x00\x00WEBPVP8L" + b"\x00" * 13
WOFF2 = b"wOF2" + b"\x00" * 12


def client_fetch(client: TestClient) -> Fetch:
    def fetch(method: str, path: str, body: bytes | None) -> Reply:
        headers = {"content-type": "application/json"} if body is not None else None
        r = client.request(method, path, content=body, headers=headers)
        return Reply(r.status_code, {k.lower(): v for k, v in r.headers.items()}, r.content)

    return fetch


@pytest.fixture
def dist(tmp_path: Path) -> Path:
    """A web build with one of everything the real one has: a script, a stylesheet, a font, two sheets."""
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "sprites").mkdir()
    (dist / "index.html").write_text(
        '<html><head><!--head-start--><!--head-end--><script type="module" crossorigin src="/assets/app.js">'
        '</script><link rel="stylesheet" crossorigin href="/assets/app.css"></head>'
        '<body><div id="root"><!--server-copy--></div></body></html>',
        encoding="utf-8",
    )
    (dist / "assets" / "app.js").write_text("console.log(1)", encoding="utf-8")
    (dist / "assets" / "app.css").write_text(
        '@font-face{font-family:F;src:url(/assets/font.woff2) format("woff2-variations")}', encoding="utf-8"
    )
    (dist / "assets" / "font.woff2").write_bytes(WOFF2)
    (dist / "sprites" / "items.webp").write_bytes(WEBP)
    (dist / "sprites" / "trinkets.webp").write_bytes(WEBP)
    return dist


@pytest.fixture
def ci_site(make_client: Callable[..., TestClient], dist: Path) -> Fetch:
    """The site as CI runs the image: no key, not production."""
    return client_fetch(make_client(with_ai=False, web_dist=dist, environment="ci"))


CI = Options(ai=False, indexable=False)
LIVE = Options(ai=True, indexable=True, site_url="https://isaac.toys")


def failures(results: list[tuple[str, str | None]]) -> set[str]:
    return {name for name, error in results if error is not None}


def test_every_check_passes_against_the_image_as_ci_runs_it(ci_site: Fetch) -> None:
    results = smoke.run(ci_site, CI)
    assert results == [(name, None) for name, _, _ in smoke.CHECKS]
    assert len(results) == 13


def test_every_check_but_the_paid_one_passes_against_production(
    make_client: Callable[..., TestClient], dist: Path
) -> None:
    live = client_fetch(make_client(with_ai=True, web_dist=dist, environment="production"))
    results = smoke.run(live, LIVE)
    assert failures(results) == set()
    # With AI on, asking for an analysis would be paid for, so that check does not run.
    assert [name for name, _ in results] == [name for name, _, _ in smoke.CHECKS if name != "analyze is off"]


def test_the_wrong_expectations_are_reported(make_client: Callable[..., TestClient], dist: Path) -> None:
    live = client_fetch(make_client(with_ai=True, web_dist=dist, environment="production"))
    # A site that is not production, and one whose links name another address.
    assert failures(smoke.run(live, replace(LIVE, indexable=False))) == {"robots", "headers"}
    assert failures(smoke.run(live, replace(LIVE, site_url="https://example.org"))) == {"item page", "sitemap"}
    # AI expected on, but the site has no key.
    assert failures(smoke.run(live, replace(LIVE, ai=False))) == {"health", "analyze is off"}


def without(reply: Reply, header: str) -> Reply:
    return replace(reply, headers={k: v for k, v in reply.headers.items() if k != header})


def typed(reply: Reply, kind: str) -> Reply:
    return replace(reply, headers={**reply.headers, "content-type": kind})


BREAKS: list[tuple[set[str], str, Callable[[Reply], Reply]]] = [
    (
        {"health"},
        "/api/health",
        lambda r: replace(r, body=b'{"status": "down", "items": 1, "synergies": 1, "ai": false}'),
    ),
    (
        {"health"},
        "/api/health",
        lambda r: replace(r, body=b'{"status": "ok", "items": 0, "synergies": 1, "ai": false}'),
    ),
    # A health reply that says nothing about AI stops the paid check too.
    (
        {"health", "analyze is off"},
        "/api/health",
        lambda r: replace(r, body=b'{"status": "ok", "items": 1, "synergies": 1}'),
    ),
    ({"health", "analyze is off"}, "/api/health", lambda r: replace(r, body=b"<html>not json</html>")),
    ({"home"}, "/", lambda r: replace(r, body=r.body.replace(b"</h1>", b"</h1><h1>again</h1>", 1))),
    ({"built app"}, "/assets/app.js", lambda r: replace(r, status=404)),
    ({"built app"}, "/assets/app.js", lambda r: typed(r, "application/octet-stream")),
    ({"built app"}, "/assets/app.css", lambda r: replace(r, headers={**r.headers, "cache-control": "no-cache"})),
    ({"fonts"}, "/assets/font.woff2", lambda r: typed(r, "application/octet-stream")),
    ({"fonts"}, "/assets/font.woff2", lambda r: replace(r, body=b"<html>")),
    ({"fonts"}, "/assets/app.css", lambda r: replace(r, body=b"body{color:red}")),
    ({"sprite sheets"}, "/sprites/trinkets.webp", lambda r: typed(r, "application/octet-stream")),
    ({"sprite sheets"}, "/sprites/items.webp", lambda r: replace(r, body=b"\x89PNG\r\n\x1a\n" + b"\x00" * 8)),
    ({"item page"}, "/items/brimstone", lambda r: replace(r, body=r.body.replace(b"<h1>Brimstone", b"<h1>Room"))),
    ({"item page"}, "/items/brimstone", lambda r: replace(r, body=r.body.replace(b"<article>", b"<div>"))),
    (
        {"missing page"},
        "/items/nope",
        lambda r: replace(r, body=r.body.replace(b'content="noindex"', b'content="all"')),
    ),
    ({"missing page", "headers"}, "/items/nope", lambda r: replace(r, status=200)),
    ({"missing file"}, "/assets/nope.js", lambda r: Reply(404, {"content-type": "text/html"}, b"<html></html>")),
    ({"missing endpoint"}, "/api/nope", lambda r: replace(r, status=200)),
    ({"robots"}, "/robots.txt", lambda r: replace(r, body=b"User-agent: *\nAllow: /\n")),
    ({"sitemap"}, "/sitemap.xml", lambda r: replace(r, body=b"<urlset></urlset>")),
    ({"headers"}, "/api/health", lambda r: without(r, "x-robots-tag")),
    ({"headers"}, "/", lambda r: without(r, "content-security-policy")),
    ({"headers"}, "/items/nope", lambda r: without(r, "x-content-type-options")),
    ({"analyze is off"}, "/api/analyze", lambda r: Reply(200, {"content-type": "application/json"}, b'{"text": "x"}')),
]


@pytest.mark.parametrize(("broken", "path", "change"), BREAKS)
def test_each_break_turns_exactly_its_checks_red(
    ci_site: Fetch, broken: set[str], path: str, change: Callable[[Reply], Reply]
) -> None:
    def fetch(method: str, asked: str, body: bytes | None) -> Reply:
        reply = ci_site(method, asked, body)
        return change(reply) if asked == path else reply

    assert failures(smoke.run(fetch, CI)) == broken


def test_a_combined_robots_header_still_counts_as_noindex(make_client: Callable[..., TestClient], dist: Path) -> None:
    """Review finding (CodeRabbit, PR #5): "noindex, nofollow" was read as indexable."""
    live = client_fetch(make_client(with_ai=True, web_dist=dist, environment="production"))
    ci = client_fetch(make_client(with_ai=False, web_dist=dist, environment="ci"))

    def with_header(site: Fetch, value: str) -> Fetch:
        def fetch(method: str, path: str, body: bytes | None) -> Reply:
            reply = site(method, path, body)
            return replace(reply, headers={**reply.headers, "x-robots-tag": value}) if path == "/" else reply

        return fetch

    for value in ("NoIndex, nofollow", "googlebot: noindex", "none", "otherbot: nofollow, noindex"):
        assert failures(smoke.run(with_header(live, value), LIVE)) == {"headers"}, value
    # Control: outside production the same combined value is what is wanted.
    assert failures(smoke.run(with_header(ci, "noindex, nofollow"), CI)) == set()

    # Review findings (CodeRabbit, PR #7). A rule for one crawler does not keep the others out, so outside
    # production only an unscoped noindex will do; and "max-image-preview: none" is about image previews,
    # not indexing, so production may send it.
    for value in ("googlebot: noindex", "googlebot: none", "nofollow", "max-image-preview: none"):
        assert failures(smoke.run(with_header(ci, value), CI)) == {"headers"}, value
    for value in ("max-image-preview: none", "max-snippet: 20, max-image-preview: large", "googlebot: max-snippet: 5"):
        assert failures(smoke.run(with_header(live, value), LIVE)) == set(), value


@pytest.mark.parametrize(
    ("header", "directives"),
    [
        ("noindex, nofollow", {("", "noindex"), ("", "nofollow")}),
        ("GoogleBot: NoIndex", {("googlebot", "noindex")}),
        ("otherbot: noindex, nofollow", {("otherbot", "noindex"), ("otherbot", "nofollow")}),
        ("max-image-preview: none", {("", "max-image-preview")}),
        ("googlebot: max-snippet: 20, none", {("googlebot", "max-snippet"), ("googlebot", "none")}),
        ("unavailable_after: 2026-12-31, noindex", {("", "unavailable_after"), ("", "noindex")}),
        ("", set()),
    ],
)
def test_robots_directives_keep_their_crawler_and_their_parameters_apart(
    header: str, directives: set[tuple[str, str]]
) -> None:
    assert smoke.robots_directives(header) == directives


def test_analyze_is_never_asked_of_a_site_whose_health_says_ai_is_on(
    make_client: Callable[..., TestClient], dist: Path
) -> None:
    """Review finding (CodeRabbit, PR #5): with --ai off against a site that has a key, the check posted a
    build to /api/analyze and paid for one analysis. It must ask only a site that says AI is off."""
    site = client_fetch(make_client(with_ai=True, web_dist=dist, environment="ci"))
    posts: list[str] = []

    def fetch(method: str, path: str, body: bytes | None) -> Reply:
        if method == "POST":
            posts.append(path)
        return site(method, path, body)

    results = dict(smoke.run(fetch, CI))
    assert posts == []
    assert results["health"] is not None
    assert results["analyze is off"] == "not sent: /api/health does not say AI is off (ai is True)"


def test_a_site_that_does_not_answer_fails_every_check_without_crashing() -> None:
    def down(method: str, path: str, body: bytes | None) -> Reply:
        raise ConnectionRefusedError("nothing is listening")

    results = smoke.run(down, CI)
    assert len(results) == 13
    assert all(error is not None and "ConnectionRefusedError" in error for _, error in results)


# ---------------------------------------------------------------- the command line


def test_the_command_reports_each_check_and_exits_by_the_result(
    ci_site: Fetch, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setattr(smoke, "use_system_certificates", lambda: None)
    monkeypatch.setattr(smoke, "http_fetch", lambda base, timeout=20.0: ci_site)
    assert smoke.main(["http://site", "--ai", "off"]) == 0
    out = capsys.readouterr().out
    assert "ok    sprite sheets" in out and out.rstrip().endswith("13 of 13 checks passed against http://site")

    def broken(method: str, path: str, body: bytes | None) -> Reply:
        reply = ci_site(method, path, body)
        return replace(reply, status=500) if path == "/api/health" else reply

    monkeypatch.setattr(smoke, "http_fetch", lambda base, timeout=20.0: broken)
    assert smoke.main(["http://site", "--ai", "off"]) == 1
    out = capsys.readouterr().out
    # The headers check reads /api/health too, and the analyze check will not ask without it.
    assert "FAIL  health: /api/health answered 500, expected 200" in out and "10 of 13 checks passed" in out


def test_the_command_refuses_an_address_that_is_not_http() -> None:
    with pytest.raises(SystemExit) as refused:
        smoke.main(["file:///etc/passwd"])
    assert refused.value.code == 2


def test_system_certificates_are_used_where_truststore_is_installed(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []
    fake = types.ModuleType("truststore")
    fake.inject_into_ssl = lambda: calls.append("injected")  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "truststore", fake)
    smoke.use_system_certificates()
    assert calls == ["injected"]
    # And where it is not, nothing breaks.
    monkeypatch.setitem(sys.modules, "truststore", None)
    smoke.use_system_certificates()
    assert calls == ["injected"]


# ---------------------------------------------------------------- over a real socket


class Handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        found = self.path == "/ok"
        self.send_response(200 if found else 404)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("X-Test", "yes")
        self.end_headers()
        self.wfile.write(b"fine" if found else b"gone")

    def do_POST(self) -> None:
        sent = self.rfile.read(int(self.headers["Content-Length"]))
        self.send_response(503)
        self.send_header("Content-Type", self.headers["Content-Type"])
        self.end_headers()
        self.wfile.write(sent)

    def log_message(self, *args: object) -> None:
        pass


@pytest.fixture
def server() -> Iterator[str]:
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{httpd.server_address[1]}/"
    httpd.shutdown()
    httpd.server_close()


def test_http_fetch_returns_errors_as_replies(server: str) -> None:
    fetch = smoke.http_fetch(server, timeout=5)
    ok = fetch("GET", "/ok", None)
    assert (ok.status, ok.type, ok.text, ok.headers["x-test"]) == (200, "text/plain", "fine", "yes")
    missing = fetch("GET", "/missing", None)
    assert (missing.status, missing.text) == (404, "gone")
    posted = fetch("POST", "/api/analyze", b'{"items": [1]}')
    assert (posted.status, posted.type, posted.body) == (503, "application/json", b'{"items": [1]}')
