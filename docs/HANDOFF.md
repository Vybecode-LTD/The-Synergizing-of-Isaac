# Handoff — 2026-11-25 (sixth session)

## Current state

- **isaac.toys** is a web app (builder with shareable links, "one pickup away", stat and transformation
  summary, a page per item, trinket and character, the synergy list, own synergies, an AI read inside daily
  caps). Decisions: `docs/decisions/0001` to `0006`.
- **Deployed on Railway** 2026-11-25 (6:07 pm EST, 23:07 UTC) from `main` at `1c536f2`, through the Railway
  connector on the owner's go-ahead. Ids, settings and DNS in `docs/DEPLOY.md`. Live at
  <https://web-production-6d147b3c.up.railway.app>: `app.smoke` 13 of 13 with AI off.
- **Waiting on the owner:** the Anthropic key in Railway (AI is off until then) and the two DNS records at
  Spaceship (`isaac.toys` is not verified yet). Railway deploys every push to `main`; "Wait for CI" is not
  switched on, so merge only on green.
- PR #5 merged (the owner's yes): CI's `docker` job builds the image, runs it as Railway does and smoke-tests
  it; `.webp` and `.woff2` now go out with their types.
- Branch `data/transformations-repentance`, PR #6: decision 0006. Transformations counted as the wiki's
  Repentance lists say (`data/transformations.json`), Repentance+ differences marked, trinkets counted.
- The four merged branches are deleted. **The desktop app is untouched.**

## Owner decisions this session (2026-11-25)

1. Deploy this session after the Docker check; set Railway up through the connector. Done.
2. Transformations: Repentance, with what counts only in Repentance+ marked (decision 0006).
3. Delete the four merged branches: done. 4. Merge PR #5 without waiting for CodeRabbit (not a data PR).

## Verified this session

- Web: lint, types, 143 tests with coverage, design audit, both role-pair checks. API: 119 tests, 99%;
  ruff, format, mypy; parity current; `validate` 0 problems. Rendered contrast on the builder and a
  trinket page: 0 failing in 4 states. Fail-before for both PRs' fixes: `docs/TESTING.md`.
- The deploy log shows the Dockerfile's stages, the `/data` volume mounted and the healthcheck passing.

## Not verified

- With the key: `app.smoke --ai on`, the limit behind Railway's edge (DEPLOY check 3) and the cache
  surviving a redeploy (check 4). `ClaudeAnalyzer` has never made a real model call.
- `isaac.toys` itself, until the DNS is in. PR #6 is not live until it merges.

## Next steps, in order

1. When the owner says the key is in: `app.smoke <live> --ai on --indexable --site-url https://isaac.toys`,
   then DEPLOY checks 3 and 4 (check 3 spends about five analyses).
2. PR #6: green CI, then wait for CodeRabbit (a data PR), then the owner's yes to merge. Check
   `/items/infestation` live after it deploys.
3. When the DNS verifies: `app.smoke https://isaac.toys ...`, then Search Console and Bing (check 5).
4. A browser end-to-end smoke test; split the data out of the main bundle (Vite warns at 500 kB); item
   names that follow the tracker's older spellings ("1UP", "Number two").

## Warnings

- `tokens.css` writes the dark roles twice; edit both (the test catches drift). `check_roles.py` reads only
  the `[data-theme="dark"]` copy.
- Never list Railway variables: it prints the Anthropic key.
- A mutation or fail-before script that rewrites source files owns them until it finishes.
- Merging a PR before CodeRabbit's check finishes cancels its review for good; wait for it on data PRs.
- The wiki's "Seraphim" and "Spider Baby" titles redirect to the items; the transformations are
  "Seraphim (Transformation)" and "Spider Baby (Transformation)".
- The site uses the game's own sprites; the footer and About page say it is an unofficial fan project.
