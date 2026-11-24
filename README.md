# issac.toys

A free synergy builder for *The Binding of Isaac: Repentance*. Tell it what you're holding and it tells you
what those things do together.

- **Builder.** Pick a character, up to 16 items and 6 trinkets. Every curated synergy that applies shows up
  as you go, strongest first, and the build lives in the link so you can share it.
- **One pickup away.** Which single item or trinket would complete another synergy with what you have.
- **Build summary.** Raw stat changes added up, and progress toward transformations such as Guppy.
- **AI read.** On request, an AI explanation of the whole build, grounded in the site's own item data.
- **A page for everything.** 719 items, 188 trinkets and 34 characters, each with its known synergies.
- **Your own notes.** Write down a synergy for the build on screen; it stays in your browser.

This is an unofficial fan project. The Binding of Isaac was created by Edmund McMillen and is published by
Nicalis; the game's artwork belongs to them.

## How it is built

| Part | Where | Stack |
|---|---|---|
| Web app | [`web/`](web) | React 19, TypeScript, Vite, plain CSS with design tokens |
| API | [`api/`](api) | Python 3.12, FastAPI. Serves the built app, real HTML for crawlers, and the AI endpoint |
| Game data | [`data/`](data) | JSON and sprites, built and checked by [`scripts/gamedata.py`](scripts/gamedata.py) |

Where every fact comes from is recorded in [`data/README.md`](data/README.md). Item data comes from the
open-source [Rebirth Item Tracker](https://github.com/Rchardon/RebirthItemTracker) (BSD 2-Clause).

## Run it locally

You need Node 22+ and Python 3.12.

```bash
# web app with hot reload, http://localhost:5273
cd web
npm install
npm run dev

# API, http://localhost:8001 (the web dev server proxies /api to it)
cd api
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements-dev.txt   # .venv/bin/python on macOS and Linux
.venv/Scripts/python -m uvicorn app.server:app --port 8001
```

The AI read needs `ANTHROPIC_API_KEY` in the API's environment. Without it everything else works and the
panel says AI is off.

## Check your work

```bash
cd web && npm run check && npm run design:audit
cd api && .venv/Scripts/python -m pytest --cov && .venv/Scripts/python -m ruff check . && .venv/Scripts/python -m mypy
python scripts/gamedata.py validate
```

More in [`docs/TESTING.md`](docs/TESTING.md). Deploying is described in [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Adding or fixing a synergy

Edit [`data/synergies.json`](data/synergies.json). Use the game's exact item, trinket and character names,
a rating from S to D, and say what the combination does. Then run `python scripts/gamedata.py validate`: it
names any entry whose names do not match.

## The desktop app

The project began as a desktop app (Avalonia, .NET 9). It is still under [`src/`](src) and still builds, but
it is no longer developed. Its documentation is in [`docs/archive/desktop-app/`](docs/archive/desktop-app).
