"""Community synergies: submissions the owner approved, live on the site at once (decision 0008).

The curated list in data/ is still the base; community synergies are layered on top of it from the
database. Every page the server sends carries them inline (`inline_tag`), so the browser builds the same
list the server rendered from, with no extra request, and both sides count and title pages the same.

They never reach the model: the AI prompt is built from the curated data alone (analysis.build_prompt).
"""

from __future__ import annotations

import json
from typing import Any

from .gamedata import GameData, Synergy
from .store import Store

ELEMENT_ID = "community-synergies"


def slug_id(data: GameData, items: list[int], trinkets: list[int], characters: list[str], taken: set[str]) -> str:
    """The id scripts/gamedata.py gives an entry (item slugs, then t- trinkets, then c- characters), made
    unique against `taken` with ~2, ~3… as the curated file does. The id is added to `taken`."""
    parts = sorted(data.item_by_id[i]["slug"] for i in items)
    parts += sorted("t-" + data.trinket_by_id[t]["slug"] for t in trinkets)
    parts += sorted("c-" + c for c in characters)
    base = "+".join(parts)
    entry_id, n = base, 1
    while entry_id in taken:
        n += 1
        entry_id = f"{base}~{n}"
    taken.add(entry_id)
    return entry_id


class Community:
    def __init__(self, data: GameData, store: Store) -> None:
        self._data = data
        self._store = store
        self._curated = {s.combo for s in data.synergies}
        self._cached: tuple[int, GameData, list[Synergy]] | None = None
        # A deploy that folded community synergies into data/ retires their database copies.
        store.settle(self._curated)

    def _build(self) -> tuple[GameData, list[Synergy]]:
        revision = self._store.revision
        if self._cached is None or self._cached[0] != revision:
            live = []
            shown: set[str] = set()
            for row in self._store.community():
                synergy = Synergy(
                    id=f"community-{row['id']}",
                    item_ids=tuple(i for i in row["itemIds"] if i in self._data.item_by_id),
                    trinket_ids=tuple(t for t in row["trinketIds"] if t in self._data.trinket_by_id),
                    character_slugs=tuple(c for c in row["characterSlugs"] if c in self._data.character_by_slug),
                    rating=row["rating"],
                    description=row["description"],
                    community=True,
                )
                # A combination is shown once: from the curated list if it has it, else the oldest approved.
                # (The inbox lets only one be live; this holds for rows published any other way too.)
                if (synergy.item_ids or synergy.trinket_ids) and synergy.combo not in self._curated | shown:
                    shown.add(synergy.combo)
                    live.append(synergy)
            self._cached = (revision, self._data.with_community(live), live)
        return self._cached[1], self._cached[2]

    def view(self) -> GameData:
        """The data every page is rendered from: curated, then community."""
        return self._build()[0]

    def synergies(self) -> list[Synergy]:
        return self._build()[1]

    def inline_tag(self) -> str:
        """The live list as a JSON data block for the page's head. Never executed, so the CSP allows it."""
        rows = [
            {
                "id": s.id,
                "itemIds": list(s.item_ids),
                "trinketIds": list(s.trinket_ids),
                "characterSlugs": list(s.character_slugs),
                "rating": s.rating,
                "description": s.description,
            }
            for s in self.synergies()
        ]
        # "<" escaped, so no text can close the element or open a comment inside it.
        body = json.dumps(rows, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
        return f'<script type="application/json" id="{ELEMENT_ID}">{body}</script>'

    def entries(self) -> list[dict[str, Any]]:
        """The live list as data/synergies.json entries (names, slug ids): the public backup's format, ready
        for scripts/gamedata.py add-submissions."""
        d = self._data
        taken = {s.id for s in d.synergies}
        return [
            {
                "id": slug_id(d, list(s.item_ids), list(s.trinket_ids), list(s.character_slugs), taken),
                "items": [d.item_by_id[i]["name"] for i in s.item_ids],
                "trinkets": [d.trinket_by_id[t]["name"] for t in s.trinket_ids],
                "characters": [d.character_by_slug[c]["name"] for c in s.character_slugs],
                "rating": s.rating,
                "description": s.description,
            }
            for s in self.synergies()
        ]
