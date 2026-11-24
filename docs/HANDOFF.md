# Handoff — 2026-11-24 (second session)

## Current state

- **The project is a web app, `issac.toys`:** builder with shareable links, "one pickup away" suggestions,
  stat and transformation summary, pages for all 719 items, 188 trinkets and 34 characters, the full synergy
  list, own synergies kept in the browser, and an AI read paid by the site inside daily caps. Decisions:
  `docs/decisions/0001` to `0004`.
- **Branch `feat/web-app`** on top of `main` (`a99151e`). PR `Vybecode-LTD/The-Synergizing-of-Isaac#1`, not
  merged, auto-fix on, auto-merge off. Its head and CI: `dev plans/NEXT_SESSION_PROMPT.md` section 3.
- **This session reviewed the whole PR** (API, deploy files, the web app's logic; not the CSS, the generated
  data or the vendored design scripts) and fixed all 15 findings with tests. CodeRabbit has never reviewed
  it: it skips pull requests over 100 files, and this one has 131. Codex reviewed the first push only.
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
  data validator (0 problems) and parity snapshot clean.
- Every new test was red before its fix. 13 of 13 mutations on the API fixes were caught.
- In a real browser (dev server on 5273): Builder link and logo keep the build; Clear all stays cleared
  after a fresh load; adding from an item page, Back and Forward work; `/Items` is the not-found page.
- The model call's parameters were checked against the `claude-api` skill: `output_config.effort`, the
  refusal fallback's beta name and `"default"` form, and the five models that accept it.

## Not verified

- **The over-long-name 500** needs Python 3.12 on Linux. The test forces the same error by hand and CI
  runs a real 300-character address.
- **Railway's edge overwriting `X-Forwarded-For`** is taken from another project. Post-deploy check 5
  proves or disproves it; until then the per-visitor limit behind Railway is an assumption.
- **Rendered contrast was not re-run:** no CSS or markup changed this session. The gaps listed last time
  stand (character dialog at 390 wide, search dropdown, the hover pass on `/items` and `/trinkets`, two
  small CSS changes made after the gate ran).
- **`Dockerfile`:** never built (no Docker here). **`ClaudeAnalyzer`:** only against a stub.
- **Core Web Vitals:** not measured. The JS bundle is 621 kB (169 kB gzipped) because it carries the data.

## Next steps, in order

1. Owner decisions below, then merge PR #1 on the owner's word.
2. Deploy on the owner's go-ahead, following `docs/DEPLOY.md`, then run its seven post-deploy checks.
3. Verify the 458 synergies against the game or the wiki, starting with the S and D ratings.
4. Add a browser end-to-end smoke test and a Docker build to CI.
5. Split the data out of the main bundle and measure Core Web Vitals on the live site.

## Open decisions for the owner

1. **Spelling of the domain.** The game is "Isaac"; `isaac.toys` was free on 2026-11-24 (`decisions/0002`).
2. **Model and caps for the AI read** (`decisions/0003`): Opus 5.5 at about 2 cents an analysis is the
   default; Sonnet 5.5 is about half; Haiku 5.5 is under a tenth of a cent.
3. **Will Cloudflare proxy the domain?** If yes, the app first needs a check that a request really came
   through Cloudflare (`docs/DEPLOY.md`, "Before choosing Cloudflare mode"): without it the per-visitor
   limit can be dodged by connecting to Railway directly.
4. **Retire the desktop app,** or keep it in the repo?

## Warnings

- The synergy descriptions and ratings are carried over unverified. The About page says so.
- The site uses the game's own sprites, as the desktop app did. The repo is public. The footer and About
  page carry an "unofficial fan project" notice; that is a courtesy, not a licence.
- Never list Railway variables: it prints the Anthropic key.
- A mutation or fail-before script that rewrites source files owns them until it finishes: editing one
  while it runs is undone when the script restores its copy.
