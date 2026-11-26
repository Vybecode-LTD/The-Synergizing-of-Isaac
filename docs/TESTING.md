# Testing

Last run: 2026-11-26, on the owner's Windows machine, branch `perf/split-data-chunk` (the game data and
the libraries in chunks of their own).

## Frameworks

| Area | Tools | Config |
|---|---|---|
| Web | Vitest 5, React Testing Library 16, user-event 14, jsdom 31, `@vitest/coverage-v8` | `web/vite.config.ts`, `web/src/test/setup.ts` |
| Browser end-to-end | Playwright 1.65 (`@playwright/test`, pinned): the installed Chrome here, Playwright's Chromium in CI | `web/playwright.config.ts`, `web/e2e/` |
| Web static checks | TypeScript 6 strict (`noUncheckedIndexedAccess`), ESLint 10 + typescript-eslint, zero warnings | `web/tsconfig.json`, `web/eslint.config.js` |
| API | pytest 9, pytest-asyncio, pytest-cov, FastAPI `TestClient` | `api/pyproject.toml`, `api/tests/conftest.py` |
| API static checks | ruff (lint and format), mypy strict | `api/pyproject.toml` |
| Data | `scripts/gamedata.py validate`, run by `api/tests/test_core.py` | |
| Design system | `scripts/design/audit_design.py --strict`, `check_roles.py` (built-in pairs, then `toy-box-pairs.json`) | from the `web-design-studio` skill |
| Rendered contrast | `rendered_contrast.mjs` from the `verify-real-pass` skill (axe-core, real Chrome) | run by hand, see below |

## Commands and last results

| Command | Where | Result |
|---|---|---|
| `npm run test:coverage` | `web/` | 166 passed. Fails under 85% lines |
| `npm run bundle:check` | `web/`, after `npm run build` | passes, all eight data modules in the data chunk: entry 57.1 kB, `vendor` 256.7 kB, `data` 316.9 kB, runtime 0.6 kB; the single 630.8 kB bundle before the split fails it |
| `npm run e2e` | `web/`, built site running on 8001 (`SITE=<url>` for another) | 13 of 13 browser checks, none skipped |
| `npm run lint`, `npm run typecheck` | `web/` | clean |
| `npm run design:audit` | `web/` | clean, Laws 1 to 6 hold across 66 files |
| `python scripts/design/check_roles.py web/src/styles/tokens.css` | repo root | 100 of 100 role pairs pass |
| same, `--pairs scripts/design/toy-box-pairs.json` | repo root | 70 of 70 pass (stickers, feature, spotlight, band, ink, tints, outlines; light and dark) |
| `npm run build` | `web/` | builds with no chunk-size warning; the fonts ship as six woff2 files (Latin, Latin-ext, Vietnamese) |
| `.venv\Scripts\python -m pytest --cov` | `api/` | 131 passed; 99% of `app/` |
| `.venv\Scripts\python -m app.smoke http://127.0.0.1:8001 --ai skip` | `api/`, built site running | 12 of 12 checks pass |
| CI job `docker`: builds the `Dockerfile`, runs it with `PORT` and a volume at `/data`, then `app.smoke --ai off`, then `npm run e2e` against it | GitHub Actions | smoke 13 of 13 on PR #5 (log read: health answered with 719 items); on PR #9's head, smoke 13 of 13 and browser 13 passed, none skipped |
| `SITE=https://isaac.toys npm run e2e` | `web/`, the live site | 13 of 13 on 2026-11-26 after PR #9 deployed (`703fd94`) |
| `app.smoke https://web-production-6d147b3c.up.railway.app --ai off --indexable --site-url https://isaac.toys` | `api/`, the live site | 13 of 13, 2026-11-25, before the key was set |
| `.venv\Scripts\python -m ruff check .`, `-m ruff format --check .`, `-m mypy` | `api/` | clean |
| `.venv\Scripts\python -m app.parity --check` | `api/` | snapshot is current |
| `python scripts/gamedata.py validate` | repo root | 0 problems |

