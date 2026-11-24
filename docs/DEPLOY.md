# Deploying issac.toys

**Status: never deployed.** The image has not been built anywhere yet (no Docker on the owner's machine),
so treat the first deploy as the test of `Dockerfile`. Deploying and every Railway change need the owner's
go-ahead. Background: the `railway-deploy-playbook` skill.

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
5. Service → **Settings → Networking → Generate domain** first, then **Custom domain** `issac.toys`.
   Point DNS at the target Railway shows. Re-adding a domain issues a new target.
6. **Deploy.** Done signal: `https://<domain>/api/health` answers `{"status":"ok","ai":true,...}`.

| Variable | Value | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | from <https://console.anthropic.com/settings/keys> | Turns AI analysis on. Without it the site works and says AI is off |
| `ENVIRONMENT` | `production` | Allows indexing. Anything else sends `X-Robots-Tag: noindex` |
| `SITE_URL` | `https://issac.toys` | Canonical URLs, sitemap, share image |
| `DATA_DIR` | `/data` | Where the SQLite file lives (the volume) |
| `AI_MODEL` | optional, default `claude-opus-5-5` | See `docs/decisions/0003` for the cost of each choice |
| `AI_PER_VISITOR_PER_DAY` | optional, default `5` | Fresh analyses per visitor per day |
| `AI_SITE_PER_DAY` | optional, default `200` | Fresh analyses for the whole site per day: the spending cap |
| `AI_MAX_TOKENS` | optional, default `4000` | Ceiling for one answer, thinking included. A cut-off answer is refused, not saved; the log says to raise this |
| `CLIENT_IP_HEADER` | `cf-connecting-ip` **only** if Cloudflare proxies the domain | Which header names the visitor |

Railway injects `PORT`; the container binds to it.

**Before choosing Cloudflare mode:** `cf-connecting-ip` is only true for requests that came through
Cloudflare. Anyone can connect to Railway directly (the generated `*.up.railway.app` domain, or the custom
domain's Railway target with the right `Host`) and send a made-up one, which gives them a fresh allowance
per request. The app does not yet check that a request came through Cloudflare. If the owner chooses
Cloudflare, add that check first (a secret header set by a Cloudflare rule, or Cloudflare's address
ranges), and remove the generated domain.

## After the first deploy, check

1. **The deployment used the settings.** Deployment → Details: builder Dockerfile, healthcheck
   `/api/health`. A setting in `railway.toml` proves nothing until the deployment shows it.
2. **Real pages:** `curl -s https://issac.toys/items/brimstone | grep -c "<h1"` prints `1`;
   `curl -o NUL -w "%{http_code}" https://issac.toys/items/nope` prints `404`.
3. **Hashed assets are served:** `curl -s https://issac.toys/ | grep -c /assets/index-` prints `2`.
4. **Robots:** `https://issac.toys/robots.txt` allows GPTBot, ClaudeBot and the rest. If Cloudflare is in
   front, check it is not blocking AI crawlers (it does by default).
5. **The limit works behind the edge.** Ask for six different analyses from one connection: the sixth must
   answer 429. Then forge each header the limiter could believe and try again:
   `curl -X POST https://issac.toys/api/analyze -H "content-type: application/json" -H "x-forwarded-for: 1.2.3.4" -d "{\"items\":[1]}"`
   `curl -X POST https://issac.toys/api/analyze -H "content-type: application/json" -H "cf-connecting-ip: 1.2.3.4" -d "{\"items\":[1]}"`
   Both must still be refused. The first is the one the app trusts by default: it counts on Railway's edge
   overwriting `X-Forwarded-For`, which is known from another project and not yet proven here. If a forged
   one gets a fresh allowance, switch AI off (remove the key) until `client_ip` in `api/app/main.py` is
   fixed. The second may pass only when `CLIENT_IP_HEADER` says Cloudflare. A limiter that worked locally
   let 39 of 40 through behind Railway's proxy on another project.
6. **The volume holds.** Redeploy, repeat an analysis already asked: it must come back `"cached": true`.
7. Submit `https://issac.toys/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

## Never

- List Railway variables in a terminal or through the connector: it prints the key.
- Put the key in `web/`: Vite bakes `VITE_*` values into the public bundle.
