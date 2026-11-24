# 0003 — The site pays for AI analysis, inside hard daily caps

**Date:** 2026-11-24 · **Decided by:** owner (AskUserQuestion: "You pay, rate-limited")

**Decision.** Visitors do not bring their own key. `/api/analyze` calls Claude with the owner's key and is
bounded four ways (`api/app/main.py`, `api/app/store.py`):

1. A daily cap per visitor (`AI_PER_VISITOR_PER_DAY`, default 5) and for the whole site
   (`AI_SITE_PER_DAY`, default 200). Both reset at midnight UTC.
2. Answers are saved by build, so a repeated build costs nothing and uses none of the visitor's allowance.
   Requests for the same build that arrive together wait for the first one and share its answer.
3. The request carries ids only; the server writes the whole prompt. The key cannot be used as a free proxy.
4. At most 16 items and 6 trinkets, a 4,000-token ceiling, and four model calls in flight at once.

**Why.** AI works for everyone with no setup. The desktop app's bring-your-own-key model would leave most
visitors without it.

**Options that lost.** *Visitors bring a key* (free to run, but few would use AI). *No AI at launch*
(simplest, but drops a feature the desktop app had).

**Open, for the owner** (settings, not code):
- **Model.** Default `claude-opus-5-5` at low effort, roughly 2 cents a fresh analysis [inferred: about
  1,500 input and 800 output tokens at $4 and $20 per million]. `claude-sonnet-5-5` is about half that and
  `claude-haiku-5-5` under a tenth of a cent, with weaker knowledge of the game. At the default caps the
  worst case is about $4 a day on Opus.
- **Caps.** Whether 5 and 200 are right.
- **Client address.** `CLIENT_IP_HEADER=cf-connecting-ip` only if Cloudflare proxies the domain.

**It now requires.** A Railway variable holding the key, a volume so the cache and counters survive
deploys, and an eye on the Anthropic bill for the first weeks. The refusal fallback is on for models that
support it (`fallbacks: "default"`).
