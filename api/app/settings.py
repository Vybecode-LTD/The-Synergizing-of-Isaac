"""Everything the API reads from its environment, in one place."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlparse

REPO = Path(__file__).resolve().parent.parent.parent

# A real run rarely holds more than this, and it bounds the prompt. Mirrored in web/src/engine/buildCodec.ts.
MAX_ITEMS = 16
MAX_TRINKETS = 6


def _int(name: str, default: int) -> int:
    raw = os.environ.get(name, "").strip()
    try:
        return max(0, int(raw)) if raw else default
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    # Secrets stay out of repr(), so a logged Settings never prints them.
    anthropic_api_key: str | None = field(default=None, repr=False)
    ai_model: str = "claude-opus-5-5"
    ai_effort: str = "low"
    ai_max_tokens: int = 4000
    per_visitor_per_day: int = 5
    site_per_day: int = 200
    submissions_per_visitor_per_day: int = 20
    submissions_site_per_day: int = 500
    # A ceiling on the owner's wiki checks (each is one paid model call), in case a session is ever stolen.
    admin_checks_per_day: int = 40
    # Both set, or there is no admin: /api/admin answers admin_off. The hash comes from app.admin_password.
    admin_username: str | None = None
    admin_password_hash: str | None = field(default=None, repr=False)
    # Railway's edge writes X-Forwarded-For. Set "cf-connecting-ip" only when Cloudflare proxies the domain.
    client_ip_header: str = "x-forwarded-for"
    site_url: str = "https://isaac.toys"
    environment: str = "development"
    data_path: Path = REPO / "data"
    web_dist: Path = REPO / "web" / "dist"
    data_dir: Path = REPO / "api" / "var"

    @property
    def site_domain(self) -> str:
        return urlparse(self.site_url).netloc or self.site_url

    @property
    def indexable(self) -> bool:
        """Only production may be indexed; every other environment answers with X-Robots-Tag: noindex."""
        return self.environment == "production"

    @classmethod
    def from_env(cls) -> Settings:
        env = os.environ
        key = env.get("ANTHROPIC_API_KEY", "").strip() or None
        header = env.get("CLIENT_IP_HEADER", "").strip().lower()
        return cls(
            anthropic_api_key=key,
            ai_model=env.get("AI_MODEL", "").strip() or cls.ai_model,
            ai_effort=env.get("AI_EFFORT", "").strip() or cls.ai_effort,
            ai_max_tokens=_int("AI_MAX_TOKENS", cls.ai_max_tokens),
            per_visitor_per_day=_int("AI_PER_VISITOR_PER_DAY", cls.per_visitor_per_day),
            site_per_day=_int("AI_SITE_PER_DAY", cls.site_per_day),
            submissions_per_visitor_per_day=_int(
                "SUBMISSIONS_PER_VISITOR_PER_DAY", cls.submissions_per_visitor_per_day
            ),
            submissions_site_per_day=_int("SUBMISSIONS_SITE_PER_DAY", cls.submissions_site_per_day),
            admin_checks_per_day=_int("ADMIN_CHECKS_PER_DAY", cls.admin_checks_per_day),
            admin_username=env.get("ADMIN_USERNAME", "").strip() or None,
            admin_password_hash=env.get("ADMIN_PASSWORD_HASH", "").strip() or None,
            client_ip_header=header if header in ("x-forwarded-for", "cf-connecting-ip") else cls.client_ip_header,
            site_url=(env.get("SITE_URL", "").strip() or cls.site_url).rstrip("/"),
            environment=env.get("ENVIRONMENT", "").strip() or cls.environment,
            data_path=Path(env["DATA_PATH"]) if env.get("DATA_PATH") else cls.data_path,
            web_dist=Path(env["WEB_DIST"]) if env.get("WEB_DIST") else cls.web_dist,
            data_dir=Path(env["DATA_DIR"]) if env.get("DATA_DIR") else cls.data_dir,
        )
