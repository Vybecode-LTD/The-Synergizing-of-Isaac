"""Synergies visitors send for the curated list: by hand, or picked from what the AI read found.

Nothing here reaches the model. The prompt is built from data/ alone (analysis.build_prompt), and a
submission only ever joins data/ through a pull request (decision 0008).
"""

from __future__ import annotations

import logging
import re
import unicodedata
from collections.abc import Callable
from typing import Literal
from urllib.parse import urlsplit

from fastapi import APIRouter, Request
from pydantic import ConfigDict, Field

from .analysis import MAX_DESCRIPTION, MAX_FOUND, SCHEMA, SYSTEM, AnalysisFailed, build_prompt, cache_key, read_answer
from .gamedata import GameData
from .settings import Settings
from .store import LimitReached, Store, Submission
from .web import BuildRequest, check_build, problem

log = logging.getLogger("isaac_toys.submissions")

MAX_URL = 300
SITE_KEY = "sub:*"


class SubmissionRequest(BuildRequest):
    model_config = ConfigDict(populate_by_name=True)

    rating: Literal["S", "A", "B", "C", "D"]
    # Bounded generously here so an overlong text gets a sentence back, not a schema error.
    description: str = Field(max_length=4 * MAX_DESCRIPTION)
    source_url: str | None = Field(default=None, alias="sourceUrl", max_length=4 * MAX_URL)
    # A field people never see. A bot that fills every box fills this one too.
    website: str = Field(default="", max_length=500)


class FromAnalysisRequest(BuildRequest):
    picks: list[int] = Field(min_length=1, max_length=MAX_FOUND)


def plain_text(text: str) -> str:
    """One paragraph of plain text: control characters dropped, whitespace runs made one space."""
    kept = "".join(c for c in unicodedata.normalize("NFC", text) if unicodedata.category(c)[0] != "C" or c in "\n\t")
    return " ".join(kept.split())


def check_url(raw: str | None) -> str | None:
    """A web link or nothing. Anything else (javascript:, a file path, a bare word) is refused."""
    url = (raw or "").strip()
    if not url:
        return None
    parts = urlsplit(url)
    if (
        len(url) > MAX_URL
        or parts.scheme not in ("http", "https")
        or not parts.hostname
        or re.search(r"\s", url)
        or "." not in parts.hostname
    ):
        raise problem(422, "invalid", "The link must be a web address starting with http:// or https://.")
    return url


def routes(
    settings: Settings,
    data: GameData,
    store: Store,
    visitor_of: Callable[[Request], str],
    view: Callable[[], GameData],
) -> APIRouter:
    """`data` is the curated list (the prompt is built from it); `view` adds the live community synergies,
    which the AI's finds are checked against, exactly as /api/analyze does."""
    router = APIRouter(prefix="/api/submissions")

    def keep(entry: Submission, visitor: str) -> tuple[int, bool]:
        """Store one, out of the visitor's daily allowance. A repeat is given back: it added nothing."""
        try:
            reservation = store.reserve(
                f"sub:{visitor}",
                settings.submissions_per_visitor_per_day,
                settings.submissions_site_per_day,
                site_key=SITE_KEY,
            )
        except LimitReached as refused:
            raise problem(429, "submissions_limited") from refused
        found_id, repeat = store.submit(entry, visitor)
        if repeat:
            store.release(reservation)
        return found_id, repeat

    @router.post("")
    def submit(body: SubmissionRequest, request: Request) -> dict[str, object]:
        if body.website.strip():
            log.info("honeypot filled: submission dropped")
            return {"received": True}
        build = check_build(data, body)
        characters = (build.character,) if build.character else ()
        if len(build.items) + len(build.trinkets) + len(characters) < 2:
            raise problem(
                422, "invalid", "A synergy needs at least two things: two pickups, or a pickup and a character."
            )
        description = plain_text(body.description)
        if not description:
            raise problem(422, "invalid", "Say what the combination does.")
        if len(description) > MAX_DESCRIPTION:
            raise problem(422, "invalid", f"Keep it to {MAX_DESCRIPTION} characters.")
        entry = Submission(
            origin="visitor",
            item_ids=tuple(sorted(build.items)),
            trinket_ids=tuple(sorted(build.trinkets)),
            characters=characters,
            rating=body.rating,
            description=description,
            source_url=check_url(body.source_url),
        )
        found_id, repeat = keep(entry, visitor_of(request))
        return {"received": True, "id": found_id, "duplicate": repeat}

    @router.post("/from-analysis")
    def from_analysis(body: FromAnalysisRequest, request: Request) -> dict[str, object]:
        build = check_build(data, body).canonical()
        saved = store.cached(cache_key(settings.ai_model, SYSTEM, build_prompt(data, build), SCHEMA))
        if saved is None:
            raise problem(409, "no_analysis")
        try:
            found = read_answer(saved, view(), build).found
        except AnalysisFailed as error:
            raise problem(409, "no_analysis") from error
        picks = list(dict.fromkeys(body.picks))
        if any(not 0 <= n < len(found) for n in picks):
            raise problem(422, "invalid", "That read didn't find that synergy.")
        visitor = visitor_of(request)
        ids = []
        for n in picks:
            f = found[n]
            entry = Submission(
                origin="ai",
                item_ids=tuple(f["itemIds"]),
                trinket_ids=tuple(f["trinketIds"]),
                characters=tuple(f["characterSlugs"]),
                rating=f["rating"],
                description=f["description"],
            )
            ids.append(keep(entry, visitor)[0])
        return {"received": True, "ids": ids}

    return router