## What the suites prove

- **Engine** (`web/src/engine/*.test.ts`): matching needs every piece; character synergies only for that
  character; starting items count; suggestions are exactly one pickup away; links round-trip and ignore junk.
- **Regressions from the old data** (`web/src/engine/data.test.ts`): the game's real IDs (Birthright is 619),
  and the synergies that never matched before (trinket `Cancer`, `Jacob and Esau`, `The Satanic Bible`).
- **Interface** (`web/src/app.test.tsx`): adding by keyboard, suggestions, character picker, share link,
  the AI panel's five outcomes, own synergies, filters, detail pages, 404. The Builder link and the logo
  keep the build when clicked on the builder itself; an address in the wrong case is not found.
- **Browser equals server** (`web/src/parity.test.ts`, `api/tests/test_core.py`): both compute titles,
  descriptions, headings and synergy results for the cases in `data/tests/parity.json`. The API writes that
  file (`python -m app.parity`); a difference on either side fails.
- **AI endpoint** (`api/tests/test_analyze.py`): per-visitor and site-wide daily limits, reset at midnight
  UTC, refund when the model call fails, cache hits cost nothing, unknown ids and free text are rejected,
  a forged Cloudflare header does not dodge the limit, and two requests for the same build at the same
  moment share one model call. A failure the model was paid for stays on the site's budget; any other
  error is refunded and answers 502; an IPv6 visitor is one visitor per /64; a corrected synergy is not
  answered from the cache; a request that is not JSON never reaches the model.
- **Store** (`api/tests/test_core.py`): a refund goes back to the day it was taken from, even when the
  call fails after midnight UTC.
- **Stylesheet** (`web/src/styles/tokens.test.ts`): the dark roles written for the system setting equal
  the ones written for `data-theme="dark"`, and every custom property read without a fallback is declared.
- **Share image** (`web/scripts/og-card.test.mjs`): the card prints the counts `data/` holds (a fake data
  folder and the real one), a changed count changes the card, and names are escaped.
- **Pages for crawlers** (`api/tests/test_pages.py`): one `h1`, canonical, valid JSON-LD, escaped text, real
  404s, sitemap of all 947 URLs, robots rules, no path escape from the web build, a 404 (not a 500) for a
  null byte or an over-long name, and stats printed the way the app prints them. Every kind of file the
  build writes goes out with its own type on any host (`.webp` and `.woff2` are unknown to Python 3.12).
- **Transformations** (`web/src/engine/summary.test.ts`, `api/tests/test_pages.py`, `api/tests/test_core.py`,
  parity): counted as the wiki's Repentance lists say, with Repentance+ apart. Infestation adds to
  Beelzebub only in Repentance+, Skatole counts for Oh Crap, Kid's Drawing (a trinket) for Guppy, Necromancer
  is Repentance+ only, Guardian Angel no longer counts for Seraphim, Stompy carries its pill note; both
  sides write the same "Counts toward" line; the validator names seven kinds of broken transformation file
  and stale built tags.
- **A running copy of the site** (`api/app/smoke.py`, tested by `api/tests/test_smoke.py`): 13 checks over
  HTTP, standard library only. Health and its counts, the home page, every script and stylesheet it links
  (type, not empty, cached as immutable), every font the stylesheets load (WOFF2 bytes), both sprite sheets
  (WebP bytes), Brimstone's page, real 404s for a page, a file and an endpoint, robots and sitemap for the
  environment, security headers, and AI switched off (skipped when AI is on: it would be paid for). CI runs
  it against the image; after a deploy it runs against the live site.
