"""HTTP pieces the routes share: error answers, who a request comes from, and checking a build."""

from __future__ import annotations

import ipaddress
from urllib.parse import urlsplit

from fastapi import HTTPException, Request
from pydantic import BaseModel, Field

from .gamedata import Build, GameData
from .settings import MAX_ITEMS, MAX_TRINKETS

MESSAGES = {
    "rate_limited": "You've used today's AI analyses. They reset at midnight UTC.",
    "budget_exhausted": "The site's AI budget for today is used up. It resets at midnight UTC.",
    "not_configured": "AI analysis isn't switched on for this site yet.",
    "failed": "The AI didn't answer. Try again in a moment.",
    "submissions_limited": "That's all the synergies the site takes from one visitor a day. Thank you! More tomorrow.",
    "no_analysis": "That AI read has expired. Analyse the build again, then send what it found.",
    "admin_off": "The admin inbox isn't set up on this site.",
    "signed_out": "Sign in first.",
    "wrong_login": "That username and password don't match.",
    "too_many_attempts": "Too many wrong sign-ins from here today. Try again after midnight UTC.",
    "bad_origin": "That request came from another site.",
    "not_found": "No such submission.",
    "already_live": "Another submission for this combination is live. Edit that one, or unpublish it first.",
    "checks_limited": "That's today's wiki checks used up. They reset at midnight UTC.",
    "wiki_unreachable": "The wiki couldn't be read just now. Try again in a moment.",
}


def problem(status: int, code: str, message: str | None = None) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message or MESSAGES[code]})


def client_ip(request: Request, header: str) -> str:
    """Who to count a request against: the visitor's address behind Railway's edge (and Cloudflare, when
    it proxies the domain).

    Railway's edge overwrites X-Forwarded-For, so its first entry is the real peer. CF-Connecting-IP is
    only trustworthy when every request comes through Cloudflare, which is why it is opt-in.

    An IPv6 visitor is counted by their /64: a subscriber is handed the whole network, so counting single
    addresses would give them a fresh allowance for every one they cared to use.
    """
    candidates = []
    if header == "cf-connecting-ip":
        candidates.append(request.headers.get("cf-connecting-ip", ""))
    candidates.append(request.headers.get("x-forwarded-for", "").split(",")[0])
    for candidate in candidates:
        try:
            address = ipaddress.ip_address(candidate.strip())
        except ValueError:
            continue
        if isinstance(address, ipaddress.IPv6Address):
            if address.ipv4_mapped is not None:
                return str(address.ipv4_mapped)
            return str(ipaddress.ip_network((address, 64), strict=False))
        return str(address)
    return request.client.host if request.client else "unknown"


def same_site(request: Request) -> None:
    """Refuse a browser request another site made: the check every state-changing admin call gets.

    A browser always sends Origin on a cross-site POST, and Sec-Fetch-Site on every request; either one
    pointing elsewhere is enough to refuse. A request with neither (curl) is not a browser carrying the
    owner's cookie for someone else.
    """
    fetch_site = request.headers.get("sec-fetch-site")
    if fetch_site is not None and fetch_site not in ("same-origin", "none"):
        raise problem(403, "bad_origin")
    origin = request.headers.get("origin")
    if origin is not None and urlsplit(origin).netloc.lower() != request.headers.get("host", "").lower():
        raise problem(403, "bad_origin")


class BuildRequest(BaseModel):
    character: str | None = Field(default=None, max_length=40)
    items: list[int] = Field(default_factory=list, max_length=MAX_ITEMS)
    trinkets: list[int] = Field(default_factory=list, max_length=MAX_TRINKETS)


def check_build(data: GameData, body: BuildRequest) -> Build:
    """The build a request names, or a 422 saying what is wrong with it."""
    if body.character is not None and body.character not in data.character_by_slug:
        raise problem(422, "invalid", "Unknown character.")
    if any(i not in data.item_by_id for i in body.items) or any(t not in data.trinket_by_id for t in body.trinkets):
        raise problem(422, "invalid", "Unknown item or trinket.")
    if len(set(body.items)) != len(body.items) or len(set(body.trinkets)) != len(body.trinkets):
        raise problem(422, "invalid", "The same pickup is listed twice.")
    if not body.items and not body.trinkets:
        raise problem(422, "invalid", "Add at least one item or trinket first.")
    return Build(character=body.character, items=tuple(body.items), trinkets=tuple(body.trinkets))
