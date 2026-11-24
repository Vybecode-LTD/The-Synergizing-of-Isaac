---
feature: Web app seams (AI analysis API, build links, data files, public URLs)
status: draft        # goal approved by the owner's answers on 2026-11-24; the rest awaits review in the PR
approved: 2026-11-24 (platform = web app, AI = owner pays and rate-limited)
plan: dev plans/README.md
pr: Vybecode-LTD/The-Synergizing-of-Isaac#1 (predicted)
---

# Contract: web app seams

## 1. Goal
A visitor builds a loadout in the browser, sees every curated synergy that applies, shares it by link, and
can ask for an AI read that the site pays for within a hard daily budget.

## 2. Interfaces

**Build link (public, permanent).** `/?c=<character slug>&i=<item ids>&t=<trinket ids>`, ids are the game's
own, joined by `.` in pick order. Unknown values are ignored, never an error. Limits: 16 items, 6 trinkets.
Code: `web/src/engine/buildCodec.ts` (`decodeBuild`, `encodeBuild`, `MAX_ITEMS`, `MAX_TRINKETS`).

**`POST /api/analyze`** (no auth). Request `{"character": str | null, "items": int[], "trinkets": int[]}`.
The server builds the prompt from its own data; no free text is accepted from the browser.

| Status | Body | When |
|---|---|---|
| 200 | `{"text": str, "cached": bool, "remaining": int, "limit": int}` | answered (fresh or from cache) |
| 422 | `{"detail": {"code": "invalid", "message": str}}` | unknown id, over the limits, or nothing selected |
| 429 | `{"detail": {"code": "rate_limited" \| "budget_exhausted", "message": str}}` | visitor's or site's daily cap reached |
| 503 | `{"detail": {"code": "not_configured", "message": str}}` | no `ANTHROPIC_API_KEY` |
| 502 | `{"detail": {"code": "failed", "message": str}}` | the model call failed; the visitor's count is refunded |

**`GET /api/health`** → `{"status": "ok", "ai": bool, "items": int, "synergies": int}`.

**Public pages** (each answers with real HTML for crawlers; anything else is a true 404):
`/`, `/items`, `/items/<slug>`, `/trinkets`, `/trinkets/<slug>`, `/characters`, `/characters/<slug>`,
`/synergies`, `/about`, plus `/sitemap.xml`, `/robots.txt`, `/llms.txt`.

**Environment (API).** `ANTHROPIC_API_KEY`, `AI_MODEL` (default `claude-opus-5-5`), `AI_EFFORT` (`low`),
`AI_PER_VISITOR_PER_DAY` (5), `AI_SITE_PER_DAY` (200), `CLIENT_IP_HEADER` (`x-forwarded-for`; set
`cf-connecting-ip` only when Cloudflare proxies the domain), `SITE_URL` (`https://issac.toys`),
`ENVIRONMENT` (`production` allows indexing), `DATA_DIR` (SQLite for cache and counters; a Railway volume),
`PORT`.

## 3. Data
No database server. `DATA_DIR/issac-toys.sqlite3`, created on start (`api/app/store.py`):

| Table | Column | Type | Null | Default / key |
|---|---|---|---|---|
| `analysis_cache` | `key` | TEXT | no | PK: sha256 of model, prompt version and the sorted build |
| | `text` | TEXT | no | |
| | `created_at` | TEXT | no | ISO 8601 UTC |
| `usage` | `day` | TEXT | no | PK part: UTC date |
| | `visitor` | TEXT | no | PK part: salted hash of the IP, or `*` for the site total |
| | `count` | INTEGER | no | 0 |
| `meta` | `key`, `value` | TEXT | no | PK `key`; holds the random IP salt |

Game data: `data/*.json`, shapes in `web/src/engine/types.ts`; rules in `data/README.md`.

## 4. Files
`api/app/{main,settings,gamedata,analysis,store,server_copy,shell}.py`, `api/tests/`, `web/src/api/analysis.ts`,
`web/src/components/builder/AiPanel.tsx`, `Dockerfile`, `railway.toml`.

## 5. Conventions this follows
Skills `railway-deploy-playbook` (bind `$PORT`, client IP behind the edge, never list variables),
`server-copy-for-crawlers`, `claude-api`, `verify-real-pass`; `C:\DEV\SEO_OPTIMIZATION.md`.

## 6. Non-goals
- No accounts, no server-side storage of builds or of visitors' own synergies.
- No free-text prompt to the model, and no streaming.
- No community submission of synergies to the shared list (still edited in `data/synergies.json`).
- The desktop app under `src/` is not changed.

## 7. Acceptance
- `api/tests/test_analyze.py`: limits, refund on failure, cache hit costs nothing, unknown ids rejected, the
  prompt contains only server data.
- `api/tests/test_pages.py`: one `h1`, canonical, valid JSON-LD and a real 404, per route type.
- `web/src/engine/*.test.ts`: link round-trip, matching, suggestions.
- Live: the builder at the dev URL shows synergies for `/?i=118.38` and the AI panel returns an answer once a
  key is set.

## 8. Open questions
- Which model pays its way: Opus 5.5 (about 2 cents an analysis), Sonnet 5.5 (about 1 cent) or Haiku 5.5
  (under a tenth of a cent)?
- Are 5 analyses per visitor and 200 per day for the whole site the right caps?
- Is the domain's spelling final (`issac.toys`; `isaac.toys` was unregistered on 2026-11-24)?
- Will Cloudflare proxy the domain? It decides `CLIENT_IP_HEADER`.

## Changes after approval
