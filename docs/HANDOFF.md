# Handoff — 2026-11-24

## Current state

- **The project is now a web app, `issac.toys`,** built this session: builder with shareable links,
  "one pickup away" suggestions, stat and transformation summary, pages for all 719 items, 188 trinkets and
  34 characters, the full synergy list, own synergies kept in the browser, and an AI read paid by the site
  inside daily caps. Decisions: `docs/decisions/0001` to `0004`.
- **Game data was rebuilt from sources** (`data/README.md`). The old item list had scrambled IDs and gaps.
- **Branch `feat/web-app`,** three commits on top of `main` (`a99151e`), pushed once.
  PR: `Vybecode-LTD/The-Synergizing-of-Isaac#1` (predicted number; check with `gh pr list`).
- **Nothing is deployed.** No Railway project exists for this repo. No real model call has been made.
- **The desktop app is untouched** and still builds with 0 warnings (`dotnet build`, checked today).

## Verified today (commands and results in `docs/TESTING.md`)

- Web: 109 tests, 98.6% lines; lint, types and design audit clean. API: 67 tests, 99%; ruff and mypy clean.
- Mutation check on the API: 8 of 8 deliberate breaks caught.
- Built site run locally on port 8001: every public route answers real HTML with one `h1`; unknown
  addresses answer 404; the browser's titles matched the server's on nine routes.
- Rendered contrast (axe on real Chrome, 1440 and 390 wide, hover included): clean on `/`, a full build,
  item, character, characters list, About, 404; the add-synergy dialog, the expanded suggestions, the
  character prompt, and the synergy list with each rating filter pressed (30 states in all).

## Not verified, or verified another way

- **Character dialog at 390 wide:** the gate returned six labels "undecided" because the dialog scrolls and
  cuts them at its edge. Measured directly from computed styles instead: all 38 labels are 8.64:1 or better.
  At 1440 the same dialog passes the gate.
- **Search dropdown:** not reachable by the gate (needs typing). Measured directly: lowest 6.3:1.
- **`/items` and `/trinkets` hover pass:** stopped after 15 minutes (it hovers all 719 tiles). The same
  tile component passed on `/characters`.
- **Two small CSS changes after the gate ran** (character grid three across on phones, centred names).
- **`Dockerfile`:** never built (no Docker here). **`ClaudeAnalyzer`:** only against a stub.
- **Core Web Vitals:** not measured. The JS bundle is 620 kB (168 kB gzipped) because it carries the data.

## Next steps, in order

1. Review PR #1 with the owner; fix anything CI or the reviewers raise. Merge only on the owner's word.
2. Deploy on the owner's go-ahead, following `docs/DEPLOY.md`, then run its seven post-deploy checks.
3. Verify the 458 synergies against the game or the wiki, starting with the S and D ratings.
4. Add a browser end-to-end smoke test and a Docker build to CI.
5. Split the data out of the main bundle and measure Core Web Vitals on the live site.

## Open decisions for the owner

1. **Spelling of the domain.** The game is "Isaac"; `isaac.toys` was free on 2026-11-24 (`decisions/0002`).
2. **Model and caps for the AI read** (`decisions/0003`): Opus 5.5 at about 2 cents an analysis is the
   default; Sonnet 5.5 is about half; Haiku 5.5 is under a tenth of a cent.
3. **Will Cloudflare proxy the domain?** It decides `CLIENT_IP_HEADER`.
4. **Retire the desktop app,** or keep it in the repo?

## Warnings

- The synergy descriptions and ratings are carried over unverified. The About page says so.
- The site uses the game's own sprites, as the desktop app did. The repo is public. The footer and About
  page carry an "unofficial fan project" notice; that is a courtesy, not a licence.
- Never list Railway variables: it prints the Anthropic key.
