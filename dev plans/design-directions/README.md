# isaac.toys design directions (2026-11-25)

**Picked: B, Toy Box** (owner, 2026-11-25; decision 0005). Build plan: `dev plans/contracts/toy-box-redesign.md`.

Three style directions for a high-end redesign, asked for by the owner on 2026-11-24 ("3 different styles
that I can pick from, or at least pick different elements from"). Nothing here is built into `web/` yet.

**Live canvas (private until shared):** <https://claude.ai/artifact/CPYw7whXXpWSkxp2gKGqke>

Every direction has the same four boards, so you can mix sections: "A's altar with C's synergy list" is a
buildable request.

| Board | A Pedestal | B Toy Box | C Almanac |
|---|---|---|---|
| Builder, desktop (1440) | `canvas/Main.dc.html` | `canvas/ToyBuilder.dc.html` | `canvas/AlmanacBuilder.dc.html` |
| Builder, phone (390) | `canvas/PedestalPhone.dc.html` (imports Main) | `canvas/ToyPhone.dc.html` | `canvas/AlmanacPhone.dc.html` |
| Item page (Brimstone) | `canvas/PedestalItem.dc.html` | `canvas/ToyItem.dc.html` | `canvas/AlmanacItem.dc.html` |
| Synergy list | `canvas/PedestalSynergies.dc.html` | `canvas/ToySynergies.dc.html` | `canvas/AlmanacSynergies.dc.html` |

Builder sections, in the same order everywhere: header, title and search, the build (character, six items,
one trinket), actions, synergies with the rating tally, stat changes and transformations, one pickup away,
AI read, footer.

**Content is real:** the sample build (Azazel; Brimstone, Tammy's Head, Technology, Rock Bottom, Crown of
Light, Sacred Heart; Perfection) and its 7 synergies, 66 one-away pickups, Brimstone's 63 synergies and the
list's counts (454; S 45, A 225, B 159, C 14, D 11) come from `data/` as of PR #2's first push, through
`tools/sample_build.py`. The review then removed one S entry, so the live list is 453 with 44 S; the
boards still say 454. Copy is the site's own (`data/content/`, the builder components). Sprites are the
game's, uploaded to the canvas as assets.

## The three directions

| | A Pedestal | B Toy Box | C Almanac |
|---|---|---|---|
| Idea | Dark and candlelit; pickups as relics on lit stone plinths | Bright and chunky; pickups as plastic tiles in a molded tray | Light and type-led; a printed field guide with specimen plates |
| Ground / surface | `#15110E` cellar, `#1D1713` stone, `#100D0B` footer | `#EEF1F8` chalk, `#FFFFFF`, `#DCE2F0` tray | `#F3F3EE` paper, `#FBFBF8` page, `#D8D8CF` rules |
| Text / muted | `#EFE6D6` bone, `#B3A692` ash | `#1A1E3A` ink, `#474D6E` | `#1C2230` ink, `#545A66` |
| Accent | `#F0A43A` candle | `#C93A17` tomato (buttons), `#FFC21A` sun | `#B42318` stamp red |
| Ratings S A B C D | `#F0A43A` `#D8C49A` `#8DB5A2` `#A39684` `#A8361F` (seals) | `#FFC21A` `#1F5FE0` `#2FCB8E` `#C9D0E2` `#6B3FD4` (stickers) | `#B42318` `#22407A` `#2C6A3D` `#5F646D` `#6A3C8E` (stamps) |
| Fonts | Cormorant (display), Manrope (text) | Bricolage Grotesque (display), Figtree (text) | Newsreader (display and text), DM Mono (labels) |
| Signature | Candle halo behind each sprite, brighter with item quality | Ink outlines and hard offset shadows in the rating's colour | Specimen plates on grid paper with catalogue numbers; rating stamps |
| Motion (one, off under reduced motion) | Item page: the halo flickers | Item page: the quality sticker wobbles | Item page: the quality stamp presses in once |

Contrast: every text pair in all three passes 4.5:1 (`tools/contrast.py`; Toy Box's tomato was darkened to
`#C93A17` to pass). Rendered contrast in every state has not been run; it is the gate before anything ships.

## Checked (2026-11-25, owner asked)

The canvas page needs a claude.ai sign-in the app's browser didn't have, so every board was rendered through
`tools/harness.html`: a local stand-in for the canvas runtime that fills each board from its own
`renderVals()` (`tools/stage_verify.py` copies the boards and sprites next to it; serve the folder and open
`harness.html?b=<Board>.dc.html`). All 12 boards were measured at 1440 px and the phone boards at 390 px.
Snapshots of the three builders: `previews/`.

Fixed after the check: the build row and "one pickup away" wrapped their eighth pickup onto a row of its own
(A, B); Toy Box's container is now 1360 px so its tray fits eight; Almanac's stat table was dropped by the
HTML parser (a `<sc-for>` inside `<tbody>`) and is now a `<dl>`; Almanac's stamp animated from invisible, so
a paused animation hid it; every frame height now matches its board. No sprite failed to load and nothing
overflows sideways at either width. Not checked: the real canvas runtime itself, and rendered contrast.

## Open, for the build

- The pick becomes `web/src/styles/tokens.css` (Tier-2 roles), not a second token file.
- Fonts move from Google Fonts to self-hosted files on the site.
- Two unchecked list entries shown on the boards look wrong and belong to the A/B/C check:
  `technology+c-azazel` (B) and `brimstone+lord-of-the-pit+the-pact` (A).
