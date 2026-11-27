---
feature: Synergy submissions, live community synergies, the AI's "Synergies found", the admin inbox, the AI read in sections
status: draft        # the owner's answers of 2026-11-27 settle the goal; the rest awaits review in the PR
approved: 2026-11-27 (approve = live from SQLite; finds go to the visitor's own list and to the inbox; admin signs in with a username and password)
decision: docs/decisions/0008-synergy-submissions.md
pr: Vybecode-LTD/The-Synergizing-of-Isaac#12 (predicted)
---

# Contract: synergy submissions and community synergies

## 1. Goal
A visitor can send a synergy the curated list lacks, written by hand or found by the AI read. The owner
reviews it at `/admin`, can edit it, and publishes it with one click: it is live at once as a Community
synergy. Moving community synergies into `data/synergies.json` is an optional later step by pull request.
The AI read comes back as a fixed shape the page lays out in sections.

## 2. Interfaces

**`POST /api/analyze`** (changed). Same request. The model answers in a JSON schema (`output_config.format`);
the server validates it and answers 200 with
`{"read": {"howItPlays": str[], "bestInteractions": str[], "watchOutFor": str[], "verdict": {"tier": "S"|"A"|"B"|"C"|"D", "why": str}}, "found": Found[], "cached", "remaining", "limit"}`.
`Found` is `{"key": str, "itemIds": int[], "trinketIds": int[], "characterSlugs": str[], "rating", "description"}`
(`key` is the combination, e.g. `i:1.2|t:|c:`): only
pieces from the build, at least two requirements, none whose pickups match a curated or live community
entry, at most 4. An answer that fails validation is a 502 `failed`, billed (the visitor is refunded, the
site is not) and not saved. The cache key also hashes the schema. The prompt is built from the curated
file only.

**`POST /api/submissions`** (no auth). `{"character": str|null, "items": int[], "trinkets": int[], "rating",
"description": str (1-600), "sourceUrl": str|null (http/https, at most 300), "website": str}`. `website` is a
honeypot: anything in it gets 200 `{"received": true}` and nothing is stored. Needs at least two
requirements (pickups, plus the character when given). 200 `{"received": true, "id": int, "duplicate":
bool}`; 422 `invalid`; 429 `submissions_limited`. A visitor's repeat of the same combination while it is
still `new` replaces its rating, words and link, and costs nothing from the allowance.

**`POST /api/submissions/from-analysis`** (no auth). `{"character", "items", "trinkets", "picks": str[]}`:
keys from that build's `found`, matched against the saved answer read with the curated list only, so a pick
means the same find whatever was published since. The server stores its own saved copy with origin `ai`,
so no text from the browser is ever stored as the AI's. All picks are stored or none: new ones are charged
together before anything is stored, and a repeat is free even at the limit. 200 `{"received": true, "ids":
int[]}`; 409 `no_analysis`; 422; 429.

**Community synergies.** Submissions with status `approved` whose combination (pickups and characters) the
curated list lacks. Id `community-<row id>`. Every HTML page carries them in its head as
`<script type="application/json" id="community-synergies">[{id, itemIds, trinketIds, characterSlugs,
rating, description}]</script>` ("<" escaped); `web/src/engine/data.ts` appends them to the curated list
with `community: true`, and the server renders pages from the same view (`api/app/community.py`). Cards
show a "Community" tag; the crawler copy says "Sent in by a visitor and approved".
`GET /api/community` (public, `no-cache`) → `{"entries": [data/synergies.json entries with slug ids]}`.
`GET /api/health` adds `"community": int`.

**Admin** (`/api/admin/*`, cookie session, `Cache-Control: no-store`). 503 `admin_off` while
`ADMIN_USERNAME` or a readable `ADMIN_PASSWORD_HASH` is missing; 401 `signed_out`; 403 `bad_origin` when a
write's `Origin` is another site or `Sec-Fetch-Site` is not same-origin.
`GET session` → `{"configured", "signedIn", "username"}`. `POST login {username, password}` → 200 and the
cookie, 401 `wrong_login` (same answer and a full hash for a wrong name or password), 429
`too_many_attempts` (10 failures per visitor per UTC day). `POST logout`.
`GET submissions?status=new|approved|rejected|added|all` → `{"submissions": Submission[], "counts"}`, each
with `id, createdAt, origin, itemIds, trinketIds, characterSlugs, rating, description, sourceUrl, status,
note, reviewedAt, alsoSent, onList` (curated ids with the same pickups).
`PATCH submissions/{id} {status?, rating?, description?, note?}`: setting `approved` publishes, any other
status unpublishes; an edit to a live one shows at once. 409 `already_live` when another submission for the
same combination is live: one live synergy per combination (the live list and the exports also keep only the
oldest, for rows published any other way). `DELETE submissions/{id}`.
`GET export` → `{"entries": [...], "submissions": [{"id", "entry", "origin", "sourceUrl"}]}` for every
approved row. Statuses: `new`, `approved` ("Live"), `rejected`, `added` ("In the curated list", set by the
server at start-up when the curated file has the combination).

**Cookie** `__Host-isaac_admin` in production (`isaac_admin` elsewhere): random 32-byte token, only its
SHA-256 stored; HttpOnly, SameSite=Strict, Path=/, Secure in production; ends 12 hours after sign-in, after
2 idle hours, or when the username or password hash changes.

**Page** `/admin`: the inbox, a lazily loaded chunk. Title and copy from `data/content/pages.json` on both
sides; always `noindex` (meta and header), never in the sitemap, no canonical or JSON-LD.

**Tools.** `python -m app.admin_password` (in `api/`): asks twice, refuses under 15 characters, prints the
`ADMIN_PASSWORD_HASH` value (`scrypt$n$r$p$salt$hash`, N=2^14 r=8 p=5). `python scripts/gamedata.py
add-submissions <file>` appends an export or a backup to `data/synergies.json`, writing nothing if any
entry names something unknown or repeats a listed combination.
**Backup** `.github/workflows/community-backup.yml`, Mondays 09:17 UTC and on demand: `GET /api/community`
into `community.json` on the `backup/community` branch, committed only when it changed.

**Environment (API, new).** `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` (both unset: no admin),
`SUBMISSIONS_PER_VISITOR_PER_DAY` (20), `SUBMISSIONS_SITE_PER_DAY` (500).

## 3. Data
New tables in `DATA_DIR/isaac-toys.sqlite3` (`api/app/store.py`); `usage` also counts `sub:` and `login:`
keys beside the AI's.

| Table | Column | Type | Null | Notes |
|---|---|---|---|---|
| `submissions` | `id` | INTEGER | no | PK, autoincrement |
| | `created_at`, `reviewed_at` | TEXT | no / yes | ISO 8601 UTC |
| | `origin` | TEXT | no | `visitor` or `ai` |
| | `combo` | TEXT | no | sorted pieces, e.g. `i:38.118|t:|c:` |
| | `item_ids`, `trinket_ids`, `characters` | TEXT | no | JSON arrays |
| | `rating`, `description` | TEXT | no | |
| | `source_url`, `note` | TEXT | yes | shown to the owner only |
| | `visitor` | TEXT | no | salted IP hash, as `usage`; never leaves the store |
| | `status` | TEXT | no | `new`, `approved`, `rejected`, `added` |
| `admin_sessions` | `token_hash` | TEXT | no | PK |
| | `username`, `secret_tag`, `created_at`, `seen_at` | TEXT | no | |

Unique index on `(visitor, origin, combo)`.

## 4. Files
`api/app/{main,analysis,community,store,settings,submissions,admin,admin_password,web,gamedata,pages,server_copy,parity}.py`,
`api/tests/test_{analyze,reading,submissions,community,admin,core}.py`,
`web/src/api/{http,analysis,submissions,admin}.ts`, `web/src/engine/data.ts`,
`web/src/components/builder/{AiPanel,AddSynergyDialog}.tsx`, `web/src/pages/{AdminPage,BuilderPage}.tsx`,
`web/src/styles/{tokens,components/builder,components/admin,components/badges}.css`,
`data/content/{pages,about}.json`, `scripts/gamedata.py`, `scripts/design/toy-box-pairs.json`,
`web/e2e/site.e2e.ts`, `.github/{workflows/community-backup.yml,scripts/community-backup.sh}`.

## 5. Conventions this follows
Skills `claude-api` (structured outputs, fallbacks), `auth-threat-model-checklist`, `verify-real-pass`,
`server-copy-for-crawlers`, `railway-deploy-playbook`.

## 6. Non-goals
- No accounts for visitors, no names or e-mail on a submission, no public list of pending submissions.
- Community text never reaches the model.
- No CAPTCHA (a third-party script the CSP forbids); the limits and the honeypot stand in for it.
- No second factor for the admin (one owner; a gap noted in the PR).

## 7. Acceptance
- `test_submissions.py`, `test_community.py`, `test_admin.py`, `test_reading.py`, `test_analyze.py` as listed
  in `docs/TESTING.md`; web `app.test.tsx`, `AdminPage.test.tsx`, `engine/community.test.tsx`, `units.test.ts`.
- Rendered contrast 0 failing on the read in both themes, with a positive control.
- `npm run e2e` 15 of 15 here; against the live site before deploy, exactly the two `/admin` checks fail.

## 8. Open questions
- Should a submitter be able to leave a name for credit? (Not built: it is personal data.)

## Changes after approval
- 2026-11-27: "via a PR" became "approve = live" (owner's second answer); SQLite kept; weekly backup added.
- 2026-11-27, Codex review of PR #12: picks are keys, not places in a list; sending several finds is all or
  nothing and a repeat is free at the limit; one live submission per combination.
