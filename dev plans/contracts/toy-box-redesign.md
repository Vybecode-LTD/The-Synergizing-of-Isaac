---
feature: Toy Box redesign
status: built (PR #3, not merged)
approved: 2026-11-25 (owner: "Approve it")
plan: dev plans/design-directions/README.md (palettes, fonts, boards) and docs/decisions/0005-toy-box-design.md
pr: "#3 (predicted)"
---

# Contract: Toy Box redesign

## 1. Goal
Every page of isaac.toys wears the Toy Box look the owner picked (decision 0005): the same pages, copy and
behaviour as today, in light and dark Toy Box themes that follow the visitor's system setting.

## 2. Interfaces
No component, prop, route, API or data shape changes. What changes is named here exactly:
- **Fonts:** `web/src/main.tsx` imports `@fontsource-variable/bricolage-grotesque` and
  `@fontsource-variable/figtree` in place of `@fontsource-variable/inter` and `@fontsource-variable/fraunces`
  (both removed from `web/package.json`). `--font-display: "Bricolage Grotesque Variable", …`;
  `--font-sans: "Figtree Variable", …`. `--font-mono` unchanged.
- **Tier 1 colour** (`tokens.css` §5), OKLCH ramps keep their names: `--neutral-*` becomes chalk to ink
  (cool, hue ≈ 270); `--accent-*` becomes tomato (button fill `#C93A17`); `--warning-*` sun (`#FFC21A`),
  `--success-*` mint (`#2FCB8E`), `--info-*` pool (`#1F5FE0`); new ramp `--grape-*` (`#6B3FD4`).
- **New Tier 2 roles** (`tokens.css`): `--border-ink`, `--stroke-ink` (3px), `--shadow-offset-sm`,
  `--shadow-offset-md`, `--shadow-offset-lg` (hard, unblurred, in `--border-ink`), and per rating
  `--bg-tier-{s,a,b,c,d}` as solid sticker fills with `--fg-on-tier-{s,a,b,c,d}`. Existing `--fg-tier-*`
  stay for text. `--elevation-card` and `--elevation-raised` point at the offset shadows.
- **Themes:** light roles on `:root`; dark roles under `@media (prefers-color-scheme: dark)` on
  `:root:not([data-theme="light"])` and on `[data-theme="dark"]`. `web/index.html` drops the hard-coded
  `data-theme="dark"` and sets `<meta name="color-scheme" content="light dark">` plus two `theme-color` metas
  with `media` queries. Dark values are designed in the build and must pass the same gates.
- **Motion:** `@keyframes` for the item page's quality sticker in `components/detail.css`, off under
  `prefers-reduced-motion`.
- **Share image:** `web/scripts/build-og.mjs` reads the counts from `data/` (items, trinkets, characters,
  synergies) and draws the Toy Box look; `npm run og -- isaac.toys` regenerates `web/public/og.png`.

## 3. Data
None.

## 4. Files
`web/src/styles/tokens.css`, `base.css`, `layout.css` where they read roles, and every file in
`web/src/styles/components/`; `web/src/main.tsx`; `web/index.html`; `web/package.json` and its lock file;
`web/scripts/build-og.mjs`, `web/public/og.png`; `docs/TESTING.md` (results), `CLAUDE.md` Current state.

## 5. Conventions this follows
`CLAUDE.md` rule 4 (tokens or nothing; Tier-2 roles in components), the `web-design-studio` audit
(`npm run design:audit`), `scripts/design/check_roles.py`, the rendered-contrast gate in the
`verify-real-pass` skill, and the boards `dev plans/design-directions/canvas/Toy*.dc.html` as the reference.

## 6. Non-goals
- No change to page structure, copy, routes, data, the API or what any control does.
- No new pages, no CSS framework, no component library.
- The other two directions are not kept as themes.
- The A, B and C synergy check, deploying and the desktop app are separate work.

## 7. Acceptance
- `npm run check` green (lint, typecheck, all tests); `.venv\Scripts\python -m app.parity --check` passes.
- `npm run design:audit` clean in strict mode; `check_roles.py web/src/styles/tokens.css` passes every pair,
  light and dark.
- Rendered-contrast gate passes in every state, both themes, on the builder (empty and with a build),
  an item page, a trinket page, a character page, the synergy list, About and the 404.
- At 1440 px and 390 px the builder, item page and synergy list match the Toy boards: eight pickups on one
  row at 1440, two per row at 390, nothing wider than the screen.
- `og.png` shows the counts `data/` holds at build time.

## 8. Open questions
None left: theme, share image and motion were answered on 2026-11-25 (decision 0005).

## Changes after approval

Made while building, 2026-11-25. None changes a route, a prop, the data or what a control does.

1. **The builder is one column, in CSS only.** The title sits beside the search box, the tray of tiles takes
   the full width (eight across at 1440, two at 390), and the stat changes and transformations are two cards
   under the tray instead of an aside beside the synergies: moving them there needs a markup change, which
   §6 rules out. Their cards come after the actions on screen (`order`), and hold nothing focusable.
2. **Elevation roles, not `--shadow-offset-*`, in components.** The design audit (L6) treats `--shadow-*` as
   Tier 1, so components read `--elevation-sticker` (new), `--elevation-card` and `--elevation-raised`,
   which point at the offset shadows. `--elevation-well` (new) is the tray's moulded lip.
3. **The dark Toy Box's ink line is chalk** (`--border-ink` = `--neutral-200`), so its outlines and offset
   shadows stay visible on navy, and the stickers keep their colours. New roles beside it: `--bg-ink` and
   `--fg-on-ink` (the filled nav pill, the remove button), `--bg-feature` (sun tile, art frame),
   `--bg-spotlight` (the AI panel), `--bg-band` (footer), `--bg-up`, `--bg-down`, `--bg-trinket`.
   The dark roles are written twice as §2 says; `web/src/styles/tokens.test.ts` fails if the copies drift.
4. **The role pairs the starter's list does not know** (stickers, feature, spotlight, band, ink, tints,
   outlines) are in `scripts/design/toy-box-pairs.json`, checked by `check_roles.py --pairs` in CI too.
5. **`og.png` is drawn in the installed Chrome**, from `web/scripts/og-card.mjs` (tested by
   `og-card.test.mjs`): sharp could not load the site's woff2 fonts and fell back to a slab face.
6. **The quality sticker is the existing `.entity__quality`** (pips and "Quality 4") in the item's meta row,
   tomato and tilted; the board puts it on the art frame, which would need markup.
7. **Small hooks:** `.sprite` and `.portrait` read `--sprite-zoom` (whole numbers) so tiles show 128px art;
   `.icon-button` reads `--icon-button-fg`, `-bg`, `-bg-hover` and `-border`; `.rating` reads
   `--rating-tilt`. The wordmark's pixel glyph is hidden (the board's wordmark is the word alone).
8. **`api/app/main.py`'s fallback HTML** (tests and API-only runs) drops `data-theme="dark"` like `index.html`.
9. **Two fixes from the rendered-contrast gate:** the dialog's panel carries its own ground (its words spilled
   onto the footer when the gate unclipped its scroll), and the nav pads itself so the focus ring, now
   outside the pill, is not clipped by its sideways scroll box.
