"""The owner's inbox: sign-in, the submissions, and the export that becomes a pull request (decision 0008).

Every route but /session and /login needs a live session. One owner, one username and password, both
from the environment; no accounts. The checks follow the auth-threat-model checklist: one answer for a
wrong name or a wrong password (and a full hash either way), a daily limit on failures per visitor, an
opaque token stored only as its hash, a new token at every sign-in, idle and absolute expiry, sessions
ended when the password changes, and an Origin check on every write.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
from collections.abc import Callable
from typing import Any, Literal

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field

from . import admin_password, wiki
from .analysis import MAX_DESCRIPTION, AnalysisFailed, Analyzer
from .community import slug_id
from .gamedata import GameData, combo_key
from .settings import Settings
from .store import SESSION_LIFETIME, Store
from .submissions import plain_text
from .web import problem, same_site

log = logging.getLogger("isaac_toys.admin")

COOKIE = "isaac_admin"
# The __Host- prefix makes the browser refuse the cookie unless it is Secure, host-only and Path=/.
SECURE_COOKIE = "__Host-isaac_admin"
MAX_FAILURES = 10
MAX_NOTE = 500
CHECKS = "check"  # the usage key the owner's wiki checks count under

Status = Literal["new", "approved", "rejected", "added"]
Rating = Literal["S", "A", "B", "C", "D"]


class LoginRequest(BaseModel):
    username: str = Field(max_length=200)
    password: str = Field(max_length=admin_password.MAX_LENGTH)


class ReviewRequest(BaseModel):
    status: Status | None = None
    rating: Rating | None = None
    description: str | None = Field(default=None, max_length=4 * MAX_DESCRIPTION)
    note: str | None = Field(default=None, max_length=4 * MAX_NOTE)


def routes(
    settings: Settings,
    data: GameData,
    store: Store,
    visitor_of: Callable[[Request], str],
    analyzer: Analyzer | None = None,
    pages: wiki.Wiki | None = None,
) -> APIRouter:
    router = APIRouter(prefix="/api/admin")
    reader: wiki.Wiki = pages or wiki.WikiClient()
    username = settings.admin_username or ""
    stored = settings.admin_password_hash or ""
    configured = bool(username) and admin_password.parse(stored) is not None
    if (username or stored) and not configured:
        log.error("admin is off: set ADMIN_USERNAME and an ADMIN_PASSWORD_HASH made by app.admin_password")
    # Changing either one ends every session: sessions carry this tag and must match it.
    tag = hashlib.sha256(f"{username}\0{stored}".encode()).hexdigest()[:32]
    secure = settings.indexable
    cookie = SECURE_COOKIE if secure else COOKIE

    def signed_in(request: Request) -> None:
        if not configured:
            raise problem(503, "admin_off")
        token = request.cookies.get(cookie)
        if not token or not store.session(token, username, tag):
            raise problem(401, "signed_out")

    def on_list(row: dict[str, Any]) -> dict[str, Any]:
        key = (tuple(sorted(row["itemIds"])), tuple(sorted(row["trinketIds"])))
        return {**row, "onList": data.synergies_by_pieces.get(key, [])}

    @router.get("/session")
    def session(request: Request) -> dict[str, object]:
        token = request.cookies.get(cookie)
        live = configured and bool(token) and store.session(token or "", username, tag)
        return {"configured": configured, "signedIn": live, "username": username if live else None}

    # Plain `def`: scrypt takes a fraction of a second, so FastAPI runs it off the event loop.
    @router.post("/login")
    def login(body: LoginRequest, request: Request, response: Response) -> dict[str, object]:
        same_site(request)
        if not configured:
            raise problem(503, "admin_off")
        failures = f"login:{visitor_of(request)}"
        if store.used(failures) >= MAX_FAILURES:
            raise problem(429, "too_many_attempts")
        name_ok = hmac.compare_digest(body.username.strip().encode(), username.encode())
        # A wrong name still pays for one hash (against a dummy), so timing can't tell the two apart.
        password_ok = admin_password.verify(body.password, stored if name_ok else None)
        if not (name_ok and password_ok):
            count = store.bump(failures)
            log.warning("admin sign-in failed (%d of %d today from this visitor)", count, MAX_FAILURES)
            raise problem(401, "wrong_login")
        old = request.cookies.get(cookie)
        if old:
            store.close_session(old)  # a fresh token at every sign-in: nothing fixed in advance survives
        token = store.open_session(username, tag)
        response.set_cookie(
            cookie,
            token,
            max_age=int(SESSION_LIFETIME.total_seconds()),
            path="/",
            secure=secure,
            httponly=True,
            samesite="strict",
        )
        log.info("admin signed in")
        return {"configured": True, "signedIn": True, "username": username}

    @router.post("/logout")
    def logout(request: Request, response: Response) -> dict[str, object]:
        same_site(request)
        token = request.cookies.get(cookie)
        if token:
            store.close_session(token)
        response.delete_cookie(cookie, path="/", secure=secure, httponly=True, samesite="strict")
        return {"configured": configured, "signedIn": False, "username": None}

    @router.get("/submissions", dependencies=[Depends(signed_in)])
    def submissions(status: Status | Literal["all"] = "new") -> dict[str, object]:
        rows = store.submissions(None if status == "all" else status)
        return {"submissions": [on_list(r) for r in rows], "counts": store.counts()}

    @router.patch("/submissions/{submission_id}", dependencies=[Depends(signed_in)])
    def review(submission_id: int, body: ReviewRequest, request: Request) -> dict[str, object]:
        same_site(request)
        changes: dict[str, Any] = body.model_dump(exclude_none=True)
        if "description" in changes:
            changes["description"] = plain_text(changes["description"])
            if not changes["description"] or len(changes["description"]) > MAX_DESCRIPTION:
                raise problem(422, "invalid", f"The description needs 1 to {MAX_DESCRIPTION} characters.")
        if "note" in changes:
            changes["note"] = plain_text(changes["note"])[:MAX_NOTE] or None  # an empty note clears it
        if changes.get("status") == "approved" and store.live_twin(submission_id) is not None:
            # One live synergy per combination: two would show twice and break the backup's import.
            raise problem(409, "already_live")
        if not store.review(submission_id, changes):
            raise problem(404, "not_found")
        row = store.submission(submission_id)
        if row is None:  # deleted by another request between the update and this read
            raise problem(404, "not_found")
        return on_list(row)

    @router.post("/submissions/{submission_id}/check", dependencies=[Depends(signed_in)])
    async def check(submission_id: int, request: Request) -> dict[str, object]:
        """Check a submission against the wiki: the model writes it from the members' pages, never from the
        submitted words (rule 5). The result is advice stored beside the row; the owner still saves."""
        same_site(request)
        if analyzer is None:
            raise problem(503, "not_configured")
        row = store.submission(submission_id)
        if row is None:
            raise problem(404, "not_found")
        if store.used(CHECKS) >= settings.admin_checks_per_day:
            raise problem(429, "checks_limited")  # early, to spare the wiki; take() below is what holds
        members = [
            *(wiki.Member("item", data.item_by_id[i]["name"]) for i in row["itemIds"] if i in data.item_by_id),
            *(
                wiki.Member("trinket", data.trinket_by_id[t]["name"])
                for t in row["trinketIds"]
                if t in data.trinket_by_id
            ),
            *(
                wiki.Member("character", data.character_by_slug[c]["name"])
                for c in row["characterSlugs"]
                if c in data.character_by_slug
            ),
        ]
        found = {m.name: await reader.page(m.name) for m in members}
        if not any(found.values()):
            raise problem(502, "wiki_unreachable")
        prompt, excerpts = wiki.prompt(members, found)
        # Checked and counted in one step, after the wiki and right before the model: a request that waited on
        # the wiki beside another can't also pass (Codex, PR #14). Counted whatever the model answers.
        if not store.take(CHECKS, settings.admin_checks_per_day):
            raise problem(429, "checks_limited")
        try:
            text = await analyzer.analyze(wiki.SYSTEM, prompt, schema=wiki.SCHEMA)
            result = wiki.read_check(text, found, excerpts, store.now())
        except (AnalysisFailed, ValueError) as error:
            log.warning("wiki check of submission %d failed: %s", submission_id, error)
            raise problem(502, "failed") from error
        if not store.set_check(submission_id, result):
            raise problem(404, "not_found")
        checked = store.submission(submission_id)
        if checked is None:
            raise problem(404, "not_found")
        return on_list(checked)

    @router.delete("/submissions/{submission_id}", dependencies=[Depends(signed_in)])
    def delete(submission_id: int, request: Request) -> dict[str, object]:
        same_site(request)
        if not store.delete_submission(submission_id):
            raise problem(404, "not_found")
        return {"deleted": submission_id}

    @router.get("/export", dependencies=[Depends(signed_in)])
    def export() -> dict[str, object]:
        """Every approved submission as a data/synergies.json entry, for scripts/gamedata.py add-submissions."""
        taken = {s.id for s in data.synergies}
        entries, sources = [], []
        # A combination the curated list has is never exported (add-submissions would refuse the whole file);
        # its rows are listed against the curated entry instead, as a later twin is against the oldest.
        by_combo: dict[str, str] = {s.combo: s.id for s in data.synergies}
        for row in sorted(store.submissions("approved"), key=lambda r: r["id"]):
            combo = combo_key(row["itemIds"], row["trinketIds"], row["characterSlugs"])
            if combo in by_combo:
                # The oldest live one is the entry; a later twin is listed against it, not exported again.
                sources.append(
                    {"id": row["id"], "entry": by_combo[combo], "origin": row["origin"], "sourceUrl": row["sourceUrl"]}
                )
                continue
            entry_id = slug_id(data, row["itemIds"], row["trinketIds"], row["characterSlugs"], taken)
            by_combo[combo] = entry_id
            entries.append(
                {
                    "id": entry_id,
                    "items": [data.item_by_id[i]["name"] for i in row["itemIds"]],
                    "trinkets": [data.trinket_by_id[t]["name"] for t in row["trinketIds"]],
                    "characters": [data.character_by_slug[c]["name"] for c in row["characterSlugs"]],
                    "rating": row["rating"],
                    "description": row["description"],
                }
            )
            sources.append({"id": row["id"], "entry": entry_id, "origin": row["origin"], "sourceUrl": row["sourceUrl"]})
        return {"entries": entries, "submissions": sources}

    return router
