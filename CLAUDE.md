# CLAUDE.md — isaac.toys (repo: The-Synergizing-of-Isaac)

Project context for any Claude Code session here. The workspace rules in `C:\DEV\CLAUDE.md` load first;
this file adds only what is specific to this project.

## What this is

**isaac.toys** is a free web companion for *The Binding of Isaac: Repentance*. A visitor picks a character,
items and trinkets and sees every curated synergy that applies, which single pickup would complete another,
raw stat changes, transformation progress, and (on request) an AI read on the build. Every item, trinket and
character also has its own page. Unofficial fan project.

It replaced a desktop app (Avalonia, .NET 9) that still lives under `src/` and still builds, but is frozen:
it reads its own old data and gets no new work unless the owner asks.

## Current state (2026-11-28)

- **PR #14 (open): the wiki check in `/admin`, the weekly fold, a "New synergy found" card per AI find**
  (decision 0008, points 7 to 9; the contract's 2026-11-28 amendment). The owner checks a submission against
  the wiki with one click (the model writes from the wiki pages, never the submitted words); every Monday
  `community-backup.yml` folds the checked live ones into `data/synergies.json`, runs the full CI on a branch
  and merges it into `main` itself. Unchecked ones stay Community. Tests read the synergy count from the data.
- PR #13 (merged and live 2026-11-28): the first three Community synergies, checked by hand, in the curated
  list (all three had a claim the wiki contradicts). The list is 445.
- PR #12 (merged and live 2026-11-27): synergy submissions and Community synergies (decision 0008,
  `dev plans/contracts/synergy-submissions.md`): published at `/admin`, live at once from SQLite, marked
  Community, backed up weekly to `backup/community`. The AI read is JSON in sections (a paid live run passed
  on 2026-11-28). The admin login is set on Railway (2026-11-28).

