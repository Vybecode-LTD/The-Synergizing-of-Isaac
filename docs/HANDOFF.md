# Handoff — 2026-11-25 (fifth session)

## Current state

- **isaac.toys** is a web app (builder with shareable links, "one pickup away", stat and transformation
  summary, a page per item, trinket and character, the synergy list, own synergies, an AI read inside daily
  caps). Decisions: `docs/decisions/0001` to `0005`. **Nothing is deployed**; no Railway project exists.
- `main` = `3dc5c13` (PRs #2 and #3 merged with the owner's yes on 2026-11-25).
- **PR #4, branch `data/check-abc-synergies`:** every A, B and C synergy checked against the wiki for
  Repentance. 381 entries: 148 confirmed, 194 corrected, 28 re-rated, 11 removed. With the S and D check,
  every entry has now been checked once; the list is 442. Record and method: `data/synergy-checks.md`.
  **Waiting for the owner's OK to merge.**
- **The desktop app is untouched.**

## What PR #4 changes

- `data/synergies.json` (the check), `data/synergy-checks.md` (a section and a 381-row table),
  `data/README.md`, the About page's sources line (`data/content/about.json`: "every one was checked"),
  `data/meta.json` (rebuilt: updated 2026-11-25), `data/tests/parity.json` (regenerated), `web/public/og.png`
  (redrawn: 442 synergies), and the count in four tests (two API, two web).
- The suspect entries from the last handoff were wrong: `technology+c-azazel` (the laser wraps the beam for
  1.5x; it does not fire while Azazel charges) and `brimstone+lord-of-the-pit+the-pact` (Leviathan counts a
  set list, not any devil item; Whore of Babylon is not on it).

## How the check ran

A script pulled every wiki line where one member's page names another, with its version mark. Six
checkers each took a sixth of the list with the same written rules. Every change was then read against
its wiki line, and 11 were adjusted (for example, Ipecac + Soy Milk had been re-rated on arithmetic that
compared against base fire rate instead of Ipecac alone). The scripts were scratch work, not kept.

## Verified this session

- `python scripts/gamedata.py validate`: 0 problems. `build` changed only `meta.json`'s date.
- Web `npm run check`: lint, types, 125 of 125 tests. API: 81 tests, 99% coverage; ruff and mypy clean.
- The parity snapshot was regenerated and both sides pass against it. `og.png` was looked at: 442.

## Not verified

- CI on PR #4's head: read it with `gh pr view 4 --json headRefOid,statusCheckRollup`.
- No browser check: the change is data and words. The synergy list and About page are covered by tests.
- 20 entries the checkers marked low-confidence were reviewed and kept; the wiki leaves four questions open
  (listed in `data/synergy-checks.md`, "Left open by the wiki").

## Next steps, in order

1. Owner: merge PR #4?
2. Deploy on the owner's go-ahead ("not yet" on 2026-11-24): `docs/DEPLOY.md`, then its seven checks.
3. The roster's transformation tags (from the item tracker) follow Repentance+ in places, e.g. Infestation
   counts toward Beelzebub. Decide whether the builder's transformation progress should follow Repentance.
4. A browser end-to-end smoke test and a Docker build in CI; split the data out of the main bundle.

## Waiting on the owner

1. Merge PR #4? 2. Deploy? 3. The 301 from `issac.toys` (at Spaceship, at deploy). 4. Delete the merged
   branches (`feat/toy-box`, `data/check-sd-synergies`, `feat/web-app`, local and on GitHub)?

## Warnings

- `tokens.css` writes the dark roles twice; edit both (the test catches drift). `check_roles.py` reads only
  the `[data-theme="dark"]` copy.
- Never list Railway variables: it prints the Anthropic key.
- A mutation or fail-before script that rewrites source files owns them until it finishes.
- The site uses the game's own sprites; the footer and About page say it is an unofficial fan project.
