# Starting prompt — isaac.toys (written 2026-11-25, end of the fifth session)

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
- `main`: `3dc5c13` (PRs #2 and #3 merged 2026-11-25), CI passed.
- **PR #4** (`data/check-abc-synergies`): every A, B and C synergy checked against the wiki; the list is
  442. Open, not merged. Head and CI: `gh pr view 4 --json headRefOid,statusCheckRollup`. Local suites were
  green on the pushed head (web 125 tests, API 81, validate, parity).
- Checkout: `data/check-abc-synergies`, nothing uncommitted.
- Merged branches still exist locally and on GitHub: `feat/toy-box`, `data/check-sd-synergies`,
  `feat/web-app`. Deleting them is the owner's call.

## 4. First job, then the order
1. **Ask the owner whether to merge PR #4.** If its CI is red, fix it first, all fixes in one push. After
   the merge: `git switch main && git pull`.
2. Deploy only on the owner's word: `docs/DEPLOY.md` and its seven checks.
3. Then the HANDOFF's next steps 3 and 4 (transformation tags that follow Repentance+; an end-to-end smoke
   test and a Docker build in CI).

## 5. Waiting on the owner (ask, do not decide)
- Merge PR #4? Deploy (said "not yet" on 2026-11-24)? The 301 from `issac.toys` is theirs at Spaceship.
  Delete the three merged branches? Should the builder count transformations as Repentance does, rather
  than as the item tracker's Repentance+ tags do?

## 6. Environment and traps
- Start, from the repo root: `cd web; npm run check`, then `cd ../api; .venv\Scripts\python -m pytest --cov`.
- The wiki's API answers through Python only with `truststore` (in `api\.venv`, not with `python -I` on the
  global interpreter). Its version marks are `{{dlc|<range>}}`, read along Rebirth, a, a+, r, r+; `nr` means
  older versions only. A parent marked `nr` with a child marked `r` is how it writes "changed in Repentance".
- Restart the 8001 server after every `npm run build` (it caches the old `index.html`).
- `tokens.css` writes the dark roles twice; edit both.

## 7. Where things are
Decisions `docs/decisions/0001`–`0005`, next free `0006`. Contracts: `dev plans/contracts/`. Evidence:
`docs/TESTING.md`, `docs/HANDOFF.md`, `data/synergy-checks.md`. Memory: the project's `MEMORY.md`.

## 8. Promotion candidates for `knowledge/` (owner approves)
1. A fact-check of hundreds of entries: extract the evidence by script, split it across parallel checkers
   with one written brief, then review every change against its source line. A checker's arithmetic can
   use the wrong baseline (Ipecac + Soy Milk was compared with base fire rate, not with Ipecac alone).
2. Matching item names in text: longest name first across the whole roster (Technology vs Technology 2),
   cache pages by kind (item and trinket Cancer differ), and check a plain title is not a boss's page.
3. Earlier ones: memory notes `fourth-session-promotion-candidates`, `third-session-promotion-candidates`,
   `earlier-promotion-candidates`.