- **In a real browser** (`web/e2e/site.e2e.ts`, 13 tests): the server's own pages with its CSP, driven as a
  visitor would. Home is an empty builder served with `script-src 'self'`; two pickups added by keyboard
  give 1 synergy and the address carries the build through a reload; the theme switch pins dark before the
  app runs (read at DOMContentLoaded), moves the browser bar's colour and switches back; the logo goes home
  and Back returns the build; an item opens from the list with its title; the synergy list prints the count
  in `data/synergies.json`; `/no-such-room` and `/Items` answer 404 with the empty room; the footer credits
  CarbonDSP (link to `https://carbondsp.com/`) beside the unofficial notice; at 390px the header keeps a
  44px switch on the wordmark's row, and five pages have no sideways scroll. Every test fails on a console
  error or uncaught exception (`web/e2e/fixtures.ts`), which is how a CSP refusal shows. The reporter
  (`web/e2e/no-vacuous-pass.ts`) fails a run with nothing passed or anything skipped and prints the count.
  It never asks for an AI read.
- **Bundle layout** (`web/scripts/check-bundle.mjs`, tested by `check-bundle.test.mjs`; CI runs it after the
  build): no JavaScript file over Vite's 500 kB warning; every module from `data/` that ships sits in the one
  `data-*.js` chunk and in no other, the entry included; and `index.html` has a `rel="modulepreload"` link to
  it. Which chunk holds which module comes from the report the build writes (`chunkReport` in
  `web/vite.config.ts`, to `web/node_modules/.cache/isaac-toys/chunks.json`, never into `dist/`). A missing
  report, or one that doesn't match `dist/assets`, fails.

## Checks that tests can fail

- The data validator has a positive control (`test_the_validator_catches_what_it_exists_for`): a copy of the
  data broken in six ways must report all six.
- Mutation check on the API, 2026-11-24: nine deliberate breaks (refund removed, refund to today instead
  of the reserved day, no second look at the cache after waiting, Cloudflare header always trusted, site
  budget skipped, `h1` unescaped, unknown page answering 200, cache ignoring the model, path escape
  allowed). All nine turned a test red. An earlier run also caught character synergies always applying.
- "Removes a pickup and clears the build" failed before the build-state race was fixed and passes after.
- Both review fixes on PR #1 were seen failing first: two model calls where one was expected, and the
  new day's count dropping to 0 after a late refund.
- Second review, 2026-11-24 (15 findings, all fixed): every new test was red before its fix. On the API,
  16 tests failed before the fixes and 81 pass after; then each fix was undone on its own, 13 mutations
  in all (site budget refunded on a paid failure, store ignoring `site=False`, cut-off answer accepted,
  empty answer counted as unpaid, unexpected error keeping the allowance, `OSError` and `ValueError` let
  out of the file lookup, IPv6 counted per address, IPv4-mapped address as its own visitor, prompt in pick
  order, cache key ignoring the prompt and the system prompt, stats unrounded). All 13 turned a test red.
  On the web, four tests failed before the fixes (build wiped by the Builder link, `/Items` rendered,
  saved synergies crashing on a non-list, a "+0" stat).
- Toy Box gates, 2026-11-25: the extra role pairs failed a copy of the tokens with ink text on the pool
  sticker (2.93:1); the drift test fails a copy whose dark `--bg-canvas` differs; the custom-property test
  found the two layout sockets before it learned that a read with a fallback is optional.
- Transformations, 2026-11-25: with the tracker's old tags put back into `items.json` and `trinkets.json`
  (from a backup, then restored), 11 of the new web tests failed, each on a fact that changed; the Kid's
  Drawing and Guardian Angel tests passed, as the old data already had those right. Before `build`,
  `validate` reported the stale tags on exactly the 14 pickups the wiki comparison found. Rendered
  contrast on the builder (a build showing every case) and on a trinket page: 0 failing in 4 states each.
- CodeRabbit's review of PR #5 (after its merge), two real findings, both red before the fix: a combined
  `X-Robots-Tag: noindex, nofollow` read as indexable; and `--ai off` against a site with a key posted a
  build to `/api/analyze`, a paid analysis. The analyze check now asks only a site whose health says AI is
  off, and a test counts the POSTs (none).
