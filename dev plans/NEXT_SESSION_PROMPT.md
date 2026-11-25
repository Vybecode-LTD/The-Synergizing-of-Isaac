# Starting prompt — isaac.toys (written 2026-11-25, end of the fourth session)

Work in `C:\DEV\The-Synergizing-of-Isaac`. Read `CLAUDE.md` (project), then `docs/HANDOFF.md`. This file
says what to do next; those say what exists.

## 1. What this is
`isaac.toys`: a free web companion for *The Binding of Isaac: Repentance*. React app in `web/`, FastAPI in
`api/`, game data in `data/`. Runs only locally (web 5273, built site 8001). Not deployed.

## 2. Rules beyond `CLAUDE.md`
- **Never deploy, create a Railway project, set a variable or merge without the owner's explicit OK.**
- Never list Railway variables (it prints the Anthropic key). Never put a key in `web/`.
- Synergy facts come from the wiki's Repentance lines (`data/synergy-checks.md`). No facts from memory.

## 3. State when this was written (verify before trusting it)
- `main`: `449f763`. **PR #2** (S and D synergy check, branch `data/check-sd-synergies`) open at `996a02f`,
  CI green, not merged.
- **PR #3** (Toy Box redesign, branch `feat/toy-box`) is **stacked on #2**: base `main`, so it shows #2's
  commits until #2 is merged. Its head and CI: run `gh pr view 3 --json headRefOid,statusCheckRollup`
  (CI was running when this was written; the closing message of the session gave the result).
- Checkout: `feat/toy-box`. Nothing uncommitted except what `git status` shows.
- Contract: `dev plans/contracts/toy-box-redesign.md` (built; nine changes made while building at its end).

## 4. First job, then the order
1. **Ask the owner** whether to merge #2 and then #3 (both need their OK). If #3's CI is red, fix it first,
   batching every fix into one push.
2. After merging: `git switch main && git pull`, delete the merged branches only if the owner agrees.
3. **A, B and C synergy check**, the same way as S and D (`data/synergy-checks.md` says how). Already
   suspect: `technology+c-azazel` and `brimstone+lord-of-the-pit+the-pact`. Rerun `npm run og -- isaac.toys`
   if the count changes.
4. Deploy only on the owner's word: `docs/DEPLOY.md` and its seven checks.

## 5. Waiting on the owner (ask, do not decide)
- Merge #2, then #3? Deploy (said "not yet" on 2026-11-24)? The 301 from `issac.toys` is theirs at Spaceship.

## 6. Environment and traps
- Start, from the repo root: `cd web; npm run check`, then `cd ../api; .venv\Scripts\python -m pytest --cov`.
- Gates from the repo root: `npm run design:audit` (in `web/`), `python scripts/design/check_roles.py
  web/src/styles/tokens.css`, and again with `--pairs scripts/design/toy-box-pairs.json`.
- Rendered contrast: `node C:\DEV\knowledge\skills\verify-real-pass\scripts\rendered_contrast.mjs <url>`.
  **Restart the 8001 server after every `npm run build`** (it caches the old `index.html`). The character
  dialog needs a tall viewport to be decided at 390 (HANDOFF says how it was done).
- The app's browser pane crops screenshots; full-page shots via Playwright from the skill's `node_modules`
  with `channel: "chrome"` worked.
- `tokens.css` writes the dark roles twice; edit both.

## 7. Where things are
Decisions `docs/decisions/0001`–`0005`, next free `0006`. Contracts: `dev plans/contracts/`. Evidence:
`docs/TESTING.md`, `docs/HANDOFF.md`, `data/synergy-checks.md`. Memory: the project's `MEMORY.md`.

## 8. Promotion candidates for `knowledge/` (owner approves)
1. A server that caches `index.html` serves an unstyled page after a rebuild; a contrast gate then
   measures browser defaults. Restart it, and check the CSS hash the page links.
2. The contrast gate's unclipping pushes a scrolling modal's content off a 900px viewport ("undecided");
   check the modal in a viewport tall enough that it does not scroll, and prove it opened.
3. sharp/librsvg cannot use woff2 fonts; headless Chrome `--screenshot` draws a card with the site's fonts.
4. A design audit can treat `--shadow-*` as Tier 1: expose offset shadows through elevation roles.
5. The earlier ones: memory notes `earlier-promotion-candidates`, `third-session-promotion-candidates`.
