# Handoff — 2026-11-24 (third session)

## Current state

- **The project is a web app, now named `isaac.toys`:** builder with shareable links, "one pickup away"
  suggestions, stat and transformation summary, pages for all 719 items, 188 trinkets and 34 characters, the
  full synergy list, own synergies kept in the browser, and an AI read paid by the site inside daily caps.
  Decisions: `docs/decisions/0001` to `0004`.
- **PR `Vybecode-LTD/The-Synergizing-of-Isaac#1` was merged by the owner** on 2026-11-25 at 00:14 UTC
  (`main` = `449f763`, CI green). The S and D synergy check is PR #2; its head and CI:
  `dev plans/NEXT_SESSION_PROMPT.md` section 3.
- **Every S and D synergy was checked against the wiki** for Repentance (third session): 28 confirmed, 28
  corrected, 17 re-rated, 4 removed; the list is 454 entries. Record: `data/synergy-checks.md`. A, B and C
  entries are not checked.
- **The whole PR was reviewed this session** (API, deploy files, the web app's logic; not the CSS, the
  generated data or the vendored design scripts) and all 15 findings were fixed with tests. Codex was then
  asked to review again and answered "Didn't find any major issues" on `eb8fad4`. CodeRabbit has never
  reviewed it: it skips pull requests over 100 files, and this one has 131.
- **The owner decided on 2026-11-24:** the name is `isaac.toys`, with `issac.toys` redirecting
  (`decisions/0002`); the AI read uses Opus 5.5 with the caps at 5 per visitor and 200 a day
  (`decisions/0003`); DNS only, no Cloudflare proxy. The rename is done in code, tests, snapshot and share
  image. Later the same day the owner bought `isaac.toys` (both domains kept), said "not yet" to deploying,
  and kept the desktop app frozen.
- **Nothing is deployed.** No Railway project exists for this repo. No real model call has been made.
- **The desktop app is untouched.**

## What the review changed (behaviour worth knowing)

- **Builder:** the Builder link and the logo no longer wipe the build when clicked on the builder itself.
  A bare `/` means "show what I had" unless the builder's own edit emptied it (`BuilderPage.tsx`, carried
  in the navigation state).
- **AI read:** the prompt lists pickups in id order, and a saved answer is keyed on the model, the system
  prompt and the prompt text, so a corrected synergy or item fact is never answered from the cache. No
  version to bump. A failure the model was paid for (declined, empty, cut off) is refunded to the visitor
  but stays on the site's budget; any other error is refunded in full and answers 502.
- **Limits:** an IPv6 visitor is counted by /64. A request that is not JSON never reaches the model.
- **Pages:** a null byte or an over-long name is a 404, not a 500. Addresses are case-sensitive in the
  browser as on the server. The server prints stats to two places, as the app does.
- **Build and deploy files:** dependencies pinned to the tested major, `exec uvicorn` in the image, web
  coverage must stay at 85% lines or CI fails, post-deploy check 5 now forges `X-Forwarded-For` too.

## Verified this session (commands and results in `docs/TESTING.md`)

- Web: 114 tests, 98.6% lines; lint, types, build and design audit clean. API: 81 tests, 99%; ruff, mypy,
  data validator (0 problems) and parity snapshot clean. All of it re-run after the rename.
- Every new test was red before its fix. 13 of 13 mutations on the API fixes were caught.
- In a real browser (dev server on 5273): Builder link and logo keep the build; Clear all stays cleared
  after a fresh load; adding from an item page, Back and Forward work; `/Items` is the not-found page;
  after the rename the wordmark, titles and footer say `isaac.toys` and the old name appears nowhere.
- The model call's parameters were checked against the `claude-api` skill: `output_config.effort`, the
  refusal fallback's beta name and `"default"` form, and the five models that accept it.

## Not verified

- **The over-long-name 500** cannot be reproduced here (it needs Python 3.12 on Linux). The test forces the
  same error by hand; CI ran the real 300-character address on Linux and passed.
- **Railway's edge overwriting `X-Forwarded-For`** is taken from another project. Post-deploy check 5
  proves or disproves it; until then the per-visitor limit behind Railway is an assumption.
- **Rendered contrast was not re-run:** no CSS or markup changed, only the name's letters. The gaps listed
  in the first session stand (character dialog at 390 wide, search dropdown, the hover pass on `/items`
  and `/trinkets`, two small CSS changes made after the gate ran).
- **`Dockerfile`:** never built (no Docker here). **`ClaudeAnalyzer`:** only against a stub.
- **Core Web Vitals:** not measured. The JS bundle is 621 kB (169 kB gzipped) because it carries the data.

## Next steps, in order

1. The owner asked for a high-end redesign: three style directions to pick from or mix, then the new site
   built from the pick. See the starting prompt for where it stands.
2. Deploy on the owner's go-ahead (said "not yet" on 2026-11-24): `docs/DEPLOY.md`, then its seven checks.
3. Check the A, B and C synergies the same way (`data/synergy-checks.md` says how).
4. Add a browser end-to-end smoke test and a Docker build to CI.
5. Split the data out of the main bundle and measure Core Web Vitals on the live site.

## Waiting on the owner

1. **Merge PR #2** (the synergy check)?
2. **Deploy?** "Not yet" on 2026-11-24. The Railway dashboard steps and the Anthropic key are the owner's.
3. **The 301 from `issac.toys`** to `https://isaac.toys` is set at Spaceship, by the owner, at deploy.

## Warnings

- Only the S and D synergies are checked; A, B and C are carried over unverified. The About page says so.
- The site uses the game's own sprites, as the desktop app did. The repo is public. The footer and About
  page carry an "unofficial fan project" notice; that is a courtesy, not a licence.
- Never list Railway variables: it prints the Anthropic key.
- A mutation or fail-before script that rewrites source files owns them until it finishes: editing one
  while it runs is undone when the script restores its copy.
