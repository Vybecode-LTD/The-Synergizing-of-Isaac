# Starting prompt — isaac.toys (written 2026-11-27, end of the seventh session)

Work in `C:\DEV\The-Synergizing-of-Isaac`. Read `CLAUDE.md` (project), then `docs/HANDOFF.md`. This file
says what to do next; those say what exists.

## 1. What this is
`isaac.toys`: a free web companion for *The Binding of Isaac: Repentance*. React app in `web/`, FastAPI in
`api/`, game data in `data/`. **Live at <https://isaac.toys> with AI on**, on Railway (ids in
`docs/DEPLOY.md`). Railway deploys every push to `main`.

## 2. Rules beyond `CLAUDE.md`
- **Never merge, change Railway settings or variables, or spend on the AI without the owner's explicit OK.**
  `dev plans/tools/limit_check.py` spends money (`--self-test` does not).
- Never list Railway variables (MCP `list-variables` or CLI): it prints the Anthropic key.
- Game facts come from the wiki for Repentance. The site's own art stays original; the footer's CarbonDSP
  brandmark is the reverse version on purpose (decision 0007).
- Wait for a real CodeRabbit review before merging. Its check can read "Review rate limited";
  `@coderabbitai review` posts as the owner, so ask each time.

## 3. State when this was written (verify before trusting it)
- `main`: `8c59906` (PR #11, merged 2026-11-27 1:39 pm EST). No PR is open. Live deployment `be23bd88` is
  that commit; see the handoff for what was verified after it.
- **Uncommitted on purpose:** this file and `docs/HANDOFF.md`, refreshed after #11 merged. Carry them into
  your first branch.
- AI: 10 fresh analyses per visitor per day (`AI_PER_VISITOR_PER_DAY=10` on Railway), site cap 200.
- Deploy checks 1 to 5 passed; check 3's other-network half is unproven ("Not now", 2026-11-26).
- Merged branches on GitHub and here: `ci/docker-smoke`, `data/transformations-repentance`,
  `docs/deploy-checks-and-handoff`, `fix/home-link-and-theme-switch`, `feat/e2e-and-footer`,
  `perf/split-data-chunk`, `docs/ai-limit-10`.

## 4. First job, then the order
1. Ask the owner the open questions in section 5; nothing planned is blocked on code.
2. If the owner says rename, fix the tracker's older item names ("1UP", "Number two") at the source
   (`data/sources/` or `scripts/gamedata.py`, never the output), then `build`, `validate`, parity, both suites.
3. Otherwise offer the handoff's candidates (a free browser test of the AI panel with AI off; Firefox or
   WebKit in CI) and let the owner pick.

## 5. Waiting on the owner (ask, do not decide)
- Delete the seven merged branches? Switch on Railway's "Wait for CI" (dashboard toggle)? Rename the
  items with the tracker's older spellings? Run check 3's other-network half (up to 12 paid analyses,
  phone on mobile data)?

## 6. Environment and traps
- Start: `cd web; npm run check`, then `cd ../api; .venv\Scripts\python -m pytest --cov`.
- Browser test here: `npm run build`, start the `site` preview server (port 8001), then `npm run e2e`; it
  drives the installed Chrome. Restart 8001 after every build. `SITE=https://isaac.toys npm run e2e` is free.
- Verify a Railway setting inside the container (`railway ssh`, key in the `railway-deploy-playbook`
  skill), printing only that setting. `gh pr merge --match-head-commit` needs the full SHA.

## 7. Where things are
Decisions `docs/decisions/0001`–`0007`, next free `0008`. Evidence: `docs/TESTING.md`. Deploy facts:
`docs/DEPLOY.md`. Tools: `dev plans/tools/`. Memory: `seventh-session-promotion-candidates`. Next PR: 12.

## 8. Promotion candidates for `knowledge/` (owner approves)
1. Run a new browser suite against the live site before deploying: the old build must fail exactly the new
   checks. A free positive control with production's real headers.
2. A Playwright reporter that fails a run with nothing passed or anything skipped; `onEnd` changes the
   status only through a promise.
3. Check what ships by chunk membership (a build plugin's `moduleIds` report), not text markers: data
   files share words.
4. Give a paid probe's verdicts a pure function and `--self-test`, then mutation-test it for free.
5. More in the memory note named in section 7.
