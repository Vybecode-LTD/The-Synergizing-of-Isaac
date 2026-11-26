# Handoff — 2026-11-26 (sixth session, second day)

## Current state

- **isaac.toys is live with AI on**, on Railway from `main` at `0da6fb7` (PRs #6 and #7 merged 2026-11-26,
  7:30 am EST, 12:30 UTC). Ids, settings, DNS and the deploy checks: `docs/DEPLOY.md`. Checks 1 to 4 have
  passed; check 5 (submit the sitemap) is the owner's.
- PR #6: transformations counted as Repentance does, Repentance+ marked (decision 0006). Live:
  `/items/infestation` says "Counts toward: Beelzebub (Repentance+ only)".
- PR #7: a light/dark switch in the header (decision 0005 amended), the logo goes home to an empty builder,
  an original favicon (a wind-up toy block, not a game character), and CodeRabbit's five findings in PR #6's
  smoke checker, validator and deploy notes.
- Branch `docs/deploy-checks-and-handoff`, PR #8: this handoff, the deploy-check results and the starting
  prompt. Docs only.
- Merged branches still on GitHub: `ci/docker-smoke`, `data/transformations-repentance`,
  `fix/home-link-and-theme-switch`. **The desktop app is untouched.**

## Owner decisions this session (2026-11-26)

1. A light/dark switch, and the logo should go home ("doesn't go to the home page"). Done in PR #7.
2. Favicon: not Isaac (the site's icon must not borrow the game's art or look official); an original
   mascot instead ("Yes, design one").
3. Merge PRs #6 and #7 ("merge"); run the paid deploy checks 3 and 4 ("Run them"). Both done.

## Verified this session

- Live: `app.smoke https://isaac.toys --ai on --indexable` 12 of 12; a real-Chrome header check 19 of 19
  (switch, no light flash on reload, logo, Back, phone layout, no CSP refusals); the favicon served.
- Check 3: two fresh analyses, then 429 `rate_limited`; forged headers refused. Railway's HTTP log showed the
  three earlier analyses that day were the owner's own. Check 4: a saved answer survived a redeploy.
- Web 157 tests, API 131, lint, types, design audit, role pairs, `validate`. Fail-before and mutation
  evidence: `docs/TESTING.md`.

## Not verified

- That a visitor on another network gets their own five analyses (one analysis from a phone on mobile data
  would show it). Codex's review of PR #7 had not reported when it merged.

## Next steps, in order

1. PR #8: green CI, then the owner's yes to merge (docs only; merging deploys again).
2. Check 5: the owner submits `https://isaac.toys/sitemap.xml` to Google Search Console and Bing.
3. A browser end-to-end smoke test in CI (start from `dev plans/tools/check_header.mjs`); split the data out
   of the main bundle (Vite warns at 500 kB); the tracker's older item names ("1UP", "Number two").

## Warnings

- Never list Railway variables: it prints the Anthropic key. Every push to `main` deploys.
- `tokens.css` writes the dark roles twice; edit both. A saved theme is applied twice too:
  `web/public/theme.js` and `applyTheme`; one test runs both.
- An SVG comment must not contain `--`: the file stops being XML and draws nothing.
- Merging a PR before CodeRabbit's check finishes cancels its review for good; wait for it on data PRs.
- The GitHub API allows 5,000 calls an hour across every tool; it ran out once this session.
