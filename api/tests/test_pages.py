from __future__ import annotations

import errno
import json
import re
import xml.etree.ElementTree as ET
from collections.abc import Callable
from html import escape
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.gamedata import GameData
from app.pages import all_paths

ROUTES = [
    "/",
    "/items",
    "/items/brimstone",
    "/items/less-than-three",
    "/trinkets",
    "/trinkets/cancer",
    "/characters",
    "/characters/lilith",
    "/synergies",
    "/about",
]


def tag(html: str, name: str) -> list[str]:
    return re.findall(rf"<{name}[^>]*>(.*?)</{name}>", html, flags=re.S)


@pytest.mark.parametrize("path", ROUTES)
def test_every_public_page_is_complete_without_javascript(client: TestClient, path: str) -> None:
    r = client.get(path)
    assert r.status_code == 200
    html = r.text
    assert len(tag(html, "h1")) == 1, "exactly one h1"
    title = tag(html, "title")
    assert len(title) == 1 and 10 <= len(title[0]) <= 60 + title[0].count("&") * 5
    description = re.search(r'<meta name="description" content="([^"]*)"', html)
    assert description and 50 <= len(description.group(1)) <= 160 + description.group(1).count("&") * 5
    canonical = re.search(r'<link rel="canonical" href="([^"]*)"', html)
    assert canonical and canonical.group(1) == f"https://isaac.toys{path}"
    assert '<meta property="og:image" content="https://isaac.toys/og.png"' in html
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, flags=re.S)
    assert blocks, "has JSON-LD"
    for block in blocks:
        parsed = json.loads(block.replace("<\\/", "</"))
        assert parsed["@context"] == "https://schema.org" and parsed["@type"]
    # The copy sits inside the element React mounts into, and carries no script of its own.
    root = html.split('<div id="root">', 1)[1]
    assert "<h1>" in root and "<script" not in root.split("</main>", 1)[0]


def test_an_item_page_carries_the_same_words_the_app_shows(client: TestClient, data: GameData) -> None:
    html = client.get("/items/brimstone").text
    brimstone = data.item_by_slug["brimstone"]
    synergies = data.synergies_for("item", brimstone["id"])
    assert len(synergies) == 64
    assert "<h2>64 synergies with Brimstone</h2>" in html
    assert "Tears become blood laser, hits 9 times" in html
    assert "The strongest are with Azazel, Crown of Light and Epic Fetus." in html
    for s in synergies:
        assert escape(s.description) in html
    assert html.count("<article>") == 64
    assert '<a href="/?i=118.38">Open in builder</a>' in html


def test_text_from_the_data_is_escaped(client: TestClient) -> None:
    html = client.get("/items/less-than-three").text
    assert "<h1>&lt;3</h1>" in html
    assert "<h1><3</h1>" not in html
    assert "<title>&lt;3 Synergies" in html


def test_json_ld_cannot_close_its_script_tag(client: TestClient) -> None:
    html = client.get("/items/less-than-three").text
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, flags=re.S):
        assert "</" not in block


@pytest.mark.parametrize("path", ["/items/not-a-real-item", "/nowhere", "/items/brimstone/extra", "/characters/"])
def test_an_address_the_site_does_not_have_is_a_real_404(client: TestClient, path: str) -> None:
    r = client.get(path)
    if path == "/characters/":
        assert r.status_code == 200  # a trailing slash on a real page is still that page
        return
    assert r.status_code == 404
    assert "<h1>This room is empty</h1>" in r.text
    assert '<meta name="robots" content="noindex"' in r.text
    assert 'rel="canonical"' not in r.text


def test_missing_files_and_endpoints_do_not_get_a_page(client: TestClient) -> None:
    missing = client.get("/assets/nope.js")
    assert missing.status_code == 404 and "<html" not in missing.text
    api = client.get("/api/nope")
    assert api.status_code == 404 and api.json()["detail"]["code"] == "not_found"
    assert client.post("/api/nope").status_code == 404


def test_sitemap_lists_every_public_page(client: TestClient, data: GameData) -> None:
    r = client.get("/sitemap.xml")
    assert r.status_code == 200 and r.headers["content-type"].startswith("application/xml")
    root = ET.fromstring(r.text)
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = [e.text for e in root.findall("s:url/s:loc", ns)]
    assert len(locs) == 6 + 719 + 188 + 34 == len(all_paths(data))
    assert "https://isaac.toys/items/brimstone" in locs and "https://isaac.toys/" in locs
    assert all(e.text == data.meta["updated"] for e in root.findall("s:url/s:lastmod", ns))
    # Every listed page really answers.
    for loc in ("https://isaac.toys/trinkets/cancer", "https://isaac.toys/characters/tainted-jacob"):
        assert client.get(loc.removeprefix("https://isaac.toys")).status_code == 200


