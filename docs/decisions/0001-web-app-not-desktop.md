# 0001 — The product is a web app; the desktop app is frozen

**Date:** 2026-11-24 · **Decided by:** owner (AskUserQuestion: "Web app (Recommended)")

**Decision.** The tool itself runs at the owner's domain as a React single-page app with a small FastAPI
server. The Avalonia desktop app stays in `src/`, still builds, and gets no further work.

**Why.** Anyone can open a link and use it on a second monitor or a phone, builds are shareable by URL,
and every item gets a page search engines and AI crawlers can read. No interactive Repentance synergy
builder was found on the web on 2026-11-24, only wikis and static guides.

**Options that lost.**
- *Desktop app plus a download page.* Reuses the code, but visitors must download an unsigned `.exe`
  (SmartScreen warning without a signing certificate), nothing is shareable, and far fewer people try it.
- *Both, web first.* Two interfaces to maintain for a desktop version that adds little.

**It now requires.** Hosting (Railway, `docs/DEPLOY.md`), SEO upkeep (`C:\DEV\SEO_OPTIMIZATION.md`), and a
decision one day on deleting `src/` (open; the owner has not asked for it).
