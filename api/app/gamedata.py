"""The game data and the synergy rules, server side.

The rules mirror web/src/engine/synergy.ts. `data/tests/parity.json` is produced from this module and
checked by both test suites, so the two cannot drift apart unnoticed.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

RATING_ORDER = {"S": 0, "A": 1, "B": 2, "C": 3, "D": 4}


@dataclass(frozen=True)
class Synergy:
    id: str
    item_ids: tuple[int, ...]
    trinket_ids: tuple[int, ...]
    character_slugs: tuple[str, ...]
    rating: str
    description: str

    @property
    def requirements(self) -> int:
        """Separate requirements. A list of alternative characters is one requirement."""
        return len(self.item_ids) + len(self.trinket_ids) + (1 if self.character_slugs else 0)


@dataclass(frozen=True)
class Build:
    character: str | None = None
    items: tuple[int, ...] = ()
    trinkets: tuple[int, ...] = ()


def _strength(s: Synergy) -> tuple[int, int, str]:
    return (RATING_ORDER[s.rating], -s.requirements, s.id)


@dataclass
class GameData:
    items: list[dict[str, Any]]
    trinkets: list[dict[str, Any]]
    characters: list[dict[str, Any]]
    synergies: list[Synergy]
    meta: dict[str, str]
    content: dict[str, Any]
    item_by_id: dict[int, dict[str, Any]] = field(default_factory=dict)
    item_by_slug: dict[str, dict[str, Any]] = field(default_factory=dict)
    trinket_by_id: dict[int, dict[str, Any]] = field(default_factory=dict)
    trinket_by_slug: dict[str, dict[str, Any]] = field(default_factory=dict)
    character_by_slug: dict[str, dict[str, Any]] = field(default_factory=dict)

    @classmethod
    def load(cls, path: Path) -> GameData:
        def read(name: str) -> Any:
            with (path / name).open(encoding="utf-8") as f:
                return json.load(f)

        items, trinkets, characters = read("items.json"), read("trinkets.json"), read("characters.json")
        item_by_name = {i["name"]: i["id"] for i in items}
        trinket_by_name = {t["name"]: t["id"] for t in trinkets}
        character_by_name = {c["name"]: c["slug"] for c in characters}
        synergies = [
            Synergy(
                id=r["id"],
                item_ids=tuple(item_by_name[n] for n in r["items"]),
                trinket_ids=tuple(trinket_by_name[n] for n in r["trinkets"]),
                character_slugs=tuple(character_by_name[n] for n in r["characters"]),
                rating=r["rating"],
                description=r["description"],
            )
            for r in read("synergies.json")
        ]
        return cls(
            items=items,
            trinkets=trinkets,
            characters=characters,
            synergies=synergies,
            meta=read("meta.json"),
            content={"about": read("content/about.json"), "pages": read("content/pages.json")},
            item_by_id={i["id"]: i for i in items},
            item_by_slug={i["slug"]: i for i in items},
            trinket_by_id={t["id"]: t for t in trinkets},
            trinket_by_slug={t["slug"]: t for t in trinkets},
            character_by_slug={c["slug"]: c for c in characters},
        )

    # ------------------------------------------------------------ rules

    def effective_items(self, build: Build) -> set[int]:
        """What the build really has: the picks plus what the character starts with."""
        owned = set(build.items)
        character = self.character_by_slug.get(build.character or "")
        if character:
            owned.update(character.get("startingItems", []))
            if character.get("pocketActive") is not None:
                owned.add(character["pocketActive"])
        return owned

    def _gap(self, s: Synergy, build: Build, items: set[int], trinkets: set[int]) -> tuple[list[int], list[int], bool]:
        missing_items = [i for i in s.item_ids if i not in items]
        missing_trinkets = [t for t in s.trinket_ids if t not in trinkets]
        character_ok = not s.character_slugs or (build.character is not None and build.character in s.character_slugs)
        return missing_items, missing_trinkets, character_ok

    def find_synergies(self, build: Build) -> list[Synergy]:
        items, trinkets = self.effective_items(build), set(build.trinkets)
        out = []
        for s in self.synergies:
            missing_items, missing_trinkets, character_ok = self._gap(s, build, items, trinkets)
            if not missing_items and not missing_trinkets and character_ok:
                out.append(s)
        return sorted(out, key=_strength)

    def awaiting_character(self, build: Build) -> list[Synergy]:
        if build.character is not None:
            return []
        items, trinkets = self.effective_items(build), set(build.trinkets)
        out = []
        for s in self.synergies:
            missing_items, missing_trinkets, _ = self._gap(s, build, items, trinkets)
            if s.character_slugs and not missing_items and not missing_trinkets:
                out.append(s)
        return sorted(out, key=_strength)

    def suggest_additions(self, build: Build) -> list[tuple[str, int, str, list[Synergy]]]:
        """(kind, id, best rating, completes), strongest first. See suggestAdditions in synergy.ts."""
        items, trinkets = self.effective_items(build), set(build.trinkets)
        found: dict[tuple[str, int], list[Synergy]] = {}
        for s in self.synergies:
            missing_items, missing_trinkets, character_ok = self._gap(s, build, items, trinkets)
            if not character_ok or len(missing_items) + len(missing_trinkets) != 1:
                continue
            held = len(s.item_ids) + len(s.trinket_ids) - 1
            if held == 0 and not s.character_slugs:
                continue
            key = ("item", missing_items[0]) if missing_items else ("trinket", missing_trinkets[0])
            found.setdefault(key, []).append(s)
        out = []
        for (kind, pickup), completes in found.items():
            completes.sort(key=_strength)
            best = min((c.rating for c in completes), key=RATING_ORDER.__getitem__)
            out.append((kind, pickup, best, completes))
        out.sort(key=lambda s: (RATING_ORDER[s[2]], -len(s[3]), s[1]))
        return out

    def synergies_for(self, kind: str, key: int | str) -> list[Synergy]:
        if kind == "item":
            out = [s for s in self.synergies if key in s.item_ids]
        elif kind == "trinket":
            out = [s for s in self.synergies if key in s.trinket_ids]
        else:
            out = [s for s in self.synergies if key in s.character_slugs]
        return sorted(out, key=_strength)

    # ------------------------------------------------------------ names

    def piece_names(self, s: Synergy) -> list[str]:
        return [self.item_by_id[i]["name"] for i in s.item_ids] + [self.trinket_by_id[t]["name"] for t in s.trinket_ids]

    def character_names(self, s: Synergy) -> list[str]:
        return [self.character_by_slug[c]["name"] for c in s.character_slugs]

    def top_partners(self, kind: str, key: int | str, limit: int = 3) -> list[str]:
        """Names of the other pieces in this subject's strongest synergies, without repeats."""
        own = (
            self.item_by_id[key]["name"]  # type: ignore[index]
            if kind == "item"
            else self.trinket_by_id[key]["name"]  # type: ignore[index]
            if kind == "trinket"
            else None
        )
        names: list[str] = []
        for s in self.synergies_for(kind, key):
            partners = [n for n in self.piece_names(s) if n != own]
            if kind != "character":
                partners += self.character_names(s)
            for name in partners:
                if name not in names:
                    names.append(name)
                if len(names) == limit:
                    return names
        return names