def test_robots_allows_ai_crawlers_in_production(client: TestClient) -> None:
    r = client.get("/robots.txt")
    for bot in ("GPTBot", "ChatGPT-User", "PerplexityBot", "Google-Extended", "ClaudeBot", "anthropic-ai"):
        assert f"User-agent: {bot}\nAllow: /" in r.text
    assert "Sitemap: https://isaac.toys/sitemap.xml" in r.text
    assert "x-robots-tag" not in r.headers


def test_everything_but_production_is_kept_out_of_search(make_client: Callable[..., TestClient]) -> None:
    staging = make_client(environment="staging")
    assert staging.get("/robots.txt").text == "User-agent: *\nDisallow: /\n"
    assert staging.get("/").headers["x-robots-tag"] == "noindex"
    assert staging.get("/api/health").headers["x-robots-tag"] == "noindex"


def test_llms_txt_summarises_the_site(client: TestClient) -> None:
    text = client.get("/llms.txt").text
    assert text.startswith("# isaac.toys\n\n> isaac.toys checks your character, items and trinkets against 458")
    assert "- [All items](https://isaac.toys/items)" in text
    assert "## Strongest synergies" in text


def test_security_headers_are_on_every_answer(client: TestClient) -> None:
    for path in ("/", "/api/health", "/nowhere"):
        headers = client.get(path).headers
        assert "script-src 'self'" in headers["content-security-policy"]
        assert "frame-ancestors 'none'" in headers["content-security-policy"]
        assert headers["x-content-type-options"] == "nosniff"


def test_serves_the_built_app_and_nothing_outside_it(make_client: Callable[..., TestClient], tmp_path: Path) -> None:
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text(
        "<html><head><!--head-start--><title>old</title><!--head-end--></head>"
        '<body><div id="root"><!--server-copy--></div><script src="/assets/app.js"></script></body></html>',
        encoding="utf-8",
    )
    (dist / "assets" / "app.js").write_text("console.log(1)", encoding="utf-8")
    (dist / "favicon.svg").write_text("<svg/>", encoding="utf-8")
    (tmp_path / "secret.txt").write_text("do not serve", encoding="utf-8")
    client = make_client(web_dist=dist)

    page = client.get("/items/brimstone")
    assert "<title>old</title>" not in page.text and "<title>Brimstone Synergies" in page.text
    assert '<script src="/assets/app.js">' in page.text and page.headers["cache-control"] == "no-cache"

    asset = client.get("/assets/app.js")
    assert asset.text == "console.log(1)" and "immutable" in asset.headers["cache-control"]
    assert client.get("/favicon.svg").headers["cache-control"] == "public, max-age=3600"
    # index.html is only ever served through the page route, and nothing above dist is reachable.
    assert "<title>Page Not Found" in client.get("/index.html").text or client.get("/index.html").status_code == 404
    assert client.get("/%2e%2e/secret.txt").status_code == 404
    assert client.get("/assets/%2e%2e/%2e%2e/secret.txt").status_code == 404


def test_refuses_a_build_that_lost_its_markers(make_client: Callable[..., TestClient], tmp_path: Path) -> None:
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text("<html><head></head><body><div id='root'></div></body></html>", encoding="utf-8")
    with pytest.raises(RuntimeError, match="markers"):
        make_client(web_dist=dist)


# ---------------------------------------------------------------- second review (2026-11-24)


def test_an_address_the_file_system_cannot_hold_is_a_404_not_a_crash(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Review finding: a null byte in the address raised out of the file lookup and answered 500."""
    assert client.get("/%00").status_code == 404
    assert client.get("/a%00.png").status_code == 404
    assert client.get("/" + "a" * 300).status_code == 404

    # Python 3.12 on Linux (the image) raises "File name too long" from is_file(); Windows answers False.
    def too_long(self: Path) -> bool:
        raise OSError(errno.ENAMETOOLONG, "File name too long")

    monkeypatch.setattr(Path, "is_file", too_long)
    assert client.get("/whatever").status_code == 404


def test_stats_are_written_the_way_the_app_writes_them(client: TestClient) -> None:
    """Review finding: the server printed 0.231 where the app, rounding to two places, shows 0.23."""
    lung = client.get("/items/monstros-lung").text
    assert "<li>Tears \N{MULTIPLICATION SIGN}0.23</li>" in lung
    assert "0.231" not in lung
    # Controls: values that need no rounding are untouched.
    assert "<li>Tears \N{MULTIPLICATION SIGN}0.33</li>" in client.get("/items/brimstone").text
    assert "<li>Tears +1</li>" in client.get("/trinkets/cancer").text
