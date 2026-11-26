---
feature: transformations-repentance
status: approved
approved: 2026-11-25 (the owner chose "Repentance, flag the + difference"; decision 0006)
plan: this contract
pr: "#6"
---

# Contract: transformations counted as Repentance counts them

## 1. Goal
The builder and every item and trinket page count transformations the way Repentance does, from the wiki's
Repentance lists, and mark what counts only in Repentance+. Trinkets count where the game counts them.

## 2. Interfaces
- `data/transformations.json` (hand-edited, sourced): `{ "source", "checked", "transformations": [T] }`,
  `T = { id, name, needs, page, revision, items: int[], trinkets: int[], plusItems: int[], plusTrinkets: int[], note?: string }`.
  `items`/`trinkets` count in Repentance; `plus*` count only in Repentance+. A transformation with only
  `plus*` members exists only in Repentance+ (Necromancer).
- Generated: each item and trinket record gets `transformations: string[]` (Repentance) and
  `transformationsPlus: string[]` (Repentance+ only), each omitted when empty. The tracker's flags are no
  longer read.
- Web `web/src/engine/summary.ts`: `transformationProgress(entries: readonly (Item | Trinket)[]): TransformationProgress[]`
  with `{ id, name, count, plus, needs, done, doneInPlus, plusOnly, note? }`, closest first.
  `transformationNames(record): string` → "Conjoined, Seraphim (Repentance+ only)".
- API `api/app/gamedata.py`: `GameData.transformations` (the list) and `GameData.transformation_names(record) -> str`,
  same words as the web. Both read the label from `data/content/pages.json`.

## 3. Data
No database change. `data/items.json` and `data/trinkets.json` gain `transformationsPlus`; `validate`
checks every id exists, no id is in both lists of one transformation, `needs` > 0 and ids are unique.

## 4. Files
`data/transformations.json` (new), `scripts/gamedata.py`, `data/items.json`, `data/trinkets.json`,
`data/content/pages.json`, `data/content/about.json`, `data/README.md`, `data/tests/parity.json`;
`api/app/gamedata.py`, `api/app/server_copy.py`, `api/app/parity.py`; `web/src/engine/{data,types,summary}.ts`,
`web/src/components/builder/BuildSummary.tsx`, `web/src/pages/ItemPages.tsx`; tests beside each;
`docs/decisions/0006-transformations-follow-repentance.md`.

## 5. Conventions this follows
`CLAUDE.md` rules 1 to 4 (one home for data, a source for every fact, browser equals server, tokens only).
The synergy check's reading of the wiki's version marks: `data/synergy-checks.md`.

## 6. Non-goals
- No pills (Adult, and Stompy's pill): the builder has none. Stompy's note says pills count too.
- No item renames, though some tracker names are older than Repentance's ("1UP", "Number two").
- No duplicate counting: the builder holds one of each pickup.

## 7. Acceptance
- `python scripts/gamedata.py validate` clean; the validator's positive control reports a broken
  transformation file.
- Web `summary.test.ts`: Infestation adds to Repentance+ only; Kid's Drawing counts for Guppy; Skatole counts
  for Oh Crap; Necromancer shows as Repentance+ only; Guardian Angel does not count toward Seraphim (it
  still counts toward Conjoined).
- Both sides print the same "Counts toward" line, checked through `data/tests/parity.json`.
- Live: `/items/infestation` says "Beelzebub (Repentance+ only)" after the deploy.

## 8. Open questions
None.
