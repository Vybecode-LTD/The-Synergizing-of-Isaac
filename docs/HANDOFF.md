# Handoff — 2026-11-27 (eighth session, in progress)

## In progress

- **PR #12, branch `feat/synergy-submissions`: open, not merged.** Synergy submissions (by hand and from
  the AI read's "Synergies found"), an admin inbox at `/admin` where **Publish puts a synergy live at once**
  as Community (SQLite, no deploy), a weekly backup Action to `backup/community`, and the AI read as JSON in
  sections (light and deep blue cards). Decision 0008; contract `dev plans/contracts/synergy-submissions.md`;
  evidence and gaps in `docs/TESTING.md`. Local: web 194, API 237, every design gate, rendered contrast 0
  failing with a control. The browser test passed 15 of 15 before the live-publishing step; after it,
  Playwright's Chrome on this PC stopped loading any network page (the live site too), so CI's run is the
  proof for that last step.
- **Before merging, the owner:** sets `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` on Railway (steps in
  `docs/DEPLOY.md`, "The synergy inbox"). The first paid analysis after deploy is the first real proof the
  JSON schema is accepted by the model.

## State at the seventh session's close

- **isaac.toys is live with AI on**, on Railway from `main` at `8c59906`: PR #11 merged with the owner's
  yes at 1:39 pm EST (18:39 UTC, 2026-11-27). Deployment `be23bd88`, status SUCCESS. No PR is open.
  Ids, settings and checks: `docs/DEPLOY.md`.
- Merged and live this session (each on green CI, after a real CodeRabbit review):
  - **#8** (docs): deploy checks and the sixth session's handoff.
  - **#9**: the browser end-to-end test in CI's `docker` job (`web/e2e/`, Playwright 1.65, 13 tests),
    and the footer credit "Built by CarbonDSP for the TBOI community.", linked to carbondsp.com.
  - **#10**: the game data and the libraries in chunks of their own (entry 57 kB, `vendor` 257 kB, `data`
    317 kB; it was one 631 kB file). `npm run bundle:check` holds it from the build's chunk report. The
    CarbonDSP brandmark sits beside the footer's three lines, using the kit's reverse version (decision 0007).
  - **#11** (docs and a tool): the AI limit change, and `dev plans/tools/limit_check.py` with a
    `--self-test`.
- **AI: 10 fresh analyses per visitor per day** (owner, 2026-11-26), `AI_PER_VISITOR_PER_DAY=10` on Railway;
  the site cap stays 200. Decision 0003 is amended.
- Deploy checks 1 to 5 have passed (check 5: the owner submitted the sitemap to Google and Bing). Check 3's
  other-network half is unproven ("Not now", 2026-11-26).
- Checkout: `main`, in sync with `origin/main`. **Uncommitted on purpose:** this file and
  `dev plans/NEXT_SESSION_PROMPT.md`, refreshed after #11 merged.
- Merged branches, on GitHub and local: `ci/docker-smoke`, `data/transformations-repentance`,
  `docs/deploy-checks-and-handoff`, `fix/home-link-and-theme-switch`, `feat/e2e-and-footer`,
  `perf/split-data-chunk`, `docs/ai-limit-10`. **The desktop app is untouched.**

## Verified at the close (2026-11-27, after #11's deploy)

- `SITE=https://isaac.toys npm run e2e`: 13 of 13, none skipped (the brandmark checks included).
- `app.smoke https://isaac.toys --ai on --indexable`: 12 of 12.
- The running container's settings read `per_visitor_per_day 10`, `site_per_day 200` (Railway SSH, only
  those two numbers printed).
- Earlier in the session: web 166 tests, lint, types, design audit, role pairs, rendered contrast 0 failing;
  every review finding red before its fix. Evidence: `docs/TESTING.md`.

## Not verified

- No paid analysis was run to show the limit of 10 at work; the settings check stands in for it.
- The browser test runs in Chromium only. The AI panel, the own-synergy dialog and the filters are covered
  in jsdom only.

## Next steps (the owner picks)

1. The tracker's older item names ("1UP", "Number two"): rename only on the owner's word, at the source.
2. Candidates, none started: a browser test of the AI panel with AI off (free in CI, which has no key);
   Firefox or WebKit in the browser test.

## Waiting on the owner

1. Delete the seven merged branches? 2. Switch on Railway's "Wait for CI"? 3. Rename the older item names?
4. Check 3's other-network half (up to 12 paid analyses)?

## Warnings

- Never list Railway variables: it prints the Anthropic key. Every push to `main` deploys.
- The owner has a Reddit announcement draft (2026-11-26) saying the AI is free up to 10 uses a day; a limit
  change would make it wrong.
- The footer brandmark is the reverse version on purpose (decision 0007).
- CodeRabbit's free tier rate-limits often: a green check can read "Review rate limited". Read its title
  on the head commit; `@coderabbitai review` posts as the owner, so ask each time.
- `tokens.css` writes the dark roles twice; edit both. Restart the 8001 server after every `npm run build`.
