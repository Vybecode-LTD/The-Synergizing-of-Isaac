# Handoff — 2026-11-26 (seventh session)

## Current state

- **isaac.toys is live with AI on**, on Railway from `main` at `7a494aa`: PR #10 merged with the owner's yes
  ("Yes, when green") at 11:24 am EST (16:24 UTC). Deployment `db828f7f`, status SUCCESS.
  Ids, settings and checks: `docs/DEPLOY.md`.
- Live from this session:
  - PR #9: the browser end-to-end test in CI's `docker` job (`web/e2e/`, Playwright 1.65, 13 tests).
  - PR #10: the game data and the libraries in chunks of their own. The entry is 57 kB, `vendor` 257 kB
    and `data` 317 kB; it was one 631 kB file. `npm run bundle:check` holds the layout, reading which
    modules each chunk holds from a report the build writes (`node_modules/.cache/isaac-toys/chunks.json`).
  - The footer: the CarbonDSP brandmark beside "Built by CarbonDSP for the TBOI community.", the unofficial
    notice and the About link. It uses the kit's **reverse** version, because the primary's black C
    vanishes on the dark band (decision 0007).
- **AI: 10 fresh analyses per visitor per day** since 2026-11-26, 11:16 am EST: the owner's request, set as
  `AI_PER_VISITOR_PER_DAY=10` on Railway. The site cap stays 200. Decision 0003 is amended.
- Branch `docs/ai-limit-10`, **PR #11** (docs and a tool only): the limit change in `docs/DEPLOY.md`,
  decision 0003 and `dev plans/tools/limit_check.py` (now expects 10 and stops if the site says otherwise),
  plus this handoff.
- Deploy checks 1 to 5 have passed; check 3's other-network half is unproven ("Not now", 2026-11-26).
- Merged branches still on GitHub: `ci/docker-smoke`, `data/transformations-repentance`,
  `docs/deploy-checks-and-handoff`, `fix/home-link-and-theme-switch`, `feat/e2e-and-footer`,
  `perf/split-data-chunk`. **The desktop app is untouched.**

## Verified this session

- Live after PR #10's deploy: `SITE=https://isaac.toys npm run e2e` 13 of 13, the logo checks at both
  widths included; `app.smoke --ai on --indexable` 12 of 12; the live entry is `index-DtZjIYEO.js`, the same
  file as the local build. The footer screenshots were sent to the owner.
- Limit: the running container's settings read `per_visitor_per_day 10`, `site_per_day 200`, after the
  variable change and again after PR #10's deploy (Railway SSH, printing only those two numbers).
- CodeRabbit reviewed PR #10 three times. Each finding was real and red before its fix: a data file in
  the entry, a prefetch link, and `meta.json` sharing its text with `about.json`. The membership check
  failed a real build with `meta.json` outside the data chunk. Codex had no findings.
- Web 166 tests, lint, types, design audit, role pairs; rendered contrast 0 failing in 8 states. Evidence:
  `docs/TESTING.md`.

## Not verified

- No paid analysis was run to show the limit of 10 in action; the settings check stands in for it.
- The browser test runs in Chromium only; the AI panel, the own-synergy dialog and the filters are covered
  in jsdom only.

## Next steps, in order

1. PR #11: CI, then CodeRabbit (it keeps hitting its free limit; `@coderabbitai review` posts as the owner,
   so ask first), then ask the owner to merge. It is docs only, but merging still redeploys.
2. The tracker's older item names ("1UP", "Number two"): rename only on the owner's word.

## Waiting on the owner

1. Merge PR #11? 2. Delete the six merged branches? 3. Switch on Railway's "Wait for CI"? 4. Rename the
   older item names? 5. Check 3's other-network half (now up to 12 paid analyses; "Not now" on 2026-11-26).

## Warnings

- Never list Railway variables: it prints the Anthropic key. Every push to `main` deploys.
- The footer brandmark is the reverse version on purpose (decision 0007).
- `tokens.css` writes the dark roles twice; edit both. A saved theme is applied twice too:
  `web/public/theme.js` and `applyTheme`.
- Locally the e2e suite drives the installed Chrome; restart the 8001 server after every `npm run build`.
- Merging a PR before CodeRabbit's check finishes cancels its review for good, and a green CodeRabbit check
  can read "Review rate limited": read its title on the head commit.
