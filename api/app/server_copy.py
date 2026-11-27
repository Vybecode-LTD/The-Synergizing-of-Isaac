"""Real HTML for crawlers: the words of each page, its head tags, its JSON-LD, and the site-wide files.

AI crawlers do not run JavaScript, so the single-page app's empty shell tells them nothing. The API writes a
plain copy of each public page into the shell; React replaces it on its first render. Both read the same
data and the same templates (data/content/), so they describe the same thing.
"""

from __future__ import annotations

import json
import math
from html import escape
from typing import Any

from .gamedata import GameData, Synergy
from .pages import Page, all_paths, fill, site_values

RATING_MEANING = {
    "S": "run-defining",
    "A": "strong",
    "B": "good",
    "C": "minor",
    "D": "avoid: these work against each other",
}
STAT_LABELS = {
    "damage": "Damage",
    "damageMult": "Damage",
    "tears": "Tears",
    "tearsMult": "Tears",
    "range": "Range",
    "speed": "Speed",
    "shotSpeed": "Shot speed",
    "luck": "Luck",
    "redHearts": "Red hearts",
    "soulHearts": "Soul hearts",
    "blackHearts": "Black hearts",
    "boneHearts": "Bone hearts",
}
AI_CRAWLERS = ("GPTBot", "ChatGPT-User", "PerplexityBot", "Google-Extended", "ClaudeBot", "anthropic-ai")


def _a(href: str, text: str) -> str:
    return f'<a href="{escape(href, quote=True)}">{escape(text)}</a>'


def _trim(value: float) -> str:
    """Two decimal places at most, halves rounded up: what trim() in web/src/engine/summary.ts prints."""
    return f"{math.floor(value * 100 + 0.5) / 100:g}"


def _stat(key: str, value: float) -> str:
    if key.endswith("Mult"):
        return f"{STAT_LABELS[key]} \N{MULTIPLICATION SIGN}{_trim(value)}"
    sign = "+" if value > 0 else "\N{MINUS SIGN}"
    return f"{STAT_LABELS[key]} {sign}{_trim(abs(value))}"


def _builder_href(s: Synergy) -> str:
    parts = []
    if len(s.character_slugs) == 1:
        parts.append(f"c={s.character_slugs[0]}")
    if s.item_ids:
        parts.append("i=" + ".".join(str(i) for i in s.item_ids))
    if s.trinket_ids:
        parts.append("t=" + ".".join(str(t) for t in s.trinket_ids))
    return "/?" + "&".join(parts)


def _synergy(data: GameData, s: Synergy) -> str:
    pieces = [_a(f"/items/{data.item_by_id[i]['slug']}", data.item_by_id[i]["name"]) for i in s.item_ids]
    pieces += [_a(f"/trinkets/{data.trinket_by_id[t]['slug']}", data.trinket_by_id[t]["name"]) for t in s.trinket_ids]
    out = [f"<h3>{' + '.join(pieces)}</h3>"]
    if s.character_slugs:
        who = [_a(f"/characters/{c}", data.character_by_slug[c]["name"]) for c in s.character_slugs]
        out.append(f"<p>as {', '.join(who)}</p>")
    tier = f"{escape(s.rating)} tier, {escape(RATING_MEANING[s.rating])}."
    out.append(f"<p>{tier} Sent in by a visitor and approved.</p>" if s.community else f"<p>{tier}</p>")
    out.append(f"<p>{escape(s.description)}</p>")
    out.append(f"<p>{_a(_builder_href(s), 'Open in builder')}</p>")
    return "<article>" + "".join(out) + "</article>"


def _synergy_section(data: GameData, page: Page, heading: str, synergies: list[Synergy]) -> str:
    return f"<h2>{escape(heading)}</h2><p>{escape(page.answer)}</p>" + "".join(_synergy(data, s) for s in synergies)


def _count_heading(count: int, tail: str, none: str) -> str:
    return none if count == 0 else f"{count} {'synergy' if count == 1 else 'synergies'} {tail}"


def _segments(segments: list[Any], values: dict[str, Any]) -> str:
    out = []
    for segment in segments:
        if isinstance(segment, str):
            out.append(escape(fill(segment, values)))
        else:
            out.append(_a(segment["href"], fill(segment["text"], values)))
    return "".join(out)


