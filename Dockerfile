# One image: the web app is built, then the API serves it along with crawler-ready HTML and /api.
# OS codenames are pinned on purpose: a floating tag once rolled to a new Debian and broke builds.

# ---- 1. build the web app -------------------------------------------------
FROM node:22-bookworm-slim AS web
WORKDIR /repo
COPY web/package.json web/package-lock.json ./web/
# devDependencies are the build tools (vite, typescript, sharp), so they must be installed here.
RUN cd web && npm ci --include=dev --no-audit --no-fund
COPY data ./data
COPY web ./web
RUN cd web && npm run build

# ---- 2. the API ------------------------------------------------------------
FROM python:3.12-slim-bookworm
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DATA_PATH=/app/data \
    WEB_DIST=/app/web/dist \
    DATA_DIR=/data
WORKDIR /app
COPY api/requirements.txt ./api/requirements.txt
RUN pip install --no-cache-dir -r api/requirements.txt
# Only the JSON the API reads: the sprites are already inside the web build.
COPY data/*.json ./data/
COPY data/content ./data/content
COPY api/app ./api/app
COPY --from=web /repo/web/dist ./web/dist
WORKDIR /app/api
# Railway injects PORT at runtime. Bind to it on all interfaces.
CMD ["sh", "-c", "uvicorn app.server:app --host 0.0.0.0 --port ${PORT:-8000}"]
