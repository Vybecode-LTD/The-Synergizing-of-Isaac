# Handoff — 2026-11-26 (seventh session)

## Current state

- **isaac.toys is live with AI on**, on Railway from `main` at `703fd94`: PR #9 merged with the owner's yes
  ("Yes, when green") at 9:32 am EST (14:32 UTC), on green CI. CodeRabbit had no actionable comments and
  Codex posted none. Deployment `7ae5af93`, status SUCCESS. Ids, settings and checks: `docs/DEPLOY.md`.
- PR #9 added a browser end-to-end test, `web/e2e/`: Playwright 1.65, pinned, 13 tests, run by CI's
  `docker` job against the image Railway builds. Any console error fails a test, which is how a CSP
  refusal shows; it never asks for an AI read. It also added the owner's footer credit, "Built by
  CarbonDSP for the TBOI community." (linked to `https://carbondsp.com/`), above the unofficial notice.
  `dev plans/tools/check_header.mjs` is gone: its checks are in `web/e2e/site.e2e.ts`.
- **Deploy checks 1 to 5 have passed.** Check 5: the owner submitted the sitemap to Google and Bing (said
  2026-11-26). Check 3's other-network half is unproven: "Not now" (2026-11-26).
- Branch `perf/split-data-chunk`, **PR #10**. `web/vite.config.ts` gives the game data and the libraries
  chunks of their own: entry 57 kB, `vendor` 257 kB, `data` 317 kB (it was one 631 kB file, over Vite's
  500 kB warning). All are preloaded together and cached for a year. A deploy that changes only the app
  now leaves `data` and `vendor` in the browser's cache. `web/scripts/check-bundle.mjs`
  (`npm run bundle:check`) holds the layout in CI; after CodeRabbit's review it checks all eight data files
  and a real `modulepreload` link.
- PR #10 also adds the owner's request: the CarbonDSP brandmark on the left of the footer's three lines. It
  uses the kit's **reverse** version, not the primary the owner named, because the primary's black C
  vanishes on the dark band. Screenshots of both were sent on 2026-11-26. Decision 0007.
- Merged branches still on GitHub: `ci/docker-smoke`, `data/transformations-repentance`,
  `docs/deploy-checks-and-handoff`, `fix/home-link-and-theme-switch`, `feat/e2e-and-footer`.
  **The desktop app is untouched.**

## Verified this session

- Live, after the deploy: `SITE=https://isaac.toys npm run e2e` 13 of 13; `app.smoke https://isaac.toys
  --ai on --indexable` 12 of 12; the live bundle carries the footer.
- CI on PR #9's head `8f055e5`: web, API, Docker (smoke 13 of 13, browser 13 passed, none skipped),
  CodeRabbit, all success.
- Before the merge: web 158 tests, lint, types, design audit, role pairs. Against the old live footer the
  suite failed exactly the six footer checks. Five controls each turned it red. Rendered contrast was 0
  failing in 8 states on two pages. Details: `docs/TESTING.md`.
- PR #10, locally:
  - Web 164 tests, lint, types and the design audit pass; `npm run e2e` 13 of 13 and `app.smoke` 12 of 12 on
    the split build.
  - The bundle check failed the old build for exactly its four reasons. The server keeps the preload links
    on the pages it rewrites.
  - An app-only change renamed only the entry chunk.
  - Brandmark: web 167 tests; `npm run e2e` 13 of 13 locally. Against live (no mark yet) exactly the six
    footer checks failed; with the PNGs removed the test failed. Rendered contrast 0 failing in 8 states.

## Not verified

- PR #10's second push (the review fixes and the brandmark) had not run CI when this was written: read
  `gh pr checks 10`, and CodeRabbit's status on the head (it was rate-limited once). The API is unchanged.
- The browser test runs in Chromium only (no Firefox or Safari), and the AI panel, the own-synergy dialog
  and the filters are checked in jsdom only.

## Next steps, in order

1. PR #10: green CI, let CodeRabbit finish, then ask the owner to merge (merging deploys). After the deploy,
   run `SITE=https://isaac.toys npm run e2e`; the live page should load `data-*.js` and `vendor-*.js`, and
   show the brandmark. The owner's earlier "Yes, when green" was for PR #10 before the brandmark joined it.
2. The tracker's older item names ("1UP", "Number two"): rename only on the owner's word.

## Waiting on the owner

1. Merge PR #10? 2. Delete the five merged branches? 3. Switch on Railway's "Wait for CI"? 4. Rename the
   older item names? 5. Check 3's other-network half (costs one analysis; "Not now" on 2026-11-26).

## Warnings

- Never list Railway variables: it prints the Anthropic key. Every push to `main` deploys.
- `tokens.css` writes the dark roles twice; edit both. A saved theme is applied twice too:
  `web/public/theme.js` and `applyTheme`.
- Locally the e2e suite drives the installed Chrome (Playwright can't download browsers here). Restart the
  8001 server after every `npm run build`.
- Merging a PR before CodeRabbit's check finishes cancels its review for good.
