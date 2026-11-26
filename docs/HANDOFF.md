# Handoff — 2026-11-26 (seventh session)

## Current state

- **isaac.toys is live with AI on**, on Railway from `main` at `ceafe70` (PR #8, merged 8:18 am EST,
  13:18 UTC; deployment `04e3dc97`, status SUCCESS). Ids, settings and checks: `docs/DEPLOY.md`.
- **Deploy checks 1 to 5 have passed.** Check 5: the owner submitted the sitemap to Google and Bing (said
  2026-11-26). Check 3's other-network half is still unproven: the owner said "Not now" (2026-11-26).
- Branch `feat/e2e-and-footer`, **PR #9**:
  - A browser end-to-end test, `web/e2e/` (Playwright 1.65, pinned), run by CI's `docker` job against
    the image Railway builds. It has 13 tests and fails on any console error, which is how a CSP refusal
    shows. It never asks for an AI read.
  - A footer credit, "Built by CarbonDSP for the TBOI community." (owner's request), linked to
    `https://carbondsp.com/`, above the unchanged unofficial notice.
  - `dev plans/tools/check_header.mjs` is removed: all its checks are in `web/e2e/site.e2e.ts`.
- Merged branches still on GitHub: `ci/docker-smoke`, `data/transformations-repentance`,
  `docs/deploy-checks-and-handoff`, `fix/home-link-and-theme-switch`. **The desktop app is untouched.**

## Verified this session

- Web: 158 tests, lint, types, design audit, role pairs 100 of 100 and 70 of 70.
- `npm run e2e` against the local build: 13 of 13. Against the live site (still the old footer), exactly the
  six footer checks failed and the other seven passed.
- Controls, each red: a no-op `theme.js` fails the theme test; a skipped test or no matching test fails the
  run; a planted `console.error` and an inline script the CSP refuses both fail their tests.
- Rendered contrast with the theme switch: the builder and Brimstone's page, 0 failing in 8 states each.
  Footer screenshots looked at in light at 1440px and dark at 390px.
- Details: `docs/TESTING.md`, "Browser end-to-end test and footer credit".

## Not verified

- The CI browser step had not run when this was written: read `gh pr checks 9`. The API was not changed and
  not re-run here; CI runs it.
- The footer on the live site: after PR #9 merges and deploys, `SITE=https://isaac.toys npm run e2e` must
  pass 13 of 13.

## Next steps, in order

1. PR #9: green CI (the `docker` job now includes the browser step), let CodeRabbit finish, then ask the
   owner to merge. Merging deploys. Then run the e2e suite against the live site.
2. Split the data out of the main bundle (Vite warns at 500 kB).
3. The tracker's older item names ("1UP", "Number two"): rename only on the owner's word.

## Waiting on the owner

1. Merge PR #9? 2. Delete the four merged branches? 3. Switch on Railway's "Wait for CI"? 4. Rename the
   older item names? 5. Check 3's other-network half (costs one analysis; "Not now" on 2026-11-26).

## Warnings

- Never list Railway variables: it prints the Anthropic key. Every push to `main` deploys.
- `tokens.css` writes the dark roles twice; edit both. A saved theme is applied twice too:
  `web/public/theme.js` and `applyTheme`.
- Locally the e2e suite drives the installed Chrome (Playwright can't download browsers here). Restart the
  8001 server after every `npm run build`.
- Merging a PR before CodeRabbit's check finishes cancels its review for good.
