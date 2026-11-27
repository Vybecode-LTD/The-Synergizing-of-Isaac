# 0003 — The site pays for AI analysis, inside hard daily caps

**Date:** 2026-11-24 · **Decided by:** owner (AskUserQuestion: "You pay, rate-limited")

**Decision.** Visitors do not bring their own key. `/api/analyze` calls Claude with the owner's key and is
bounded four ways (`api/app/main.py`, `api/app/store.py`):

1. A daily cap per visitor (`AI_PER_VISITOR_PER_DAY`, default 5) and for the whole site
   (`AI_SITE_PER_DAY`, default 200). Both reset at midnight UTC.
2. Answers are saved by build, so a repeated build costs nothing and uses none of the visitor's allowance.
   Requests for the same build that arrive together wait for the first one and share its answer. The
   saved answer belongs to the exact words the model was given, so a corrected synergy gets a new one.
3. The request carries ids only; the server writes the whole prompt. The key cannot be used as a free proxy.
4. At most 16 items and 6 trinkets, a 4,000-token ceiling, and four model calls in flight at once.

**Why.** AI works for everyone with no setup. The desktop app's bring-your-own-key model would leave most
visitors without it.

**Options that lost.** *Visitors bring a key* (free to run, but few would use AI). *No AI at launch*
(simplest, but drops a feature the desktop app had).

**Settled by the owner, 2026-11-24** (AskUserQuestion, second session):
- **Model: `claude-opus-5-5`,** the default, at low effort. Roughly 2 cents a fresh analysis [inferred:
  about 1,500 input and 800 output tokens at $4 and $20 per million]; about $4 a day at the caps.
  `claude-sonnet-5-5` (about half) and `claude-haiku-5-5` (under a tenth of a cent, weaker knowledge of
  the game) lost. `AI_MODEL` changes it without a code change.
- **Caps: 5 per visitor and 200 for the site per day** stay. The question offered them as standing
  unless the owner said otherwise, and the owner did not change them. *Amended 2026-11-26:* the owner
  raised the per-visitor cap to **10** ("let's also increase the limit to 10 AI calls per IP"), set as
  `AI_PER_VISITOR_PER_DAY=10` on Railway; the code's default stays 5. The site cap stays 200, so the
  most the site can spend in a day (about $4) is unchanged.
- **Client address: DNS only, no Cloudflare proxy.** `CLIENT_IP_HEADER` stays at its default. If that
  ever changes, the app first needs a check that a request came through Cloudflare (`docs/DEPLOY.md`).

**How the caps hold** (second review, 2026-11-24): a failed call is refunded to the visitor; the site's
count is refunded only when the model never answered, so a call that was paid for and then failed
(declined, empty, cut off) still counts toward the 200. An IPv6 visitor is counted by /64.

**It now requires.** A Railway variable holding the key, a volume so the cache and counters survive
deploys, and an eye on the Anthropic bill for the first weeks. The refusal fallback is on for models that
support it (`fallbacks: "default"`).
