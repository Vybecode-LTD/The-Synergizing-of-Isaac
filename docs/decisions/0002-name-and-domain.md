# 0002 — The site is issac.toys

**Date:** 2026-11-24 · **Decided by:** owner ("issac.toys will be the domain")

**Decision.** The domain, and so the name on the site, is `issac.toys`. The registry showed it registered
on 2026-11-24 at 19:38 UTC. The wordmark is the domain itself.

**Open, for the owner.** The game spells the name "Isaac". `isaac.toys` was unregistered when checked
(2026-11-24). Claude flagged this the same day; the owner has not yet said whether the double-s is
deliberate. Registrars usually refund a domain within five days of registration.

**If the spelling changes,** three things change with it: `SITE.domain` in `web/src/site.ts`, the API's
`SITE_URL` variable, and the share image (`npm run og -- <domain>` in `web/`). Tests that name the domain
(`web/src/app.test.tsx`, `api/tests/`, `data/tests/parity.json` via `python -m app.parity`) follow.

**Options that lost** (all four had `.com`, `.gg`, `.app` and `.io` free on 2026-11-24, and none contains
the game's name): All Stats Up (`allstatsup.com`, recommended), How Broken, Tearmancy, Pedestal Pick.
The owner chose their own domain instead.

**Note.** A domain containing the game's name is common for fan sites but is not a trademark clearance.
The site carries an "unofficial fan project" notice in its footer and on the About page.
