# Starting prompt — isaac.toys (written 2026-11-26, end of the seventh session)

Work in `C:\DEV\The-Synergizing-of-Isaac`. Read `CLAUDE.md` (project), then `docs/HANDOFF.md`. This file
says what to do next; those say what exists.

## 1. What this is
`isaac.toys`: a free web companion for *The Binding of Isaac: Repentance*. React app in `web/`, FastAPI in
`api/`, game data in `data/`. **Live at <https://isaac.toys> with AI on**, on Railway (ids in
`docs/DEPLOY.md`). Railway deploys every push to `main`.

## 2. Rules beyond `CLAUDE.md`
- **Never merge, change Railway settings or variables, or spend on the AI without the owner's explicit OK.**
  `dev plans/tools/limit_check.py` spends money.
- Never list Railway variables (MCP `list-variables` or CLI): it prints the Anthropic key.
- Game facts come from the wiki for Repentance. The site's own art stays original.
- Wait for CodeRabbit before merging: merging first cancels its review for good.

## 3. State when this was written (verify before trusting it)
- `main`: `703fd94` (PR #9: browser e2e test in CI, CarbonDSP footer credit; merged 9:32 am EST). Live
  deployment `7ae5af93` is that commit, SUCCESS; live e2e 13 of 13, smoke 12 of 12.
- **PR #10** (`perf/split-data-chunk`): the game data and the libraries in chunks of their own
  (`web/vite.config.ts`), held by `npm run bundle:check` in CI. Pushed once; CI had not finished. Check
  with `gh pr checks 10`.
- Deploy checks 1 to 5 passed; check 3's other-network half is unproven ("Not now", 2026-11-26).
- Merged branches still on GitHub: `ci/docker-smoke`, `data/transformations-repentance`,
  `docs/deploy-checks-and-handoff`, `fix/home-link-and-theme-switch`, `feat/e2e-and-footer`.

## 4. First job, then the order
1. PR #10: CI green and CodeRabbit finished, then **ask the owner** to merge (merging deploys). After the
   deploy: `SITE=https://isaac.toys npm run e2e` in `web/` (13 of 13), and the live page loads
   `data-*.js` and `vendor-*.js`.
2. The tracker's older item names: ask first (section 5).

## 5. Waiting on the owner (ask, do not decide)
- Merge PR #10? Delete the five merged branches? Switch on Railway's "Wait for CI" (dashboard toggle)?
  Rename the items with the tracker's older spellings ("1UP", "Number two")? Run check 3's other-network
  half (one paid analysis, phone on mobile data)?

## 6. Environment and traps
- Start: `cd web; npm run check`, then `cd ../api; .venv\Scripts\python -m pytest --cov`.
- Browser test here: `npm run build`, start the `site` preview server (`.claude/launch.json`, port 8001),
  then `npm run e2e`. It drives the installed Chrome; Playwright can't download browsers on this machine.
  Restart the 8001 server after every build (it caches the old `index.html`).
- The CSP allows no inline script; a saved theme is applied by `web/public/theme.js` and `applyTheme`.
- An SVG comment must not contain `--`. `gh pr merge --match-head-commit` needs the full SHA.
- The GitHub API (5,000 calls an hour, shared) ran out once; `git push` still works when it does.

## 7. Where things are
Decisions `docs/decisions/0001`–`0006`, next free `0007`. Evidence: `docs/TESTING.md`. Deploy facts:
`docs/DEPLOY.md`. Tools: `dev plans/tools/`. Memory: the project's `MEMORY.md` (this session's
candidates: `seventh-session-promotion-candidates`). Next PR number: 11.

## 8. Promotion candidates for `knowledge/` (owner approves)
1. Prove a browser suite against the live site before deploying the change: the old build must fail exactly
   the new checks and pass the rest. It's a free positive control with production's real headers.
2. A Playwright reporter that fails a run with nothing passed or anything skipped (`web/e2e/no-vacuous-pass.ts`);
   Playwright takes a changed status from `onEnd` only as a promise.
3. A console-error fixture doubles as a CSP check; prove it with an injected inline script.
4. Earlier: `2026-11-26-promotion-candidates` and the older memory notes.