- Smoke checker, 2026-11-25: 23 deliberate breaks (wrong type, wrong bytes, a soft 404, a missing header,
  an analysis that answers with AI off, and others) each turn exactly the checks they name red, and a site
  that does not answer fails all 13 without crashing. Against the real build, with the file-type fix taken
  out, it failed fonts (`application/octet-stream`), sprite sheets (the same) and the built app
  (`application/javascript` from the Windows registry); with the fix back, 12 of 12 passed. The type test
  was red before the fix.
- Logo and theme switch, 2026-11-26 (PR #7): the logo test was red before the fix (the build stayed on
  screen). Seven deliberate breaks of the switch (`theme.js` not pinning, its two colour bars swapped, junk
  accepted; the hook not saving, not following the system, not unpinning; the label not changing) each
  turned a test red. In real Chrome against the built site with its CSP, 19 of 19 checks: dark is on by
  DOMContentLoaded after a reload (no light flash), Back after the logo returns the build, the phone header
  keeps a 44px switch on the wordmark's row with no sideways scroll, and no console errors. Rendered
  contrast with `--click-each ".theme-toggle"`: the builder 0 failing in 8 states.
- CodeRabbit's review of PR #7 (findings in PR #6's code), each red before its fix: outside production a
  `googlebot: noindex` alone passed as noindex; in production `max-image-preview: none` failed as if it were
  `none`; a transformation with its `items` list deleted, or a string for a list, passed `validate` (the
  browser would crash reading it). Its follow-up: a `null` list crashed `validate` itself with a TypeError
  in the tag step; now each malformed list is named, no tags are compared, and `build` stops with the same
  words. The live site still passes `app.smoke` 12 of 12 under the new parser.
- Favicon, 2026-11-26: the first draft drew nothing in Chrome, because its comment held `--` and so was not
  XML. `src/publicFiles.test.ts` now parses it; a copy with that comment put back fails it. The final file
  was rendered in Chrome at 16 to 256px on light and dark tab bars, and the built site serves it as
  `image/svg+xml`.
