# Deploying isaac.toys

**Status: never deployed.** There is no Docker on the owner's machine, so CI's `docker` job is where the
image is built: it runs it as Railway does (`PORT` injected, a volume at `/data`, no key) and smoke-tests it.
Deploying and every Railway change need the owner's go-ahead. Background: the `railway-deploy-playbook` skill.

## Shape

One Railway project, one service, built from the repo's `Dockerfile` (it builds `web/`, then runs `api/`,
which serves the app, the crawler HTML and `/api`). One volume for the SQLite file that holds saved AI
answers and the daily counters. No database server.

## Owner steps (Railway dashboard, production)

1. <https://railway.com/new> → **Deploy from GitHub repo** → `Vybecode-LTD/The-Synergizing-of-Isaac`,
   branch `main` (after the PR is merged).
2. Service → **Settings → Build**: builder **Dockerfile**, path `/Dockerfile`. An empty path silently
   keeps the default builder.
3. Service → **Variables**: add the rows below. Paste the key straight into Railway; never into chat.
4. Service → **Volumes → New volume**, mount path `/data`.
5. Service → **Settings → Networking → Generate domain** first, then **Custom domain** `isaac.toys`.
   Point DNS at the target Railway shows (DNS only: the owner decided against a Cloudflare proxy on
   2026-11-24). Re-adding a domain issues a new target.
   `issac.toys`, registered first, only redirects: set a permanent (301) redirect to `https://isaac.toys`
   at its registrar, keeping the path. It is not added to Railway, so the app has one canonical name.
6. **Deploy.** Done signal: `https://<domain>/api/health` answers `{"status":"ok","ai":true,...}`.

| Variable | Value | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | from <https://console.anthropic.com/settings/keys> | Turns AI analysis on. Without it the site works and says AI is off |
| `ENVIRONMENT` | `production` | Allows indexing. Anything else sends `X-Robots-Tag: noindex` |
| `SITE_URL` | `https://isaac.toys` | Canonical URLs, sitemap, share image |
| `DATA_DIR` | `/data` | Where the SQLite file lives (the volume) |
| `AI_MODEL` | leave unset: the owner chose the default, `claude-opus-5-5` | `docs/decisions/0003` has the cost of each choice |
| `AI_PER_VISITOR_PER_DAY` | optional, default `5` | Fresh analyses per visitor per day |
| `AI_SITE_PER_DAY` | optional, default `200` | Fresh analyses for the whole site per day: the spending cap |
| `AI_MAX_TOKENS` | optional, default `4000` | Ceiling for one answer, thinking included. A cut-off answer is refused, not saved; the log says to raise this |
| `CLIENT_IP_HEADER` | leave unset: the owner chose DNS only, no Cloudflare proxy | Which header names the visitor. `cf-connecting-ip` is for a proxied domain only |

Railway injects `PORT`; the container binds to it.

**If Cloudflare is ever put in front** (not planned): `cf-connecting-ip` is only true for requests that came through
Cloudflare. Anyone can connect to Railway directly (the generated `*.up.railway.app` domain, or the custom
domain's Railway target with the right `Host`) and send a made-up one, which gives them a fresh allowance
per request. The app does not yet check that a request came through Cloudflare. Add that check first (a
secret header set by a Cloudflare rule, or Cloudflare's address ranges), and remove the generated domain.

## After the first deploy, check

1. **The deployment used the settings.** Deployment → Details: builder Dockerfile, healthcheck
   `/api/health`. A setting in `railway.toml` proves nothing until the deployment shows it.
2. **Pages, files and robots,** in one command from `api/` (it never asks the model, so it costs nothing): `.venv\Scripts\python -m app.smoke https://isaac.toys --ai on --indexable --site-url https://isaac.toys`.
   It must end "12 of 12 checks passed". It covers real pages and 404s, every script, stylesheet, font and
   sprite sheet with its type, robots allowing GPTBot and ClaudeBot, the sitemap, the headers, and AI on.
   Before the custom domain works, give it the generated `*.up.railway.app` address and keep
   `--site-url https://isaac.toys`. If Cloudflare is ever in front, also check it is not blocking AI
   crawlers (it does by default).
3. **The limit works behind the edge.** Ask for six different analyses from one connection: the sixth must
   answer 429. Then forge each header the limiter could believe and try again:
   `curl -X POST https://isaac.toys/api/analyze -H "content-type: application/json" -H "x-forwarded-for: 1.2.3.4" -d "{\"items\":[1]}"`
   `curl -X POST https://isaac.toys/api/analyze -H "content-type: application/json" -H "cf-connecting-ip: 1.2.3.4" -d "{\"items\":[1]}"`
   Both must still be refused. The first is the one the app trusts by default: it counts on Railway's edge
   overwriting `X-Forwarded-For`, which is known from another project and not yet proven here. If a forged
   one gets a fresh allowance, switch AI off (remove the key) until `client_ip` in `api/app/main.py` is
   fixed. The second may pass only when `CLIENT_IP_HEADER` says Cloudflare. A limiter that worked locally
   let 39 of 40 through behind Railway's proxy on another project.
4. **The volume holds.** Redeploy, repeat an analysis already asked: it must come back `"cached": true`.
5. Submit `https://isaac.toys/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

## Never

- List Railway variables in a terminal or through the connector: it prints the key.
- Put the key in `web/`: Vite bakes `VITE_*` values into the public bundle.
