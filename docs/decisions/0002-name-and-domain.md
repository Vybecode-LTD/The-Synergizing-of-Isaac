# 0002 — The site is isaac.toys

**Date:** 2026-11-24 · **Decided by:** owner (AskUserQuestion: "isaac.toys, redirect the other")

**Decision.** The domain, and so the name on the site, is `isaac.toys`, spelled as the game spells it. The
wordmark is the domain itself. `issac.toys`, which the owner registered first (2026-11-24, 19:38 UTC), is
kept only to redirect to it.

**History.** The owner first said "issac.toys will be the domain" and the site was built under that name.
Claude flagged the same day that the game is "Isaac" and that `isaac.toys` was unregistered. Asked in the
second session, the owner chose the game's spelling. The public registry still showed `isaac.toys` as
unregistered then (RDAP answered 404 for it and 200 for `issac.toys`).

**Registered.** The owner bought `isaac.toys` on 2026-11-24 and keeps both domains (owner, in chat: "we can
host it on the right one and then redirect from the wrong one"). The registry answered 200 for both when
checked that night (before 04:00 UTC on 2026-11-25); `isaac.toys` had no DNS yet. Still to do at deploy: point `isaac.toys` at Railway,
and set a permanent (301) redirect from `issac.toys` to `https://isaac.toys`, keeping the path, at its
registrar (`docs/DEPLOY.md`, step 5).

**What changed with the name:** `SITE.domain` in `web/src/site.ts`, the API's default `SITE_URL`, the share
image (`npm run og -- isaac.toys` in `web/`), the snapshot (`python -m app.parity`), the tests that name the
domain, the browser storage keys and the SQLite file name. Nothing had been deployed, so nobody's saved
build was lost. If the name ever changes again, the same list applies.

**Options that lost** (all four had `.com`, `.gg`, `.app` and `.io` free on 2026-11-24, and none contains
the game's name): All Stats Up (`allstatsup.com`, recommended at the time), How Broken, Tearmancy, Pedestal
Pick. The owner chose their own domain instead. Keeping `issac.toys` as the name also lost: people type the
game's spelling.

**Note.** A domain containing the game's name is common for fan sites but is not a trademark clearance.
The site carries an "unofficial fan project" notice in its footer and on the About page.