- Browser end-to-end test and footer credit, 2026-11-26 (PR #9): the footer's unit test was red before the
  footer changed (no "CarbonDSP" link). The e2e suite run against the live site, which still had the old
  footer, failed exactly the six checks that read the footer and passed the other seven, through Railway's
  real headers. With `dist/theme.js` replaced by a no-op (then restored byte for byte), the theme test failed
  (`data-theme` null at DOMContentLoaded). Four planted controls, each red: a skipped test beside a passing
  one (the reporter fails the run), no test matching (Playwright's "No tests found", then the reporter's
  "tested nothing"), a `console.error`, and an inline script, which the CSP refused ("Executing inline script
  violates ... 'script-src 'self''"). Rendered contrast with `--click-each ".theme-toggle"`: the builder and
  Brimstone's page 0 failing in 8 states each (1440 and 390, light and dark, before and after the switch).
- Data chunk, 2026-11-26 (PR #10): the bundle check failed the real build before the split for exactly four
  reasons (630.8 kB entry, no data chunk, data in the entry, data in no chunk of its own), and its six tests
  cover each failure, the limit to the byte, and a page with no entry. After the split, the server still
  sends the preload links on a page it rewrites (`/items/brimstone`) and serves the data chunk as
  `text/javascript` with `max-age=31536000, immutable`. Changing a visible string in `App.tsx` renamed only
  the entry (`index-BWOl1gZU` to `index-1MYX03ve`); `data`, `vendor` and the runtime kept their names, so a
  deploy that changes only the app leaves them in the browser's cache. (A first probe, an unused export,
  changed nothing at all, the entry included, so it proved nothing and was replaced.) Locally `npm run e2e`
  13 of 13 and `app.smoke` 12 of 12 on the split build.
- CodeRabbit's review of PR #10, two findings, both real: the committed check returned no problems for a
  build with `characters.json` in the entry, and none for a data chunk that was only `rel="prefetch"`. The
  link must now be `modulepreload` (attributes in any order). Its follow-up was right too: the first fix gave
  each data file a text marker, but `meta.json`'s marker "Repentance 1.7.9b" is also in `about.json`, so the
  committed check passed `meta.json` in the entry. Neither of `meta.json`'s values is unique to it
  (`2026-11-25` is in `transformations.json`), so the check now reads module membership from the build's
  chunk report. A real build with `meta.json` left out of the data group failed it ("the entry chunk
  index-CO9lEGKL.js holds data/meta.json"); with the config restored byte for byte it passed again.
- Footer brandmark (PR #10, decision 0007): the footer test was red before the mark existed. The browser
  test checks it loads, is decorative, is 128 px (80 px on a phone) and sits left of the three lines. Against
  the live site, which lacks it, exactly those six checks failed and seven passed. With the two PNGs moved out
  of `dist/assets`, the test failed twice over: the image never loaded, and the 404 reached the console.
  Rendered contrast on Brimstone's page: 0 failing in 8 states.
- The web coverage floor is applied, not just written: with the threshold set to 100 the run failed with
  "Coverage for lines (98.47%) does not meet global threshold (100%)"; at 85 it passes.
- Not provable on this machine: the over-long-name 500 needs Python 3.12 on Linux (Windows answers 404
  before and after; WSL here has 3.14, which no longer raises). The test forces the same `OSError` by hand
  and also asks for a real 300-character address, which CI runs on Linux with 3.12.

## By hand

- **Rendered contrast** (every visual change): with the built site running on 8001,
  `node C:\DEV\knowledge\skills\verify-real-pass\scripts\rendered_contrast.mjs http://127.0.0.1:8001/<page> --schemes dark`,
  plus `--click-each "<selector>"` for state controls. Restart the site server after `npm run build`: it
  keeps the old `index.html`, which then points at deleted assets and the gate measures an unstyled page.
  The Toy Box run (2026-11-25) and its two extra checks (the dialog in a tall viewport, the AI answer with a
  faked response) are in `docs/HANDOFF.md`.
- **Browser end-to-end, here:** `npm run build`, start the site on 8001 (restart it after every build), then
  `npm run e2e` in `web/`. It drives the installed Chrome (Playwright cannot download browsers on this
  machine); `SITE=https://isaac.toys npm run e2e` runs it against the live site at no cost. Failure
  screenshots and traces go to `web/test-results/` (git-ignored; CI uploads them as `e2e-results`).
- **Browser against server** is not a by-hand step: the parity tests (`web/src/parity.test.ts`,
  `api/tests/test_core.py`) compare both sides with `data/tests/parity.json` on every run. The first session
  also compared the browser's titles with the server's on nine routes by hand, once, with no script kept.
- **Synergy facts** against the wiki for Repentance: method and every verdict in `data/synergy-checks.md`
  (S and D on 2026-11-24, A, B and C on 2026-11-25; all 442 entries checked once). After a check,
  `python scripts/gamedata.py validate`, then `python -m app.parity` (in `api/`) and `npm run og -- isaac.toys`
  when the count changes, then both suites. The 2026-11-25 extraction scripts were scratch work, not kept.

## Known gaps

- The browser test covers the paths above, not every interaction: the AI panel (it would be paid for), the
  own-synergy dialog and the filters are covered in jsdom only. It runs in Chromium; no Firefox or Safari.
- jsdom does not lay anything out. The browser test measures the phone header and sideways scroll on five
  pages; other clipping and sticky behaviour is only checked by eye.
- The `Dockerfile` cannot be built locally (no Docker on this machine). CI's `docker` job builds and runs it
  on every pull request and push to `main`.
- `ClaudeAnalyzer` is tested against a stubbed client. No real model call has been made.
