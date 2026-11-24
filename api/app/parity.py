"""Writes data/tests/parity.json: what the server computes for a fixed set of pages and builds.

    python -m app.parity          # rewrite the snapshot
    python -m app.parity --check  # exit 1 if it is out of date

The web app's test suite computes the same things in TypeScript and compares them to this file, so the
browser and the server cannot disagree about a title, a description or which synergies a build has.
"""

from __future__ import annotations

import json
import sys
from typing import Any

from .gamedata import Build, GameData
from .pages import describe
from .settings import Settings

DOMAIN = "issac.toys"

PATHS = [
    "/",
    "/items",
    "/items/brimstone",
    "/items/the-sad-onion",
    "/items/odd-mushroom-thick",
    "/items/broken-shovel-second-piece",
    "/trinkets",
    "/trinkets/cancer",
    "/trinkets/swallowed-penny",
    "/characters",
    "/characters/azazel",
    "/characters/tainted-lost",
    "/synergies",
    "/about",
    "/items/no-such-item",
    "/nowhere/at/all",
]

BUILDS: list[dict[str, Any]] = [
    {"character": None, "items": [], "trinkets": []},
    {"character": None, "items": [118], "trinkets": []},
    {"character": None, "items": [118, 38], "trinkets": []},
    {"character": "azazel", "items": [118, 38, 68, 114], "trinkets": [39]},
    {"character": "lilith", "items": [247], "trinkets": []},
    {"character": None, "items": [619], "trinkets": []},
    {"character": "bethany", "items": [619], "trinkets": []},
    {"character": None, "items": [], "trinkets": [39]},
    {"character": "tainted-cain", "items": [114, 168, 52, 149, 169], "trinkets": [39, 1]},
]


def snapshot(data: GameData) -> dict[str, Any]:
    pages = []
    for path in PATHS:
        page = describe(path, data, DOMAIN)
        pages.append(
            {
                "path": path,
                "kind": page.kind,
                "title": page.title,
                "description": page.description,
                "h1": page.h1,
                "lede": page.lede,
                "answer": page.answer,
            }
        )
    builds = []
    for raw in BUILDS:
        build = Build(character=raw["character"], items=tuple(raw["items"]), trinkets=tuple(raw["trinkets"]))
        builds.append(
            {
                "build": raw,
                "matched": [s.id for s in data.find_synergies(build)],
                "awaitingCharacter": [s.id for s in data.awaiting_character(build)],
                "suggestions": [
                    {"kind": kind, "id": pickup, "best": best, "completes": [s.id for s in completes]}
                    for kind, pickup, best, completes in data.suggest_additions(build)
                ],
            }
        )
    return {"domain": DOMAIN, "pages": pages, "builds": builds}


def main() -> int:
    settings = Settings.from_env()
    target = settings.data_path / "tests" / "parity.json"
    text = json.dumps(snapshot(GameData.load(settings.data_path)), ensure_ascii=False, indent=1) + "\n"
    if "--check" in sys.argv:
        current = target.read_text(encoding="utf-8") if target.exists() else ""
        if current != text:
            print("data/tests/parity.json is out of date: run `python -m app.parity` in api/")
            return 1
        print("parity snapshot is current")
        return 0
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8", newline="\n")
    print(f"wrote {target}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
