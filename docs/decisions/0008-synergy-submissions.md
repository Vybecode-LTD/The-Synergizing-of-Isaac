# 0008 — Visitors can send synergies; the owner approves them at /admin and they go live

Date: 2026-11-27. Status: decided by the owner (two rounds of answers that day); built in PR #12.
Contract: `dev plans/contracts/synergy-submissions.md`.

## Decision

1. A visitor can send a synergy the curated list lacks: from "Add your own synergy", from a synergy they
   saved earlier, or from the AI read's "Synergies found". No account, no name.
2. Submissions wait in an inbox at `/admin`. The owner signs in with a **username and password**
   (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` on Railway, set by the owner; the hash comes from
   `python -m app.admin_password`). Chosen over a single secret key.
3. **Approving publishes.** An approved submission is on the site at once as a *Community* synergy,
   served from the site's SQLite database, with no deploy (owner, 2026-11-27, second answer: "Approve =
   live", replacing the first answer, "via a PR"). Unpublishing or rejecting takes it off at once.
4. **The curated list stays the base.** `data/synergies.json` is still hand-checked and still in git.
   Moving community synergies into it is optional: the inbox's export, `scripts/gamedata.py
   add-submissions`, and a pull request. After that deploys, the server sees the combination in the
   curated list and marks the database copy "in the curated list" by itself.
5. **SQLite stays** (owner, 2026-11-27): one service, one file on the Railway volume. Postgres would add a
   paid service and a migration for nothing this needs. Revisit if the site ever runs more than one
   instance, or the owner wants to browse rows in a dashboard.
6. **A weekly backup** (`.github/workflows/community-backup.yml`) saves the public list of live community
   synergies to the `backup/community` branch, in `data/synergies.json`'s format, so they outlive the
   volume. That branch is never deployed.
7. Under "Synergies found" a visitor can save each find to their own synergies and send them all to the
   inbox, marked as found by the AI.

## Why the database, and not the curated file, holds them

The synergy list ships inside the web app's code, and the server builds its pages from the same file, so
anything new in the file needs a build and a deploy. Live approval needs the list read while the site
runs. Every page the server sends carries the live community list inline (a JSON data block), so the
browser builds the same list the server rendered from, and both sides title and count pages the same
(`CLAUDE.md` rule 3).

## What stays out

- Community text never reaches the model: the AI prompt is built from the curated file alone, so no text
  a visitor wrote is ever sent to the paid model (`CLAUDE.md` rule 5). The AI's finds are checked against
  the live list, so it never offers what the site already shows.
- The owner's approval is the fact check for community synergies; the About page says they were not
  checked against the wiki the way the curated list was.

## What this changes

The web-app-seams contract listed "no community submission of synergies" as a non-goal. That non-goal is
now this decision. No visitor accounts still holds.

## Why the AI's answer is now JSON

The read was plain text with four headings, parsed by the browser. "Synergies found" needs pieces the
server can check against the build, so the model now answers in a JSON schema (`output_config.format`),
naming pieces by references the prompt gives (`i118`, `t39`). The page lays the sections out itself.