def render_copy(page: Page, data: GameData, domain: str) -> str:
    """The page's own words as plain semantic HTML. Everything from the data is escaped."""
    values = site_values(data, domain)
    pages = data.content["pages"]
    out = [f"<h1>{escape(page.h1)}</h1>"]
    if page.lede:
        out.append(f"<p>{escape(page.lede)}</p>")

    if page.kind == "home":
        intro = pages["intro"]
        out.append(f"<h2>{escape(fill(intro['heading'], values))}</h2><p>{escape(fill(intro['text'], values))}</p>")
        copy = pages["copy"]
        out.append(f"<h2>{escape(copy['examplesHeading'])}</h2><p>{escape(copy['examplesLede'])}</p><ul>")
        examples = [
            s
            for s in data.synergies
            if s.rating == "S" and len(s.item_ids) == 2 and not s.trinket_ids and not s.character_slugs
        ][:4]
        out += [f"<li>{_a(_builder_href(s), ' + '.join(data.piece_names(s)))}</li>" for s in examples]
        out.append("</ul><ul>")
        for href, text in (
            ("/items", "All items"),
            ("/trinkets", "All trinkets"),
            ("/characters", "All characters"),
            ("/synergies", fill(copy["browseAll"], values)),
            ("/about", "About, sources and credits"),
        ):
            out.append(f"<li>{_a(href, text)}</li>")
        out.append("</ul>")

    elif page.kind in ("items", "trinkets"):
        records = data.items if page.kind == "items" else data.trinkets
        out.append(f"<p>{len(records)} {page.kind}</p>")
        out.append(
            "<ul>" + "".join(f"<li>{_a(f'/{page.kind}/{r["slug"]}', r['name'])}</li>" for r in records) + "</ul>"
        )

    elif page.kind == "characters":
        for title, tainted in (("Characters", False), ("Tainted", True)):
            out.append(f"<h2>{title}</h2><ul>")
            out += [
                f"<li>{_a(f'/characters/{c["slug"]}', c['name'])}</li>"
                for c in data.characters
                if c["tainted"] == tainted
            ]
            out.append("</ul>")

    elif page.kind in ("item", "trinket"):
        record = page.subject
        if page.kind == "item":
            kind = "Active item" if record["type"] == "active" else "Passive item"
            out.append(f"<p>Quality {record['quality']} of 4. {kind}. {escape(record['dlc'])}.</p>")
        else:
            out.append(f"<p>Trinket. {escape(record['dlc'])}.</p>")
        effect = record.get("effect") or pages["fallbacks"][f"{page.kind}Effect"] + "."
        out.append(f"<p>{escape(effect)}</p>")
        if record.get("stats"):
            out.append(
                "<ul>" + "".join(f"<li>{escape(_stat(k, v))}</li>" for k, v in record["stats"].items()) + "</ul>"
            )
        names = data.transformation_names(record)
        if names:
            out.append(f"<p>{escape(pages['copy']['countsToward'])}: {escape(names)}.</p>")
        key = record["id"]
        synergies = data.synergies_for(page.kind, key)
        heading = _count_heading(len(synergies), f"with {record['name']}", "No synergies written down yet")
        out.append(_synergy_section(data, page, heading, synergies))

    elif page.kind == "character":
        record = page.subject
        start = list(record.get("startingItems", []))
        if record.get("pocketActive") is not None:
            start.append(record["pocketActive"])
        if start:
            links = ", ".join(_a(f"/items/{data.item_by_id[i]['slug']}", data.item_by_id[i]["name"]) for i in start)
            out.append(f"<p>Starts with: {links}.</p>")
        else:
            out.append(f"<p>{escape(pages['copy']['noStartingItems'])}</p>")
        out.append(f"<p>{escape(pages['copy']['startingItemsNote'])}</p>")
        synergies = data.synergies_for("character", record["slug"])
        heading = _count_heading(
            len(synergies), f"only {record['name']} gets", "No character-only synergies written down yet"
        )
        out.append(_synergy_section(data, page, heading, synergies))

    elif page.kind == "synergies":
        ordered = sorted(data.synergies, key=lambda s: "SABCD".index(s.rating))
        out.append(f"<p>{len(ordered)} synergies</p>")
        out += [_synergy(data, s) for s in ordered]

    elif page.kind == "about":
        about = data.content["about"]
        out.append(f"<p>{escape(fill(about['lede'], values))}</p>")
        for section in about["sections"]:
            out.append(f"<h2>{escape(fill(section['heading'], values))}</h2>")
            for block in section["blocks"]:
                if "p" in block:
                    out.append(f"<p>{_segments(block['p'], values)}</p>")
                else:
                    out.append("<ul>" + "".join(f"<li>{_segments(li, values)}</li>" for li in block["ul"]) + "</ul>")

    elif page.kind == "admin":
        pass  # the heading and lede say what it is; the inbox itself needs the owner signed in

    else:  # notFound
        out.append(f"<p>{_a('/', 'Open the builder')}</p>")

    return "<main>" + "".join(out) + "</main>"


# ---------------------------------------------------------------- head


