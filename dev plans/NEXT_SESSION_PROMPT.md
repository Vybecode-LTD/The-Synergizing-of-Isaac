# Starting prompt — isaac.toys (written 2026-11-25, sixth session)

Work in `C:\DEV\The-Synergizing-of-Isaac`. Read `CLAUDE.md` (project), then `docs/HANDOFF.md`. This file
says what to do next; those say what exists.

## 1. What this is
`isaac.toys`: a free web companion for *The Binding of Isaac: Repentance*. React app in `web/`, FastAPI in
`api/`, game data in `data/`. **Deployed on Railway** (project `isaac.toys`; ids in `docs/DEPLOY.md`), live at
<https://web-production-6d147b3c.up.railway.app>. Railway deploys every push to `main`.

## 2. Rules beyond `CLAUDE.md`
- **Never merge, change Railway settings or variables, or spend on the AI without the owner's explicit OK.**
- Never list Railway variables (MCP `list-variables` or CLI): it prints the Anthropic key.
- Game facts come from the wiki for Repentance (`data/synergy-checks.md`, `data/transformations.json`).
- A data PR waits for CodeRabbit before merging: merging first cancels its review for good.

## 3. State when this was written (verify before trusting it)
- `main`: `1c536f2` (PR #5 merged). PR #6 (`data/transformations-repentance`, decision 0006) open; check its
  CI and CodeRabbit with `gh pr checks 6`.
- Live deployment: `main` at `1c536f2`, `app.smoke` 13 of 13 with AI off.
- Waiting on the owner: the Anthropic key in Railway, and the CNAME and TXT for `isaac.toys` at Spaceship
  (records in `docs/DEPLOY.md`). Check with MCP `domain-status` and `/api/health` (`"ai"`).

## 4. First job, then the order
1. If the key is in (`/api/health` says `"ai": true`): from `api/`,
   `.venv\Scripts\python -m app.smoke https://web-production-6d147b3c.up.railway.app --ai on --indexable --site-url https://isaac.toys`,
   then `docs/DEPLOY.md` checks 3 (limit behind the edge, with builds nobody has asked for; five paid
   analyses) and 4 (cache after a redeploy, which needs the owner's OK). Both run on the Railway address
   above until `isaac.toys` verifies.
2. PR #6: green CI and CodeRabbit read, then ask the owner to merge. After the deploy, `/items/infestation`
   must say "Beelzebub (Repentance+ only)".
3. When `isaac.toys` verifies: `app.smoke https://isaac.toys ...`, then the owner submits the sitemap
   (check 5).
4. Then `docs/HANDOFF.md` next step 4.

## 5. Waiting on the owner (ask, do not decide)
- Merge PR #6? Switch on Railway's "Wait for CI" for the service (dashboard toggle)? Rename the items whose
  names follow the tracker's older spellings ("1UP", "Number two")?

## 6. Environment and traps
- Start: `cd web; npm run check`, then `cd ../api; .venv\Scripts\python -m pytest --cov`.
- The wiki's API answers through Python only with `truststore` (in `api\.venv`). Its version marks
  `{{dlc|...}}` run along Rebirth, a, a+, r, r+: `x` means from x on, `nx` means before x.
- The wiki's "Seraphim" and "Spider Baby" redirect to the items; the transformations are "... (Transformation)".
- A new service can't opt into `railway.toml`: the healthcheck and Dockerfile path are set on the service.
- Restart the 8001 server after every `npm run build`.

## 7. Where things are
Decisions `docs/decisions/0001`–`0006`, next free `0007`. Contracts: `dev plans/contracts/`. Evidence:
`docs/TESTING.md`. Deploy facts: `docs/DEPLOY.md`. Memory: the project's `MEMORY.md`.

## 8. Promotion candidates for `knowledge/` (owner approves)
1. Python 3.12 and slim images know neither `.webp` nor `.woff2`: serve built files from a type table.
2. A smoke checker in the standard library, tested with one deliberate break per check, runs against the
   CI image and the live site alike.
3. Railway via the connector: an empty service, then variables, volume and healthcheck, then the source,
   so the first build has everything; read the deploy log for the builder and the healthcheck.
4. Earlier: `fifth-session-promotion-candidates` and older memory notes.
