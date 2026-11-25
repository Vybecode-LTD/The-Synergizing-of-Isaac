# Handoff — 2026-11-25 (fourth session)

## Current state

- **isaac.toys** is a web app (builder with shareable links, "one pickup away", stat and transformation
  summary, a page per item, trinket and character, the synergy list, own synergies, an AI read inside daily
  caps). Decisions: `docs/decisions/0001` to `0005`. **Nothing is deployed**; no Railway project exists.
- **PR #2** (every S and D synergy checked against the wiki for Repentance; the list is 453) is open and
  green, waiting for the owner. Record: `data/synergy-checks.md`. A, B and C entries are not checked.
- **PR #3, the Toy Box redesign** (decision 0005), was built this session on `feat/toy-box`, **stacked on
  #2** at the owner's choice: it lists #2's commits until #2 is merged. Heads and CI:
  `dev plans/NEXT_SESSION_PROMPT.md` §3. Contract and the eight changes made while building:
  `dev plans/contracts/toy-box-redesign.md`.
- **The desktop app is untouched.**

## What the redesign is

- Light Toy Box by default; a dark Toy Box (navy ground, chalk ink line, same stickers) follows the system
  setting; `data-theme="light"`/`"dark"` on `<html>` pins one. Fonts: Bricolage Grotesque and Figtree,
  self-hosted. CSS only: no component, route, prop or data changed.
- The builder is one column: title beside the search box, the tray (eight tiles across at 1440, two at
  390), actions, then stat changes and transformations as two cards, then synergies in two columns.
- The item page's quality sticker wobbles, still under reduced motion. `og.png` is redrawn in Chrome with
  the counts read from `data/` (`npm run og -- isaac.toys`; `web/scripts/og-card.mjs`).

## Verified this session (commands and results in `docs/TESTING.md`)

- Web: 125 tests, 98.6% lines; lint, types, build, design audit (63 files) clean. Role pairs: 100 of 100
  built-in, 70 of 70 Toy Box pairs (`scripts/design/toy-box-pairs.json`, now also in CI). API: 81 tests,
  99%; ruff, mypy, parity snapshot clean.
- New tests: `web/src/styles/tokens.test.ts` (the two dark copies agree; no undeclared custom property)
  and `web/scripts/og-card.test.mjs` (the card prints `data/`'s counts). Each gate was shown to fail on a
  broken copy first.
- Compared with the Toy boards at 1440 and 390 by full-page screenshots: eight tiles on one row at 1440,
  two per row at 390, nothing wider than the screen on any page, light and dark.
- Rendered contrast on the built site (axe in Chrome, 1440 and 390, light and dark, every control
  hovered): 0 failing on the builder with a build (12 states: "Show all 66", the AI error card), item,
  trinket, character, synergy list (24 states, the rating toggles), About and 404. The empty builder's
  character dialog first failed at 1440 (its words spilled past the dialog's white box onto the ink footer
  when the gate unclipped the scroll); the dialog panel now carries its own ground. At 390 the gate still
  calls the Tainted row "undecided", because it unclips the dialog below a 900px viewport; in a 3200px
  viewport, where the dialog does not scroll and all 34 options are in view, it passes 8 of 8 states.
  The AI answer state (response faked in the test browser) passes in all four views; a broken colour fails.
- After CodeRabbit's review: pressed toggles are now filled in ink (the synergy list passes 24 states,
  hovered in every state). The search dropdown (typed, then an option picked by arrow key) and the
  add-your-own-synergy dialog (open, then a rating chosen) pass in 16 states; what axe left undecided
  (an ellipsis-cut effect line, the nav's last link at 390, the dialog's text box) measures 10.6:1 or
  better from its real colours, and a broken colour fails the same script.
- Focus rings checked on the tile, remove button, search box, AI button and nav, light and dark.

## Not verified

- The canvas boards themselves were not re-opened (no claude.ai sign-in in the app's browser); screenshots
  were compared with the board sources.
- CI on the pushed head: see the starting prompt. `Dockerfile` never built (no Docker here).
- Core Web Vitals not measured. The Latin fonts are about 97 kB of woff2 (Bricolage 77, Figtree 20); the
  other subsets load only for their characters.

## Next steps, in order

1. Owner: merge #2, then #3 (#3 shrinks to its own commits once #2 is in).
2. Deploy on the owner's go-ahead ("not yet" on 2026-11-24): `docs/DEPLOY.md`, then its seven checks.
3. Check the A, B and C synergies the same way (`technology+c-azazel` and
   `brimstone+lord-of-the-pit+the-pact` already look wrong).
4. A browser end-to-end smoke test and a Docker build in CI; split the data out of the main bundle.

## Waiting on the owner

1. Merge PR #2, then PR #3? 2. Deploy? 3. The 301 from `issac.toys` (at Spaceship, at deploy).

## Warnings

- `tokens.css` writes the dark roles twice; edit both (the test catches drift). `check_roles.py` reads only
  the `[data-theme="dark"]` copy.
- Never list Railway variables: it prints the Anthropic key.
- A mutation or fail-before script that rewrites source files owns them until it finishes.
- The site uses the game's own sprites; the footer and About page say it is an unofficial fan project.
