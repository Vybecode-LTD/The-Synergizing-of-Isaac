# 0005 — The site's look is Toy Box

**Date:** 2026-11-25 · **Decided by:** owner ("I love the toybox theme"; then, by AskUserQuestion: "Light plus
a dark Toy Box", "Yes, redraw it", "Keep the wobble")

**Decision.** isaac.toys is restyled in direction B, Toy Box: a chalk ground, ink outlines with hard offset
shadows, tomato, sun, pool, mint and grape colours, Bricolage Grotesque for display and Figtree for text,
pickups as plastic tiles in a tray, ratings as die-cut stickers. The reference boards are on the design
canvas and in `dev plans/design-directions/canvas/Toy*.dc.html`; palettes are in
`dev plans/design-directions/README.md`.

- **Themes:** light (the boards) and a dark Toy Box (ink-navy ground, the same stickers and tiles), chosen by
  the visitor's system setting. Until this, the site shipped dark only. *Amended 2026-11-26* (owner: "There's
  no way to switch between light and dark mode"): a switch in the header pins either one, remembered on
  that device; until the visitor uses it, the system setting decides (PR #7).
- **Share image:** `web/public/og.png` is redrawn in Toy Box style, and its counts are read from `data/`
  instead of being typed into `web/scripts/build-og.mjs` (it still said 458 synergies after the check
  brought the list to 453).
- **Motion:** one moment, the item page's quality sticker wobbles; still under `prefers-reduced-motion`.

**Options that lost.** A, Pedestal (dark, candlelit relics) and C, Almanac (light field guide). Their boards
stay on the canvas for reference; neither is kept as a theme.

**How it is built:** `dev plans/contracts/toy-box-redesign.md` (PR #3, with the changes made while building).
