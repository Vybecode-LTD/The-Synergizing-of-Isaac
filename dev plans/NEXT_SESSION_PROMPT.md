# Starting prompt — isaac.toys (written 2026-11-25, third session)

Work in `C:\DEV\The-Synergizing-of-Isaac`. Read `CLAUDE.md` (project), then `docs/HANDOFF.md`. This file
says what to do next; those say what exists.

## 1. What this is
`isaac.toys`: a free web companion for *The Binding of Isaac: Repentance*. React app in `web/`, FastAPI in
`api/`, game data in `data/`. Runs only locally (web dev server 5273, built site 8001). Not deployed.

## 2. Rules beyond `CLAUDE.md`
- **Never deploy, create a Railway project, set a variable or merge without the owner's explicit OK.**
- Never list Railway variables (it prints the Anthropic key). Never put a key in `web/`.
- Synergy facts come from the wiki's Repentance lines (`data/synergy-checks.md` says how). No facts from memory.

## 3. State when this was written (verify before trusting it)
- `main`: `449f763` (PR #1 merged by the owner, 2026-11-25 00:14 UTC; CI green).
- Checkout: local branch `feat/web-app` (already merged) carries the PR #2 commits. They are pushed to
  `data/check-sd-synergies`. Switch to that branch, or to `main` after #2 merges, before new work.
- Open PR: `Vybecode-LTD/The-Synergizing-of-Isaac#2`, the S and D synergy check. Auto-fix on, auto-merge off.
  Codex: no findings. CodeRabbit: 5 comments, all handled in the second push (two fixed, one checked and
  kept, two about these docs). Check CI with `gh pr view 2 --json headRefOid,statusCheckRollup`.
- Domains: the owner bought `isaac.toys` and `issac.toys` (both registered). `isaac.toys` has no DNS yet.
- Design: three directions (A Pedestal, B Toy Box, C Almanac; 12 boards) on a private canvas,
  <https://claude.ai/artifact/CPYw7whXXpWSkxp2gKGqke>. Sources, palettes, fonts:
  `dev plans/design-directions/README.md` (untracked; commit with the redesign PR). Not built yet.
- Local suites at the second push: web 114 passed (98.6% lines), API 81 passed (99%), validate 0, parity current.

## 4. First job, then the order
1. **Get the owner's pick** of the directions (one, or sections mixed from several), unless they have given it.
2. **Write the redesign contract** from `C:\DEV\_templates\feature-CONTRACT.md` (it spans sessions), then
   resolve the pick to one system in `web/src/styles/tokens.css`. Keep the Tier-2 roles. Self-host the fonts.
   `npm run design:audit`, `check_roles.py` and the rendered-contrast gate (`verify-real-pass`) must pass in
   every state before anyone sees it.
3. **Check the A, B and C synergies** the same way. `technology+c-azazel` and
   `brimstone+lord-of-the-pit+the-pact` already look wrong.
4. Deploy only on the owner's word (`docs/DEPLOY.md` and its seven checks). Then the browser smoke test and
   the Docker build in CI.

## 5. Waiting on the owner (ask, do not decide)
- Which direction, or which mix? Merge PR #2? Deploy (said "not yet" on 2026-11-24)?
- The 301 from `issac.toys` to `https://isaac.toys` is the owner's to set at Spaceship.

## 6. Environment and traps
- Start, each from the repo root: `cd web; npm run check`, then `cd api; .venv\Scripts\python -m pytest --cov`.
  Send output to a file.
- Wiki facts: the MediaWiki API at `bindingofisaacrebirth.wiki.gg/api.php` (`action=parse&prop=wikitext`)
  works with curl `--ssl-no-revoke`, or httpx with truststore (`api\.venv`). Windows file names ignore
  case: `Crown Of Light` and `Crown of Light` collide in a cache.
- The wiki marks lines `{{dlc|r}}` (Repentance) and `{{dlc|nr}}` (before it). Follow the `r` line.
- Design canvas: one publish per board file. Phone boards `dc-import` the desktop builder, so builders keep
  inline styles only.

## 7. Where things are
Evidence: `docs/TESTING.md`, `data/synergy-checks.md`. Decisions: `docs/decisions/0001` to `0004`; next free
`0005`. Contract: `dev plans/contracts/web-app-seams.md`. Memory: the project's `MEMORY.md`.

## 8. Promotion candidates for `knowledge/` (owner approves)
1. Check game facts against a wiki through its API and cache the pages; mind case-insensitive file names.
2. Run CodeRabbit on data PRs (it skips PRs over 100 files): it caught a real formula error here.
3. A fluid board with inline styles only can be `dc-import`ed into a 390 px phone frame.
4. Change a rating only where its stated reason is wrong; keep opinions as opinions.
5. The earlier five: memory note `earlier-promotion-candidates`.
