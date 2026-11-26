# Starting prompt — isaac.toys (written 2026-11-26, end of the sixth session)

Work in `C:\DEV\The-Synergizing-of-Isaac`. Read `CLAUDE.md` (project), then `docs/HANDOFF.md`. This file
says what to do next; those say what exists.

## 1. What this is
`isaac.toys`: a free web companion for *The Binding of Isaac: Repentance*. React app in `web/`, FastAPI in
`api/`, game data in `data/`. **Live at <https://isaac.toys> with AI on**, on Railway (project `isaac.toys`;
ids in `docs/DEPLOY.md`). Railway deploys every push to `main`.

## 2. Rules beyond `CLAUDE.md`
- **Never merge, change Railway settings or variables, or spend on the AI without the owner's explicit OK.**
  `dev plans/tools/limit_check.py` spends money.
- Never list Railway variables (MCP `list-variables` or CLI): it prints the Anthropic key.
- Game facts come from the wiki for Repentance. The site's own art stays original: no game character as
  its icon or mascot.
- A data PR waits for CodeRabbit before merging: merging first cancels its review for good.

## 3. State when this was written (verify before trusting it)
- `main`: `0da6fb7` (PRs #6 and #7 merged 2026-11-26). Live deployment `47f699b7` is that commit.
- PR #8 (`docs/deploy-checks-and-handoff`, docs only): this prompt, the handoff, DEPLOY checks 3 and 4
  passed. Check with `gh pr checks 8`.
- Live checks passed: `app.smoke https://isaac.toys --ai on --indexable` 12 of 12; DEPLOY 1 to 4.
- Merged branches still on GitHub: `ci/docker-smoke`, `data/transformations-repentance`,
  `fix/home-link-and-theme-switch`.

## 4. First job, then the order
1. PR #8: CI green, then **ask the owner** to merge (merging deploys).
2. Ask whether the owner has submitted the sitemap (DEPLOY check 5). The unproven part of check 3
   (another network has its own allowance) costs money: only with the owner's OK, follow DEPLOY's steps.
3. Then `docs/HANDOFF.md` next step 3, starting with the browser end-to-end test in CI (seed:
   `dev plans/tools/check_header.mjs`; it finds Playwright through `PLAYWRIGHT_MODULE`).

## 5. Waiting on the owner (ask, do not decide)
- Merge PR #8? Delete the three merged branches? Switch on Railway's "Wait for CI" (dashboard toggle)?
  Rename the items whose names follow the tracker's older spellings ("1UP", "Number two")?

## 6. Environment and traps
- Start: `cd web; npm run check`, then `cd ../api; .venv\Scripts\python -m pytest --cov`.
- The in-app browser pane may be hidden and refuse to navigate: use Playwright with the installed Chrome
  (as `check_header.mjs` does). Restart the 8001 server after every `npm run build`.
- The CSP allows no inline script; a saved theme is applied by `web/public/theme.js` and `applyTheme`.
- An SVG comment must not contain `--`. `gh pr merge --match-head-commit` needs the full SHA.
- The GitHub API (5,000 calls an hour, shared) ran out once; `git push` still works when it does.

## 7. Where things are
Decisions `docs/decisions/0001`–`0006` (0005 amended twice), next free `0007`. Evidence:
`docs/TESTING.md`. Deploy facts and checks: `docs/DEPLOY.md`. Tools: `dev plans/tools/`. Memory: the
project's `MEMORY.md`. Next PR number: 9.

## 8. Promotion candidates for `knowledge/` (owner approves)
1. A CSP without inline scripts: put the theme bootstrap in a same-origin file and test it and the app's
   copy against the real `index.html`.
2. Parse every hand-made SVG in a test: one `--` in a comment made a favicon draw nothing.
3. A stacked PR's review covers the PR below it too; fix there, merge in order, pin each merge to its SHA.
4. Railway's HTTP log (`srcIp`) attributes a rate limit's usage without printing anyone's address.
5. Earlier: `2026-11-26-promotion-candidates` and the older memory notes.
