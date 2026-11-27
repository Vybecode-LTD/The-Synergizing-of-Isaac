"""The AI read on a build: the prompt, the cache key and the model call.

The browser sends only ids. Every word of the prompt comes from this server's own data, so the endpoint
cannot be used as a general-purpose proxy to the model.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from dataclasses import dataclass
from typing import Any, Literal, Protocol

import anthropic
from pydantic import BaseModel, ValidationError

from .gamedata import Build, GameData, combo_key
from .settings import Settings

log = logging.getLogger("isaac_toys.analysis")

SYSTEM = """You explain item builds for The Binding of Isaac: Repentance to a player in the middle of a run.

The message lists the player's character, items and trinkets with facts from the game's own data, and the \
entries from a hand-curated synergy list that apply to this build. Treat those as ground truth. Each item and \
trinket has a reference in square brackets, such as [i118] or [t39].

Where you add mechanics from your own knowledge, keep to what you are confident is true in Repentance. If you \
are unsure how two things interact, say so in plain words instead of guessing. Never invent an item effect.

Answer in the JSON shape you are given. Write plain sentences: no Markdown, no asterisks, no emoji, and never \
a bracketed reference in a sentence. Call each pickup by its name exactly as the message spells it.
- how_it_plays, best_interactions, watch_out_for: one to three short sentences each, one per entry.
- verdict: a tier from S, A, B, C or D for the build as a whole, and one sentence of why.
- synergies_found: interactions between pickups in this build that are worth writing down and that the \
curated entries above do not already cover. Name each one's pieces by reference: at least two, or one with \
only_as_character true when the interaction needs this character. Give it a tier (S run-defining, A strong, \
B good, C minor, D they work against each other) and one or two sentences on what happens. Include only \
interactions you are confident are true in Repentance: at most four, and an empty list when there are none.
Keep the whole answer under 250 words."""

TIERS = ["S", "A", "B", "C", "D"]

# The answer's shape, enforced by the API (structured outputs). Every object closes its properties.
SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "how_it_plays": {"type": "array", "items": {"type": "string"}},
        "best_interactions": {"type": "array", "items": {"type": "string"}},
        "watch_out_for": {"type": "array", "items": {"type": "string"}},
        "verdict": {
            "type": "object",
            "properties": {"tier": {"type": "string", "enum": TIERS}, "why": {"type": "string"}},
            "required": ["tier", "why"],
            "additionalProperties": False,
        },
        "synergies_found": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "pieces": {"type": "array", "items": {"type": "string"}},
                    "only_as_character": {"type": "boolean"},
                    "tier": {"type": "string", "enum": TIERS},
                    "description": {"type": "string"},
                },
                "required": ["pieces", "only_as_character", "tier", "description"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["how_it_plays", "best_interactions", "watch_out_for", "verdict", "synergies_found"],
    "additionalProperties": False,
}

# What the page shows at most: the schema cannot bound lengths, so the server does.
MAX_LINES = 3
MAX_LINE = 400
MAX_FOUND = 4
MAX_DESCRIPTION = 600  # the same as a visitor's own synergy (web/src/hooks/useCustomSynergies.ts)

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
    """The model call did not produce an answer we can show.

    `billed` is True when the model did answer (it declined, said nothing, or was cut off), so the call
    may have been charged for: the visitor gets their analysis back, the site's budget does not.
    """

    def __init__(self, message: str, billed: bool = False) -> None:
        super().__init__(message)
        self.billed = billed


class Analyzer(Protocol):
    async def analyze(self, system: str, user: str) -> str: ...


def _stats(record: dict[str, Any]) -> str:
    parts = []
    for key, value in (record.get("stats") or {}).items():
        name = STAT_NAMES.get(key, key)
        parts.append(f"{name} x{value}" if key.endswith("Mult") else f"{name} {value:+g}")
    return "; ".join(parts)


def _line(ref: str, record: dict[str, Any], extra: str = "") -> str:
    facts = [f for f in (extra, record.get("effect") or "", _stats(record)) if f]
    said = ". ".join(f.rstrip(".") for f in facts) + "." if facts else "no listed effect."
    return f"- [{ref}] {record['name']}: {said}"


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
        lines.append(_line(f"i{item_id}", item, f"quality {item['quality']} of 4, {item['type']} item"))
    if not build.items:
        lines.append("- none")

    if build.trinkets:
        lines.append("")
        lines.append("Trinkets:")
        lines.extend(_line(f"t{t}", data.trinket_by_id[t]) for t in build.trinkets)

    lines.append("")
    lines.append("Entries from the curated synergy list that apply to this build:")
    matched = data.find_synergies(build)
    for s in matched:
        who = f" (as {' or '.join(data.character_names(s))})" if s.character_slugs else ""
        lines.append(f"- [{s.rating}] {' + '.join(data.piece_names(s))}{who}: {s.description}")
    if not matched:
        lines.append("- none: the list has nothing for this exact combination")
    return "\n".join(lines)


def cache_key(model: str, system: str, prompt: str, schema: dict[str, Any] | None = None) -> str:
    """A saved answer belongs to the model, to every word it was told and to the shape it answered in.

    Hashing the text, not the ids, means a corrected synergy, a changed item fact, a reworded system
    prompt or a changed schema stops the old answer being served, with nothing to remember to bump. Build
    the prompt from `Build.canonical()` so pick order does not change the key.
    """
    parts: list[Any] = [model, system, prompt] if schema is None else [model, system, prompt, schema]
    return hashlib.sha256(json.dumps(parts, sort_keys=True).encode()).hexdigest()


# ---------------------------------------------------------------- reading the answer

REF = re.compile(r"^\[?([it])(\d+)\]?$")
MARKUP = re.compile(r"\*\*|__|`|^#+\s*|^[-*•]\s+")


class _Verdict(BaseModel):
    tier: Literal["S", "A", "B", "C", "D"]
    why: str


class _Found(BaseModel):
    pieces: list[str]
    only_as_character: bool
    tier: Literal["S", "A", "B", "C", "D"]
    description: str


class _Answer(BaseModel):
    how_it_plays: list[str]
    best_interactions: list[str]
    watch_out_for: list[str]
    verdict: _Verdict
    synergies_found: list[_Found]


@dataclass(frozen=True)
class Reading:
    """The answer as the page shows it: the read in sections, and the finds checked against the build."""

    read: dict[str, Any]
    found: list[dict[str, Any]]


def _clean(text: str, limit: int) -> str:
    """One plain sentence or two: stray Markdown and bracketed references removed, the length bounded."""
    line = MARKUP.sub("", " ".join(text.split()))
    line = re.sub(r"\s*\[[it]\d+\]", "", line).strip()
    return line if len(line) <= limit else line[: limit - 1].rstrip() + "\N{HORIZONTAL ELLIPSIS}"


def _lines(texts: list[str]) -> list[str]:
    return [line for line in (_clean(t, MAX_LINE) for t in texts) if line][:MAX_LINES]


def read_answer(text: str, data: GameData, build: Build, max_found: int = MAX_FOUND) -> Reading:
    """Check the model's JSON and turn it into what the page shows. Raises AnalysisFailed when it can't.

    A find survives only if every piece it names is in this build, it has at least two requirements (two
    pickups, or one and the build's character), and no curated entry has the same pickups: the visitor is
    shown what the list lacks, never a copy of a card already on screen.

    Each find carries `key`, its combination: what the browser sends back to pick it, so a pick means the
    same find however the live list changed in between (PR #12 review).
    """
    try:
        answer = _Answer.model_validate_json(text)
    except ValidationError as error:
        raise AnalysisFailed("the answer did not match the schema", billed=True) from error

    read = {
        "howItPlays": _lines(answer.how_it_plays),
        "bestInteractions": _lines(answer.best_interactions),
        "watchOutFor": _lines(answer.watch_out_for),
        "verdict": {"tier": answer.verdict.tier, "why": _clean(answer.verdict.why, MAX_LINE)},
    }
    if not (read["howItPlays"] or read["bestInteractions"] or read["watchOutFor"]):
        raise AnalysisFailed("the answer had nothing to say", billed=True)

    found: list[dict[str, Any]] = []
    seen: set[str] = set()
    for f in answer.synergies_found:
        items: set[int] = set()
        trinkets: set[int] = set()
        for piece in f.pieces:
            match = REF.match(piece.strip())
            if match is None:
                break
            ref = int(match.group(2))
            if match.group(1) == "i" and ref in build.items:
                items.add(ref)
            elif match.group(1) == "t" and ref in build.trinkets:
                trinkets.add(ref)
            else:
                break
        else:
            if f.only_as_character and not build.character:
                continue  # it holds only for a character, and none is chosen: it cannot be stated for this build
            characters = [build.character] if f.only_as_character and build.character else []
            pieces = (tuple(sorted(items)), tuple(sorted(trinkets)))
            description = _clean(f.description, MAX_DESCRIPTION)
            combo = combo_key(pieces[0], pieces[1], characters)
            if (
                len(items) + len(trinkets) + len(characters) < 2
                or not description
                or pieces in data.synergies_by_pieces
                or combo in seen
            ):
                continue
            seen.add(combo)
            found.append(
                {
                    "key": combo,
                    "itemIds": list(pieces[0]),
                    "trinketIds": list(pieces[1]),
                    "characterSlugs": characters,
                    "rating": f.tier,
                    "description": description,
                }
            )
            if len(found) == max_found:
                break
    return Reading(read=read, found=found)


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
            "output_config": {"effort": s.ai_effort, "format": {"type": "json_schema", "schema": SCHEMA}},
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
            raise AnalysisFailed("the model declined", billed=True)
        if response.stop_reason == "max_tokens":
            # Thinking counts toward the limit. Half an answer must not be saved as this build's answer.
            raise AnalysisFailed(f"cut off at {s.ai_max_tokens} tokens: raise AI_MAX_TOKENS", billed=True)
        text = "\n".join(block.text for block in response.content if block.type == "text").strip()
        if not text:
            raise AnalysisFailed("empty answer", billed=True)
        return text
