"""The wiki check in /admin (decision 0008, point 8): what the Binding of Isaac wiki says about a combination.

The server reads each member's page through the wiki's API and keeps only what bears on the combination:
the page's Effects section, and every bullet under Notes, Synergies, Interactions or No Effect that names
another member, with the bullet above it and the ones below. The model gets the members' names and those
excerpts, never the words a visitor sent (CLAUDE.md rule 5), and writes the synergy from the wiki. Every
line it quotes is looked up in the excerpts, so an invented quote shows as not found.
"""

from __future__ import annotations

import datetime
import logging
import re
from dataclasses import dataclass
from typing import Any, Literal, Protocol

import httpx
from pydantic import BaseModel, ValidationError

log = logging.getLogger("isaac_toys.wiki")

WIKI = "https://bindingofisaacrebirth.wiki.gg"
API = f"{WIKI}/api.php"
USER_AGENT = "isaac.toys wiki check (https://isaac.toys)"
PAIR_SECTIONS = ("notes", "synergies", "interactions", "no effect")
MAX_EFFECTS = 3000  # characters of a page's Effects section
MAX_PAIRS = 4000  # characters of its lines naming the other members
MAX_DESCRIPTION = 600  # the same as a submission's words (analysis.MAX_DESCRIPTION)
MAX_WHY = 300
MAX_QUOTES = 6
VERDICTS = ("on_wiki", "from_effects", "repentance_plus_only", "none")
Verdict = Literal["on_wiki", "from_effects", "repentance_plus_only", "none"]
Rating = Literal["S", "A", "B", "C", "D"]

SYSTEM = """You check synergies for isaac.toys, a companion site for The Binding of Isaac: Repentance, against \
excerpts from the Binding of Isaac wiki. You are given the members of one combination (items, trinkets, \
characters) and, for each, its wiki page's Effects section and the page's lines that name another member.

Rules:
- Judge for Repentance. Lines carry version marks such as {{dlc|r}} or {{i|Car Battery|r+}}: a = Afterbirth, \
a+ = Afterbirth+, r = Repentance, r+ = Repentance+; an "n" in front means "no longer, from that version on" \
(nr+ = true until Repentance+, not after). A line true only before Repentance does not count.
- An effect that exists only in Repentance+ may stand, but the description must begin "Only in Repentance+:" \
and say what Repentance itself does.
- Use only what the excerpts say. No numbers, effects or claims from memory. If no line names the pair, you \
may still describe what each member's own effects do together, and nothing more.
- Write the description in your own words, plainly, for a player, in at most three sentences. Do not copy \
wiki markup.
- Rate S (run-defining), A (strong), B (good), C (minor), D (harmful or a trap).
- verdict: "on_wiki" when a line names the pair; "from_effects" when none does but the members' own effects \
support the description; "repentance_plus_only" when it works only in Repentance+; "none" when the members \
do nothing together in Repentance or Repentance+ (then say so in the description and rate D or C).
- why: one short sentence on what decided the verdict.
- quotes: up to six lines the verdict rests on, each copied exactly from one excerpt (a whole line or part of \
one), with the page it came from."""

SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "verdict": {"type": "string", "enum": list(VERDICTS)},
        "rating": {"type": "string", "enum": ["S", "A", "B", "C", "D"]},
        "description": {"type": "string"},
        "why": {"type": "string"},
        "quotes": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {"page": {"type": "string"}, "text": {"type": "string"}},
                "required": ["page", "text"],
            },
        },
    },
    "required": ["verdict", "rating", "description", "why", "quotes"],
}


@dataclass(frozen=True)
class Page:
    title: str  # the wiki's own title, after redirects
    revision: int
    wikitext: str


class Wiki(Protocol):
    async def page(self, title: str) -> Page | None: ...


class WikiClient:
    """Reads a page's wikitext and revision through the wiki's API. None when there is no such page or the
    wiki cannot be reached: the check goes on with the pages it could read."""

    def __init__(self, timeout: float = 10.0) -> None:
        self._timeout = timeout

    async def page(self, title: str) -> Page | None:
        params = {
            "action": "parse",
            "page": title,
            "prop": "wikitext|revid",
            "format": "json",
            "formatversion": "2",
            "redirects": "1",
        }
        try:
            async with httpx.AsyncClient(timeout=self._timeout, headers={"User-Agent": USER_AGENT}) as client:
                reply = await client.get(API, params=params)
            body = reply.json()
        except (httpx.HTTPError, ValueError) as error:
            log.warning("wiki page %r could not be read: %s", title, type(error).__name__)
            return None
        parsed = body.get("parse") if isinstance(body, dict) else None
        if not isinstance(parsed, dict) or not isinstance(parsed.get("wikitext"), str):
            return None  # "missingtitle" and the like
        return Page(
            title=str(parsed.get("title") or title),
            revision=int(parsed.get("revid") or 0),
            wikitext=parsed["wikitext"],
        )


# ---------------------------------------------------------------- what a page says about the others

_HEADING = re.compile(r"^(={2,6})\s*(.*?)\s*\1$")


def _depth(line: str) -> int:
    """How deep a bullet is: the number of leading asterisks (0 for a line that is not a bullet)."""
    return len(line) - len(line.lstrip("*"))


def names_any(line: str, names: list[str]) -> bool:
    """Whether a line names one of the members, as a whole name ("The Battery" is not in "Car Battery")."""
    low = line.lower()
    return any(re.search(rf"(?<![\w']){re.escape(name.lower())}(?![\w'])", low) for name in names if name)


