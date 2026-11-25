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

## Current state (2026-11-25)

- Web app, API, data pipeline, tests and CI are on `main` (PR #1, merged 2026-11-25). **Nothing is deployed yet.**
- Every synergy checked against the wiki for Repentance (`data/synergy-checks.md`): S and D in PR #2, A, B
  and C in PR #4 (merged 2026-11-25). The list is 442.
- The Toy Box look (decision 0005, PR #3) is on `main`: light by default, a dark Toy Box by system
  setting. PRs #2 and #3 were merged on 2026-11-25. See `docs/HANDOFF.md` for what is next.
- PR #5 (open): CI builds and smoke-tests the Docker image; the owner said to deploy once it is green.
- Owner decisions on record: `docs/decisions/`. Open questions for the owner: `docs/HANDOFF.md`.

## Map

| Path | What |
|---|---|
| `data/` | The one copy of the game data (JSON, sprites, shared page text). Rules: `data/README.md` |
| `scripts/gamedata.py` | Builds and validates `data/`. `scripts/design/` holds the design-system audit |
| `web/` | React 19 + TypeScript + Vite single-page app. `src/engine/` is the pure logic |
| `api/` | FastAPI: `/api/analyze`, crawler-ready HTML for every page, sitemap, robots, serves `web/dist` |
| `Dockerfile`, `railway.toml` | One image for Railway: builds `web/`, runs `api/` |
| `docs/` | `HANDOFF.md`, `DEPLOY.md`, `TESTING.md`, `decisions/`, `archive/desktop-app/` |
| `dev plans/` | Contracts and the next session's starting prompt (`README.md` lists them) |
| `src/`, `*.sln`, `build_mosaic.py` | The frozen desktop app |

## Stack

| Layer | Technology |
|---|---|
| Web | React 19, React Router 8, TypeScript 6 (strict), Vite 8, plain CSS with design tokens |
| Fonts | Bricolage Grotesque and Figtree, self-hosted from `@fontsource-variable` |
| Web tests | Vitest 5, React Testing Library, jsdom |
| API | Python 3.12, FastAPI, Uvicorn, Anthropic SDK 2.x, SQLite (standard library) |
| API tests | pytest, pytest-asyncio, pytest-cov, ruff, mypy (strict) |
| Data tooling | Python standard library only; sharp (Node) packs the sprite sheets |
| Hosting (planned) | Railway, one service, one volume for the SQLite file |

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
| Smoke-test a running site (local, CI's image, live) | `.venv\Scripts\python -m app.smoke <url> --ai on\|off\|skip` (in `api/`; `--indexable` for production) |

## Rules that are specific to this project

1. **Game data has one home.** `data/items.json`, `trinkets.json`, `characters.json` and `meta.json` are
   generated: change `data/sources/` or `scripts/gamedata.py`, never the output. `data/synergies.json` and
   `data/content/*.json` are edited by hand. Run `validate` after any change.
2. **A fact needs a source.** Item facts come from the sources listed in `data/README.md`. Do not add
   numbers, effects or quotes from memory; an honest gap beats a confident guess.
3. **The browser and the server must say the same thing.** Page titles, descriptions, headings and the
   synergy rules exist in TypeScript (`web/src/seo.ts`, `web/src/engine/synergy.ts`) and Python
   (`api/app/pages.py`, `api/app/gamedata.py`). Both fill templates in `data/content/` and both are tested
   against `data/tests/parity.json`. Change one side, change the other, then run `python -m app.parity`.
4. **Design tokens or nothing.** Literal values live only in `web/src/styles/tokens.css`. Components read
   Tier-2 roles. `npm run design:audit` and `scripts/design/check_roles.py` must stay clean, and visual
   changes pass the rendered-contrast gate (`verify-real-pass` skill) before they are shown.
5. **The AI endpoint takes ids only.** `/api/analyze` builds its prompt from server data. Never let text
   from the browser reach the model; that is what keeps the paid key from being used as a free proxy.
6. **The site's name is one setting per side:** `web/src/site.ts` (`SITE.domain`) and the API's `SITE_URL`.
   `web/public/og.png` is drawn with the name and `data/`'s counts in it: rerun `npm run og -- <domain>`
   when either changes.
7. **Push and merge:** no project-specific grant. Push a branch once its work and local suites are done,
   open a PR, and ask the owner before merging (`C:\DEV\knowledge\owner.md`).
8. **Deploying, Railway variables and the Anthropic key are the owner's to approve.** Steps: `docs/DEPLOY.md`.

## Gotchas

- Port 8000 is reserved on this machine and 5173 is usually taken: the API uses 8001, Vite 5273.
- `web/public/sprites/` is generated by `npm run sprites` (runs before `dev` and `build`) and is git-ignored.
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
