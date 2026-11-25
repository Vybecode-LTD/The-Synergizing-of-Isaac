# Handoff — 2026-11-25 (sixth session)

## Current state

- **isaac.toys** is a web app (builder with shareable links, "one pickup away", stat and transformation
  summary, a page per item, trinket and character, the synergy list, own synergies, an AI read inside daily
  caps). Decisions: `docs/decisions/0001` to `0005`. **Nothing is deployed**; no Railway project exists.
- `main` = `45bea2a` (PR #4: every A, B and C synergy checked against the wiki; the list is 442; record in
  `data/synergy-checks.md`). Codex found nothing in #4; CodeRabbit's review was cancelled by the merge.
- The four merged branches are deleted, locally and on GitHub (the owner's yes, 2026-11-25).
- Branch `ci/docker-smoke`, PR #5: a CI job that builds the `Dockerfile`, runs it as Railway does and
  smoke-tests it; `api/app/smoke.py`, the same checks for the live site; a fix for `.webp` and `.woff2`
  going out as `application/octet-stream` (Python 3.12 knows neither; the slim image has no system list).
- **The desktop app is untouched.**

## Owner decisions this session (2026-11-25)

1. Deploy this session, once the Docker check passes in CI.
2. The builder counts transformations as Repentance does and marks items that count only in Repentance+.
   Chosen over keeping the tracker's tags and over Repentance with no mark. Record it as decision 0006
   with the change.
3. Delete the four merged branches: done.

## Verified this session

- API: 113 tests, 99% coverage; ruff, format and mypy clean. The type test failed before the fix.
- `python -m app.smoke` against the built site on 8001: 12 of 12. With the fix taken out it failed fonts,
  sprite sheets and the built app; with it back, 12 of 12. 23 deliberate breaks each turn their check red.

## Not verified

- The `docker` job has not run yet: PR #5's CI is its first run.
- `ClaudeAnalyzer` has never made a real model call.

## Next steps, in order

1. PR #5 green in CI, then the owner's yes to merge.
2. Deploy with the owner: `docs/DEPLOY.md` (owner steps, then its five checks; check 2 is `app.smoke`).
3. Transformations (decision 0006): source each transformation's Repentance item list from the wiki,
   override the tracker's tags in `scripts/gamedata.py`, mark the Repentance+-only items in the builder, on
   both sides, and regenerate the parity snapshot. A data PR: wait for CodeRabbit before merging.
4. A browser end-to-end smoke test; split the data out of the main bundle (Vite warns at 500 kB).

## Waiting on the owner

1. Merge PR #5. 2. The Railway steps, the Anthropic key and DNS at Spaceship (`docs/DEPLOY.md`). 3. The 301
   from `issac.toys` (at Spaceship).

## Warnings

- `tokens.css` writes the dark roles twice; edit both (the test catches drift). `check_roles.py` reads only
  the `[data-theme="dark"]` copy.
- Never list Railway variables: it prints the Anthropic key.
- A mutation or fail-before script that rewrites source files owns them until it finishes.
- Merging a PR before CodeRabbit's check finishes cancels its review for good; wait for it on data PRs.
- The site uses the game's own sprites; the footer and About page say it is an unofficial fan project.
