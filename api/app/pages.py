"""What each public page is called and says about itself.

Fills the templates in data/content/pages.json. web/src/seo.ts does the same in the browser; both are
checked against data/tests/parity.json.
"""

from __future__ import annotations

import datetime
import re
from dataclasses import dataclass
from typing import Any

from .gamedata import GameData

GAME = "The Binding of Isaac: Repentance"
TITLE_LIMIT = 60
DESCRIPTION_LIMIT = 160


def fill(template: str, values: dict[str, Any]) -> str:
    return re.sub(r"\{(\w+)\}", lambda m: str(values.get(m.group(1), m.group(0))), template)


def fit_title(titles: list[str], values: dict[str, Any]) -> str:
    """The first title that fits the limit, or the last (shortest) one."""
    filled = [fill(t, values) for t in titles]
    return next((t for t in filled if len(t) <= TITLE_LIMIT), filled[-1])


def clamp(text: str, limit: int = DESCRIPTION_LIMIT) -> str:
    """Cut at a word boundary and mark the cut."""
    if len(text) <= limit:
        return text
    cut = text[: limit - 1]
    if " " in cut:
        cut = cut[: cut.rindex(" ")]
    return cut.rstrip(" ,;:.") + "\N{HORIZONTAL ELLIPSIS}"


def join_names(names: list[str]) -> str:
    if len(names) <= 1:
        return "".join(names)
    return ", ".join(names[:-1]) + " and " + names[-1]


def long_date(iso: str) -> str:
    d = datetime.date.fromisoformat(iso)
    return f"{d.day} {d:%B} {d.year}"


@dataclass(frozen=True)
class Page:
    kind: str  # home | items | item | trinkets | trinket | characters | character | synergies | about | notFound
    path: str
    title: str
    description: str
    h1: str
    lede: str
    answer: str = ""
    subject: Any = None  # the item, trinket or character record

    @property
    def found(self) -> bool:
        return self.kind != "notFound"


def site_values(data: GameData, domain: str) -> dict[str, Any]:
    return {
        "domain": domain,
        "game": GAME,
        "items": len(data.items),
        "trinkets": len(data.trinkets),
        "characters": len(data.characters),
        "synergies": len(data.synergies),
        "updated": long_date(data.meta["updated"]),
    }


def _subject_values(data: GameData, kind: str, record: dict[str, Any]) -> dict[str, Any]:
    key = record["slug"] if kind == "character" else record["id"]
    count = len(data.synergies_for(kind, key))
    top = data.top_partners(kind, key)
    fallbacks = data.content["pages"]["fallbacks"]
    effect = (record.get("effect") or "").rstrip(".") or fallbacks.get(f"{kind}Effect", "")
    return {
        "name": record["name"],
        "effect": effect,
        "quality": record.get("quality", ""),
        "n": count,
        "synergyWord": "synergy" if count == 1 else "synergies",
        "isAre": "is" if len(top) == 1 else "are",
        "top": join_names(top),
    }


def _page(data: GameData, domain: str, kind: str, path: str, record: dict[str, Any] | None = None) -> Page:
    template = data.content["pages"][kind]
    values = site_values(data, domain)
    answer = ""
    if record is not None:
        values.update(_subject_values(data, kind, record))
        answer = fill(template["answer"] if values["n"] else template["answerNone"], values)
    return Page(
        kind=kind,
        path=path,
        title=fit_title(template["titles"], values),
        description=clamp(fill(template["description"], values)),
        h1=fill(template["h1"], values),
        lede=fill(template["lede"], values),
        answer=answer,
        subject=record,
    )


LISTS = {
    "/items": "items",
    "/trinkets": "trinkets",
    "/characters": "characters",
    "/synergies": "synergies",
    "/about": "about",
}
DETAILS = {"items": "item", "trinkets": "trinket", "characters": "character"}


def describe(path: str, data: GameData, domain: str) -> Page:
    """The page at a path. An address the site does not have gets the notFound page, never a guess."""
    clean = path.rstrip("/") or "/"
    if clean == "/":
        return _page(data, domain, "home", "/")
    if clean in LISTS:
        return _page(data, domain, LISTS[clean], clean)
    parts = clean.strip("/").split("/")
    if len(parts) == 2 and parts[0] in DETAILS:
        kind = DETAILS[parts[0]]
        table = {"item": data.item_by_slug, "trinket": data.trinket_by_slug, "character": data.character_by_slug}[kind]
        record = table.get(parts[1])
        if record is not None:
            return _page(data, domain, kind, clean, record)
    return _page(data, domain, "notFound", clean)


def all_paths(data: GameData) -> list[str]:
    """Every public URL, for the sitemap."""
    return (
        ["/", "/items", "/trinkets", "/characters", "/synergies", "/about"]
        + [f"/items/{i['slug']}" for i in data.items]
        + [f"/trinkets/{t['slug']}" for t in data.trinkets]
        + [f"/characters/{c['slug']}" for c in data.characters]
    )
