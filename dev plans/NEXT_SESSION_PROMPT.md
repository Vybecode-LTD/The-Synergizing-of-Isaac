# Starting prompt — isaac.toys (written 2026-11-24, second session)

Work in `C:\DEV\The-Synergizing-of-Isaac`. Read `CLAUDE.md` (project), then `docs/HANDOFF.md`. This file
says what to do next; those say what exists.

## 1. What this is
`isaac.toys`: a free web companion for *The Binding of Isaac: Repentance*. React app in `web/`, FastAPI
server in `api/`, game data in `data/`. It runs only locally so far (web dev server 5273, built site 8001).

## 2. Rules beyond `CLAUDE.md`
- **Never deploy, create a Railway project, set a variable or merge without the owner's explicit OK.**
- Never list Railway variables (it prints the Anthropic key). Never put a key in `web/`.

## 3. State when this was written (verify before trusting it)
- `main` head: `a99151e`. Checkout: `feat/web-app`.
- Open PR: `Vybecode-LTD/The-Synergizing-of-Isaac#1`, auto-merge off. Pushed head: the docs commit on top
  of `38b1190` (the rename to `isaac.toys`).
- CI: green on `eb8fad4` (run 45510949137, Web and API jobs), the head before the rename. For the rename
  batch see the end of this file; if nothing is there, run
  `gh pr view 1 --json headRefOid,statusCheckRollup,mergeStateStatus`.
- Reviews: Codex on the first push (two findings, fixed in `06ce42c`); the agent's full review (15
  findings, fixed in `01b04ba` and `2695f04`); Codex again on `eb8fad4`: "Didn't find any major issues".
  The rename has had no Codex pass. CodeRabbit skips this PR: 131 files, limit 100.
- Owner's decisions, 2026-11-24: name `isaac.toys` (`decisions/0002`), Opus 5.5 and caps 5 and 200
  (`decisions/0003`), DNS only. All done in code and docs.
- Deployed: nothing. Railway: no project. `isaac.toys` was **not yet registered** when checked.
- Local suites: web 114 passed (98.6% lines), API 81 passed (99%), data validator 0 problems, parity
  current, design audit clean. Half-done: nothing. Unverified items: `docs/HANDOFF.md`.

## 4. First job, then the order
1. **Read what came back on PR #1** since the rename push (CI, any Codex comment). Fix real findings with
   a test that fails first; push fixes as one batch.
2. **Ask the owner what section 5 lists,** in one AskUserQuestion, unless they have already said.
3. **Merge, then deploy,** each only on the owner's word: `docs/DEPLOY.md`, then its seven checks. It is the
   first build of `Dockerfile`, so expect to fix it. Check 5 decides whether the visitor limit holds.
4. **Verify the synergy list** against the game or the wiki, S and D ratings first; record what was
   checked in `data/README.md`. This needs no owner answer and can start any time.
5. Browser end-to-end smoke test and a Docker build in CI; then split the data out of the 621 kB bundle
   and measure Core Web Vitals on the live site.

## 5. Waiting on the owner (ask, do not decide)
- Has `isaac.toys` been registered, and `issac.toys` pointed at it?
- Merge PR #1? Deploy? Retire the desktop app?
- Auto-fix on the PR: the agent could not switch it on in the second session (the app refused).

## 6. Environment and traps
- Start: `cd web && npm run check`; `cd api && .venv\Scripts\python -m pytest --cov`. Send output to a
  file: the project's `-q` plus yours prints only dots on a green run.
- `.claude/launch.json` has `web` and `site`. `web` packs the sprites first: allow twenty seconds.
- A script that mutates source to prove a test restores its own copy at the end: do not edit those files
  while it runs. The API suite takes 15 s; 13 mutations took 8 minutes.
- WSL here has Python 3.14, not the image's 3.12. A `\uXXXX` typed into Write or Edit becomes the character.
- The contrast gate hovers every link: on the 719-tile pages it ran past 15 minutes.

## 7. Where things are
Evidence: `docs/TESTING.md`. Decisions: `docs/decisions/0001` to `0004`; next free `0005`. Contract:
`dev plans/contracts/web-app-seams.md`. Memory: lesson candidates, listed in the project's `MEMORY.md`.

## 8. Promotion candidates for `knowledge/` (owner approves)
1. A path from a URL can raise out of `pathlib` (null byte; over-long name on 3.12): catch `OSError` and
   `ValueError` at the file lookup.
2. A limiter keyed on the address counts IPv6 by /64 (`railway-deploy-playbook`).
3. React Router ignores case in paths; a case-sensitive server needs `caseSensitive` routes
   (`server-copy-for-crawlers`).
4. A spending cap counts calls that were paid for and then failed: refund the visitor, not the budget.
5. Key a cache of model answers on the prompt text, not on ids and a hand-bumped version.
