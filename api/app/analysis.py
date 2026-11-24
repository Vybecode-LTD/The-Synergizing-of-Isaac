"""The AI read on a build: the prompt, the cache key and the model call.

The browser sends only ids. Every word of the prompt comes from this server's own data, so the endpoint
cannot be used as a general-purpose proxy to the model.
"""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Any, Protocol

import anthropic

from .gamedata import Build, GameData
from .settings import Settings

log = logging.getLogger("issac_toys.analysis")

# Bump when the prompt changes: saved answers for the old prompt stop being served.
PROMPT_VERSION = "1"

SYSTEM = """You explain item builds for The Binding of Isaac: Repentance to a player in the middle of a run.

The message lists the player's character, items and trinkets with facts from the game's own data, and the \
entries from a hand-curated synergy list that apply to this build. Treat those as ground truth.

Where you add mechanics from your own knowledge, keep to what you are confident is true in Repentance. If you \
are unsure how two things interact, say so in plain words instead of guessing. Never invent an item effect.

Write plain text: no Markdown, no asterisks, no emoji. Use exactly these four headings, each on its own line \
and ending with a colon, in this order:
How it plays:
Best interactions:
Watch out for:
Verdict:

Under each of the first three, write one to three short lines starting with "- ". Under Verdict, write one \
line: a tier from S, A, B, C or D for the build as a whole, then one sentence of why. Keep the whole answer \
under 200 words."""

STAT_NAMES = {
    "damage": "damage",
    "damageMult": "damage multiplier",
    "tears": "tears",
    "tearsMult": "tears multiplier",
    "range": "range",
    "speed": "speed",
    "shotSpeed": "shot speed",
    "luck": "luck",
    "redHearts": "red heart containers",
    "soulHearts": "soul hearts",
    "blackHearts": "black hearts",
    "boneHearts": "bone hearts",
}

# Models that accept the server-side refusal fallback (see the claude-api skill).
FALLBACK_MODELS = {"claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-2", "claude-fable-5-1"}
FALLBACK_BETA = "server-side-fallback-2026-07-01"


class AnalysisFailed(Exception):
    """The model call did not produce an answer we can show."""


class Analyzer(Protocol):
    async def analyze(self, system: str, user: str) -> str: ...


def _stats(record: dict[str, Any]) -> str:
    parts = []
    for key, value in (record.get("stats") or {}).items():
        name = STAT_NAMES.get(key, key)
        parts.append(f"{name} x{value}" if key.endswith("Mult") else f"{name} {value:+g}")
    return "; ".join(parts)


def _line(record: dict[str, Any], extra: str = "") -> str:
    facts = [f for f in (extra, record.get("effect") or "", _stats(record)) if f]
    return f"- {record['name']}: " + (". ".join(f.rstrip(".") for f in facts) + "." if facts else "no listed effect.")


def build_prompt(data: GameData, build: Build) -> str:
    """The user message for a build. Deterministic: the same build always gives the same text."""
    lines: list[str] = []
    character = data.character_by_slug.get(build.character or "")
    if character:
        start = [data.item_by_id[i]["name"] for i in character.get("startingItems", [])]
        if character.get("pocketActive") is not None:
            start.append(data.item_by_id[character["pocketActive"]]["name"])
        lines.append(f"Character: {character['name']}" + (f" (starts with {', '.join(start)})" if start else ""))
    else:
        lines.append("Character: not chosen")

    lines.append("")
    lines.append("Items:")
    for item_id in build.items:
        item = data.item_by_id[item_id]
        lines.append(_line(item, f"quality {item['quality']} of 4, {item['type']} item"))
    if not build.items:
        lines.append("- none")

    if build.trinkets:
        lines.append("")
        lines.append("Trinkets:")
        lines.extend(_line(data.trinket_by_id[t]) for t in build.trinkets)

    lines.append("")
    lines.append("Entries from the curated synergy list that apply to this build:")
    matched = data.find_synergies(build)
    for s in matched:
        who = f" (as {' or '.join(data.character_names(s))})" if s.character_slugs else ""
        lines.append(f"- [{s.rating}] {' + '.join(data.piece_names(s))}{who}: {s.description}")
    if not matched:
        lines.append("- none: the list has nothing for this exact combination")
    return "\n".join(lines)


def cache_key(model: str, build: Build) -> str:
    """Order of pickup does not change a build, so sort before hashing."""
    canonical = json.dumps(
        {
            "v": PROMPT_VERSION,
            "model": model,
            "c": build.character,
            "i": sorted(build.items),
            "t": sorted(build.trinkets),
        },
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode()).hexdigest()


class ClaudeAnalyzer:
    """Calls Claude through the official SDK."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=45.0, max_retries=1)

    async def analyze(self, system: str, user: str) -> str:
        s = self._settings
        params: dict[str, Any] = {
            "model": s.ai_model,
            "max_tokens": s.ai_max_tokens,
            "system": system,
            "messages": [{"role": "user", "content": user}],
            "output_config": {"effort": s.ai_effort},
        }
        if s.ai_model in FALLBACK_MODELS:
            # If a safety classifier declines, the API reruns the request on a fallback model in the same call.
            params.update(betas=[FALLBACK_BETA], fallbacks="default")
        # The model and effort come from configuration as plain strings, so the call is made untyped.
        create: Any = self._client.beta.messages.create
        try:
            response = await create(**params)
        except anthropic.RateLimitError as error:
            raise AnalysisFailed("rate limited upstream") from error
        except anthropic.APIStatusError as error:
            log.error("anthropic status %s (request %s)", error.status_code, error.request_id)
            raise AnalysisFailed(f"upstream status {error.status_code}") from error
        except anthropic.APIConnectionError as error:
            raise AnalysisFailed("could not reach the model") from error

        if response.stop_reason == "refusal":
            raise AnalysisFailed("the model declined")
        text = "\n".join(block.text for block in response.content if block.type == "text").strip()
        if not text:
            raise AnalysisFailed("empty answer")
        return text