- Web app, API, data pipeline, tests and CI are on `main` (PR #1, merged 2026-11-25). **Live at
  `isaac.toys` with AI on** since 2026-11-26 (Railway; `docs/DEPLOY.md` has the ids; checks 1 to 5 passed,
  apart from check 3's other-network half).
- PR #9 (merged and live 2026-11-26): a browser end-to-end test in CI's `docker` job (`web/e2e/`,
  Playwright), and a footer credit, "Built by CarbonDSP for the TBOI community", linked to carbondsp.com.
- PR #10 (merged and live 2026-11-26): the game data and the libraries load as chunks of their own
  (`web/vite.config.ts`), so no file passes 500 kB and a deploy that changes only the app leaves them
  cached; `npm run bundle:check` holds it in CI. Also the CarbonDSP brandmark in the footer, the reverse
  version for the dark band (decision 0007).
- AI: 10 fresh analyses per visitor per day (`AI_PER_VISITOR_PER_DAY` on Railway, owner, 2026-11-26).
- PR #7 (merged 2026-11-26): a light/dark switch, the logo goes home to an empty builder, an original
  favicon (decision 0005, amended).
- Every synergy checked against the wiki for Repentance (`data/synergy-checks.md`): S and D in PR #2, A, B
  and C in PR #4 (merged 2026-11-25), the first three Community ones in PR #13.
- The Toy Box look (decision 0005, PR #3) is on `main`: light by default, a dark Toy Box by system
  setting or the header switch. See `docs/HANDOFF.md` for what is next.
- PR #5 (merged): CI builds and smoke-tests the Docker image. Transformations follow Repentance with the
  Repentance+ differences marked (decision 0006, PR #6, merged 2026-11-26).
- Owner decisions on record: `docs/decisions/`. Open questions for the owner: `docs/HANDOFF.md`.

## Map

| Path | What |
|---|---|
| `data/` | The one copy of the game data (JSON, sprites, shared page text). Rules: `data/README.md` |
| `scripts/gamedata.py` | Builds and validates `data/`. `scripts/design/` holds the design-system audit |
| `web/` | React 19 + TypeScript + Vite single-page app. `src/engine/` is the pure logic |
| `api/` | FastAPI: `/api/analyze`, `/api/submissions`, `/api/admin/*`, `/api/community`, crawler-ready HTML for every page (with the live Community list inline), sitemap, robots, serves `web/dist` |
| `Dockerfile`, `railway.toml` | One image for Railway: builds `web/`, runs `api/` |
| `.github/workflows/` | `ci.yml` (every PR and push to `main`, and called by the fold); `community-backup.yml` (weekly: backup to `backup/community`, then the fold) |
| `docs/` | `HANDOFF.md`, `DEPLOY.md`, `TESTING.md`, `decisions/`, `archive/desktop-app/` |
| `dev plans/` | Contracts and the next session's starting prompt (`README.md` lists them) |
| `src/`, `*.sln`, `build_mosaic.py` | The frozen desktop app |

## Stack

| Layer | Technology |
|---|---|
| Web | React 19, React Router 8, TypeScript 6 (strict), Vite 8, plain CSS with design tokens |
| Fonts | Bricolage Grotesque and Figtree, self-hosted from `@fontsource-variable` |
| Web tests | Vitest 5, React Testing Library, jsdom; Playwright 1.65 for the browser end-to-end test |
| API | Python 3.12, FastAPI, Uvicorn, Anthropic SDK 2.x, SQLite (standard library) |
| API tests | pytest, pytest-asyncio, pytest-cov, ruff, mypy (strict) |
| Data tooling | Python standard library only; sharp (Node) packs the sprite sheets |
| Hosting | Railway, one service, one volume for the SQLite file |

## Commands

Run web commands in `web/`, API commands in `api/` with its own environment (`api\.venv`, Python 3.12:
the machine's global Python 3.14 lacks wheels for some packages).

| Do | Command |
|---|---|
| Web dev server (port 5273, proxies `/api` to 8001) | `npm run dev` |
| Web checks | `npm run lint`, `npm run typecheck`, `npm run test`, `npm run design:audit` |
| Role-pair contrast (repo root) | `python scripts/design/check_roles.py web/src/styles/tokens.css`, again with `--pairs scripts/design/toy-box-pairs.json` |
| Share image (needs Chrome) | `npm run og -- isaac.toys` |
| Web production build | `npm run build` |
| API tests, lint, types | `.venv\Scripts\python -m pytest --cov`, `-m ruff check .`, `-m mypy` |
| Run the built site locally | `.venv\Scripts\python -m uvicorn app.server:app --port 8001` (after `npm run build`) |
| Rebuild data from sources | `python scripts/gamedata.py build` then `validate` (repo root) |
| Refresh the browser/server snapshot | `.venv\Scripts\python -m app.parity` (in `api/`) |
| Bundle layout (data in its own chunk, nothing over 500 kB) | `npm run bundle:check` (after `npm run build`) |
| Browser end-to-end test (installed Chrome here; site running) | `npm run e2e` (in `web/`; `SITE=<url>` for another site, e.g. live, at no cost) |
| Admin password hash for Railway (asks twice, prints one line) | `.venv\Scripts\python -m app.admin_password` (in `api/`) |
| Move live Community synergies into the curated file | The weekly Action does it for checked ones. By hand: `python scripts/gamedata.py add-submissions <file> [--checked-only]` (repo root), then a PR |
| Smoke-test a running site (local, CI's image, live) | `.venv\Scripts\python -m app.smoke <url> --ai on\|off\|skip` (in `api/`; `--indexable` for production) |

## Rules that are specific to this project

1. **Game data has one home.** `data/items.json`, `trinkets.json`, `characters.json` and `meta.json` are
   generated: change `data/sources/` or `scripts/gamedata.py`, never the output. `data/synergies.json`,
   `data/transformations.json` and `data/content/*.json` are edited by hand. Community synergies live in
   SQLite on top of it (decision 0008) and join it only through `add-submissions`: the weekly fold (checked
   ones, after CI) or by hand and a PR. After a change to
   `transformations.json`, run `build`; run `validate` after any change.
2. **A fact needs a source.** Item facts come from the sources listed in `data/README.md`. Do not add
   numbers, effects or quotes from memory; an honest gap beats a confident guess.
3. **The browser and the server must say the same thing.** Page titles, descriptions, headings and the
   synergy rules exist in TypeScript (`web/src/seo.ts`, `web/src/engine/synergy.ts`) and Python
   (`api/app/pages.py`, `api/app/gamedata.py`). Both fill templates in `data/content/` and both are tested
   against `data/tests/parity.json`. Change one side, change the other, then run `python -m app.parity`.
4. **Design tokens or nothing.** Literal values live only in `web/src/styles/tokens.css`. Components read
   Tier-2 roles. `npm run design:audit` and `scripts/design/check_roles.py` must stay clean, and visual
   changes pass the rendered-contrast gate (`verify-real-pass` skill) before they are shown.
5. **The AI endpoint takes ids only.** `/api/analyze` builds its prompt from the curated data. Never let
   text from the browser reach the model, submitted and Community synergies included (the wiki check sends
   wiki text and the members' names only); that is what keeps
   the paid key from being used as a free proxy.
6. **The site's name is one setting per side:** `web/src/site.ts` (`SITE.domain`) and the API's `SITE_URL`.
   `web/public/og.png` is drawn with the name and `data/`'s counts in it: rerun `npm run og -- <domain>`
   when either changes.
7. **Push and merge:** no project-specific grant. Push a branch once its work and local suites are done,
   open a PR, and ask the owner before merging (`C:\DEV\knowledge\owner.md`).
8. **Deploying, Railway variables and the Anthropic key are the owner's to approve.** Steps: `docs/DEPLOY.md`.

## Gotchas

- Port 8000 is reserved on this machine and 5173 is usually taken: the API uses 8001, Vite 5273.
- `web/public/sprites/` is generated by `npm run sprites` (runs before `dev` and `build`) and is git-ignored.
- A saved light/dark choice is applied by `web/public/theme.js` before the first paint (the CSP forbids
  inline scripts), and by `applyTheme` in `src/hooks/useTheme.ts` after. Change both; one test runs both.
- The logo links to `/` with the `EMPTIED` state (home is an empty builder); the Builder link brings the
  remembered build back. Both are tested in `src/app.test.tsx`.
- React mounts with `createRoot`, not `hydrateRoot`: the server's HTML copy is replaced, not hydrated.
- In the builder the address bar is the build. The store only remembers it for other pages; writing both
  at once races (regression test: "removes a pickup and clears the build").
- `python -I` hides pytest; run tests with the venv's interpreter. Write patch scripts with the Write tool,
  never a heredoc: backslashes do not survive it.
- Docker is not installed here. CI's `docker` job builds the `Dockerfile`, runs it as Railway does and
  smoke-tests it; that job is the only proof the image works.
- Served file types come from `BUILT_TYPES` in `api/app/main.py`, not the host: Python 3.12 and the slim
  image know neither `.webp` nor `.woff2`. A new kind of file in `web/dist` needs a row there.
- `tokens.css` writes the dark roles twice (system setting, `data-theme="dark"`); edit both, and
  `src/styles/tokens.test.ts` fails if they differ. `check_roles.py` reads only the `[data-theme="dark"]` copy.
