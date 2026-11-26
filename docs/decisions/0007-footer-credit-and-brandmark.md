# 0007 — The footer credits CarbonDSP, with its brandmark

Date: 2026-11-26. Status: decided by the owner (PR #9 for the credit, PR #10 for the brandmark).

## Decision

The footer reads, beside the CarbonDSP brandmark:

1. "Built by CarbonDSP for the TBOI community." CarbonDSP links to `https://carbondsp.com/`.
2. The unofficial-fan-project notice. Decision 0002 requires it in the footer, so it stays.
3. "About, sources and credits", linking to `/about`.

The brandmark sits on the left across all three lines: 128 px on wide screens, 80 px on a phone.
It is decorative (`alt=""`), because the credit beside it already names CarbonDSP.

## Which brandmark file, and why

The owner named the kit's **primary** brandmark (`02-logos/brandmark/primary/carbon-dsp-4096.png`). The site
uses the kit's **reverse** brandmark instead, from the same folder at 128 and 256 px. The primary's C is
`#131313` and disappears on the footer band, which is dark navy in both themes. The kit's own rule
(`06-guidelines/usage.md`) is "Use primary on white/light surfaces and reverse on dark surfaces". A
screenshot of each was shown to the owner on 2026-11-26.
Don't switch back to primary unless the footer band turns light.

The files are copies in `web/src/assets/brand/`. They are imported with `?no-inline`, so they stay
content-hashed files the browser keeps across deploys rather than being inlined into the script.