def _breadcrumbs(page: Page, site_url: str) -> dict[str, Any] | None:
    labels = {
        "items": "Items",
        "trinkets": "Trinkets",
        "characters": "Characters",
        "synergies": "Synergies",
        "about": "About",
    }
    parts = page.path.strip("/").split("/")
    if not page.indexable or page.kind == "home":
        return None
    trail = [("Builder", "/")]
    trail.append((labels[parts[0]], f"/{parts[0]}"))
    if len(parts) == 2:
        trail.append((page.h1, page.path))
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": n, "name": name, "item": site_url + path}
            for n, (name, path) in enumerate(trail, start=1)
        ],
    }


def structured_data(page: Page, data: GameData, site_url: str, domain: str) -> list[dict[str, Any]]:
    """JSON-LD for the page. It describes only what the page shows."""
    if not page.indexable:
        return []
    site = {"@type": "WebSite", "name": domain, "url": site_url + "/"}
    url = site_url + page.path
    out: list[dict[str, Any]] = []
    if page.kind == "home":
        out.append({"@context": "https://schema.org", **site, "description": page.description})
        out.append(
            {
                "@context": "https://schema.org",
                "@type": "WebApplication",
                "name": f"{domain} synergy builder",
                "url": url,
                "description": page.description,
                "applicationCategory": "GameApplication",
                "operatingSystem": "Any",
                "isAccessibleForFree": True,
                "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
            }
        )
    else:
        webpage: dict[str, Any] = {
            "@context": "https://schema.org",
            "@type": "AboutPage" if page.kind == "about" else "WebPage",
            "name": page.title,
            "description": page.description,
            "url": url,
            "dateModified": data.meta["updated"],
            "isPartOf": site,
        }
        if page.subject is not None:
            webpage["about"] = {"@type": "Thing", "name": page.subject["name"]}
        out.append(webpage)
    crumbs = _breadcrumbs(page, site_url)
    if crumbs:
        out.append(crumbs)
    return out


def render_head(page: Page, data: GameData, site_url: str, domain: str) -> str:
    def meta(attr: str, key: str, content: str) -> str:
        return f'<meta {attr}="{key}" content="{escape(content, quote=True)}" />'

    url = site_url + page.path
    tags = [
        f"<title>{escape(page.title)}</title>",
        meta("name", "description", page.description),
        meta("property", "og:title", page.title),
        meta("property", "og:description", page.description),
        meta("property", "og:type", "website"),
        meta("property", "og:site_name", domain),
        meta("property", "og:image", site_url + "/og.png"),
        meta("name", "twitter:card", "summary_large_image"),
    ]
    if page.indexable:
        tags.append(f'<link rel="canonical" href="{escape(url, quote=True)}" />')
        tags.append(meta("property", "og:url", url))
    else:
        tags.append(meta("name", "robots", "noindex"))
    for block in structured_data(page, data, site_url, domain):
        # "</" cannot appear inside a script element, even in data.
        body = json.dumps(block, ensure_ascii=False).replace("</", "<\\/")
        tags.append(f'<script type="application/ld+json">{body}</script>')
    return "\n    ".join(tags)


# ---------------------------------------------------------------- site-wide files


def sitemap_xml(data: GameData, site_url: str) -> str:
    updated = data.meta["updated"]
    urls = "".join(
        f"<url><loc>{escape(site_url + path)}</loc><lastmod>{updated}</lastmod></url>" for path in all_paths(data)
    )
    return f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>'


def robots_txt(site_url: str, indexable: bool) -> str:
    if not indexable:
        return "User-agent: *\nDisallow: /\n"
    lines = ["User-agent: *", "Allow: /", "Disallow: /api/", ""]
    for bot in AI_CRAWLERS:
        lines += [f"User-agent: {bot}", "Allow: /", "Disallow: /api/", ""]
    lines.append(f"Sitemap: {site_url}/sitemap.xml")
    return "\n".join(lines) + "\n"


def llms_txt(data: GameData, site_url: str, domain: str) -> str:
    values = site_values(data, domain)
    intro = fill(data.content["pages"]["intro"]["text"], values)
    top = [s for s in data.synergies if s.rating == "S"][:12]
    lines = [
        f"# {domain}",
        "",
        f"> {intro} Unofficial fan project; data last updated {values['updated']}.",
        "",
        "## Pages",
        f"- [Synergy builder]({site_url}/): build a loadout and see which synergies apply",
        f"- [All synergies]({site_url}/synergies): the full rated list",
        f"- [All items]({site_url}/items): every item, with one page each at /items/<slug>",
        f"- [All trinkets]({site_url}/trinkets): every trinket, with one page each at /trinkets/<slug>",
        f"- [All characters]({site_url}/characters): starting items and character-only synergies",
        f"- [About]({site_url}/about): data sources, how ratings and the AI analysis work",
        "",
        "## Strongest synergies",
    ]
    lines += [f"- [{' + '.join(data.piece_names(s))}]({site_url}{_builder_href(s)}): {s.description}" for s in top]
    return "\n".join(lines) + "\n"