@dataclass(frozen=True)
class Excerpt:
    effects: list[str]
    pairs: list[tuple[str, str]]  # (section, line), in page order

    def text(self) -> str:
        return "\n".join([*self.effects, *(line for _, line in self.pairs)])


def excerpt(page: Page, others: list[str]) -> Excerpt:
    """The page's Effects section, and the bullets naming another member with their parent and children."""
    lines = [line.rstrip() for line in page.wikitext.splitlines()]
    sections: list[str] = []
    section = ""
    for line in lines:
        heading = _HEADING.match(line.strip())
        if heading and len(heading.group(1)) == 2:
            section = heading.group(2).strip().lower()
        sections.append(section)

    effects: list[str] = []
    size = 0
    for line, sec in zip(lines, sections, strict=True):
        if sec.startswith("effect") and line.strip() and not _HEADING.match(line.strip()) and size < MAX_EFFECTS:
            effects.append(line)
            size += len(line)

    picked: set[int] = set()
    for n, line in enumerate(lines):
        if sections[n] not in PAIR_SECTIONS or not _depth(line) or not names_any(line, others):
            continue
        picked.add(n)
        depth = _depth(line)
        # The bullet above, so "** with this item" keeps the line it qualifies.
        for up in range(n - 1, -1, -1):
            if sections[up] != sections[n] or not _depth(lines[up]):
                break
            if _depth(lines[up]) < depth:
                picked.add(up)
                depth = _depth(lines[up])
                if depth == 1:
                    break
        # The bullets below it, which qualify it.
        for down in range(n + 1, len(lines)):
            if sections[down] != sections[n] or _depth(lines[down]) <= _depth(line):
                break
            picked.add(down)

    pairs: list[tuple[str, str]] = []
    size = 0
    for n in sorted(picked):
        if size >= MAX_PAIRS:
            break
        pairs.append((sections[n], lines[n]))
        size += len(lines[n])
    return Excerpt(effects=effects, pairs=pairs)


@dataclass(frozen=True)
class Member:
    kind: Literal["item", "trinket", "character"]
    name: str


def prompt(members: list[Member], pages: dict[str, Page | None]) -> tuple[str, dict[str, Excerpt]]:
    """The check's prompt, from the members' names and their pages. Returns the excerpts too, keyed by the
    wiki's title, so the quotes can be looked up in exactly what the model saw."""
    names = [m.name for m in members]
    parts = ["Members of the combination: " + "; ".join(f"{m.name} ({m.kind})" for m in members) + "."]
    excerpts: dict[str, Excerpt] = {}
    for member in members:
        page = pages.get(member.name)
        if page is None:
            parts.append(f"\n## {member.name}\n(No wiki page could be read for {member.name}.)")
            continue
        found = excerpt(page, [n for n in names if n != member.name])
        excerpts[page.title] = found
        parts.append(f"\n## Page: {page.title} (revision {page.revision})")
        parts.append("Effects:\n" + ("\n".join(found.effects) or "(none found)"))
        if found.pairs:
            body, current = [], None
            for section, line in found.pairs:
                if section != current:
                    body.append(f"[{section.title()}]")
                    current = section
                body.append(line)
            parts.append("Lines naming the other members:\n" + "\n".join(body))
        else:
            parts.append("Lines naming the other members: none.")
    return "\n".join(parts), excerpts


# ---------------------------------------------------------------- the model's answer


class _Quote(BaseModel):
    page: str
    text: str


class _Check(BaseModel):
    verdict: Verdict
    rating: Rating
    description: str
    why: str
    quotes: list[_Quote]


def _clean(text: str, limit: int) -> str:
    return " ".join(text.split())[:limit].strip()


def _flat(text: str) -> str:
    """Text as compared for quotes: bullets and spacing ignored, case kept."""
    return " ".join(text.replace("*", " ").split())


def read_check(
    text: str, pages: dict[str, Page | None], excerpts: dict[str, Excerpt], now: datetime.datetime
) -> dict[str, Any]:
    """The check as stored on the submission. ValueError when the answer does not fit the schema."""
    try:
        answer = _Check.model_validate_json(text)
    except ValidationError as error:
        raise ValueError("the check's answer does not fit its schema") from error
    description = _clean(answer.description, MAX_DESCRIPTION)
    if not description:
        raise ValueError("the check came back with no description")
    quotes = []
    for quote in answer.quotes[:MAX_QUOTES]:
        said = _flat(quote.text)
        if not said:
            continue
        # Looked up on the page it names, or on any page when it names one the model was not given.
        where = [excerpts[quote.page]] if quote.page in excerpts else list(excerpts.values())
        quotes.append({"page": quote.page, "text": said[:400], "found": any(said in _flat(e.text()) for e in where)})
    read = {p.title: p for p in pages.values() if p is not None}
    return {
        "checkedAt": now.isoformat(),
        "verdict": answer.verdict,
        "rating": answer.rating,
        "description": description,
        "why": _clean(answer.why, MAX_WHY),
        "pages": [{"title": p.title, "revision": p.revision} for p in read.values()],
        "quotes": quotes,
    }


def public_check(check: dict[str, Any] | None, rating: str, description: str) -> dict[str, Any] | None:
    """What /api/community says about a live synergy's check: enough for data/synergy-checks.md."""
    if not check:
        return None
    return {
        "date": str(check.get("checkedAt", ""))[:10],
        "verdict": check.get("verdict"),
        "why": check.get("why", ""),
        "pages": check.get("pages", []),
        "edited": check.get("description") != description or check.get("rating") != rating,
    }
