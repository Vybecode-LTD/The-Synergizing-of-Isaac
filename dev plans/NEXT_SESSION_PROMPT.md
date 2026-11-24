# Starting prompt — issac.toys (written 2026-11-24)

Work in `C:\DEV\The-Synergizing-of-Isaac`. Read `CLAUDE.md` (project), then `docs/HANDOFF.md`. This file
tells you what to do next; those tell you what exists.

## 1. What this is
`issac.toys`: a free web companion for *The Binding of Isaac: Repentance*. React app in `web/`, FastAPI
server in `api/`, game data in `data/`. It runs only locally so far: web dev server on 5273, built site on
8001. The old desktop app in `src/` is frozen.

## 2. Rules that override defaults
- **Never deploy, create a Railway project, set a variable or merge without the owner's explicit OK.**
- Never list Railway variables (it prints the Anthropic key). Never put a key in `web/`.
- Never add game facts from memory: sources only (`data/README.md`). Never edit the generated data files.
- Change the TypeScript and Python twins together (`CLAUDE.md` rule 3), then run `python -m app.parity`.
- No visual change is shown before the rendered-contrast gate passes (`verify-real-pass` skill).

## 3. State when this was written (verify before trusting it)
- `main` head: `a99151e`. Checkout: `feat/web-app`, three commits ahead of `main`, clean, pushed once.
- Open PR: `Vybecode-LTD/The-Synergizing-of-Isaac#1` (number predicted). Confirm number, head and CI with
  `gh pr list` and `gh pr checks 1`. Auto-fix was to be switched on for it.
- Deployed: nothing. Railway: no project for this repo. Domain `issac.toys` is registered by the owner.
- Local suites at the handoff: web 109 passed, API 71 passed, data validator 0 problems, design audit clean.
- Codex's first review (two findings) is fixed and answered on the PR.
- Half-done: nothing in the working tree. Unverified items are listed in `docs/HANDOFF.md`.

## 4. First job, then the order
1. **Get PR #1 to green and reviewed.** Read CI and any Codex or CodeRabbit findings, fix real ones with a
   test, push the fixes as one batch. Reason: everything else lands on top of it.
2. **Ask the owner the open decisions in section 5,** in one AskUserQuestion.
3. **Deploy,** only once the owner says so: `docs/DEPLOY.md`, then its seven post-deploy checks. The first
   deploy is also the first build of `Dockerfile`, so expect to fix it.
4. **Verify the synergy list** against the game or the wiki, S and D ratings first; record what was
   checked in `data/README.md`.
5. Browser end-to-end smoke test and a Docker build in CI; then split the data out of the 620 kB bundle
   and measure Core Web Vitals on the live site.

## 5. Owner decisions still open (ask, do not decide)
- Is the double-s in `issac.toys` deliberate? `isaac.toys` was unregistered on 2026-11-24.
- Which model pays its way for the AI read, and are 5 per visitor and 200 per day the right caps?
- Will Cloudflare proxy the domain?
- Merge PR #1? Deploy? Retire the desktop app?

## 6. Environment that worked, and traps hit
- API: `api\.venv` (Python 3.12; the global 3.14 lacks wheels). Web: Node 26, `npm` in `web/`.
- Ports: 8000 reserved, 5173 taken. Use 8001 and 5273. `.claude/launch.json` has `web` and `site`.
- Start: `cd web && npm run check`; `cd api && .venv\Scripts\python -m pytest --cov`.
- A `\uXXXX` escape typed into a Write or Edit call lands in the file as the real character. Use `chr()`
  or `\p{...}` instead. Heredocs eat backslashes: write patch scripts with the Write tool.
- The contrast gate hovers every link: on a page with 719 tiles it ran past 15 minutes. Point it at a
  lighter page with the same component. Text cut by a scrolling dialog's edge comes back "undecided".
- Limit `mypy` output (`| tail -1`): one overload error printed about 20 KB.

## 7. Where things are
Evidence: `docs/TESTING.md`. Decisions: `docs/decisions/0001` to `0004`; next free number `0005`.
Contract: `dev plans/contracts/web-app-seams.md` (draft). Memory: none saved for this project yet.

## 8. Promotion candidates for `knowledge/` (owner approves)
1. `\uXXXX` in tool-written files becomes the literal character (windows-shell-and-tool-traps).
2. The contrast gate on pages with hundreds of identical links, and "undecided" inside a scrolling modal
   (verify-real-pass).
3. One state, one owner: mirroring state into a store and the address bar in the same handler races under
   React Router 8, because the URL updates a beat later.
4. Twin logic in two languages: the server writes a snapshot, both test suites assert against it.
5. Audit inherited reference data against an authoritative source before building on it.
