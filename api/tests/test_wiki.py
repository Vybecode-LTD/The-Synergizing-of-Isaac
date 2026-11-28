"""The wiki check's reading of pages and of the model's answer (api/app/wiki.py, decision 0008 point 8)."""

from __future__ import annotations

import datetime
import json

import httpx
import pytest

from app import wiki
from app.wiki import Member, Page

NOW = datetime.datetime(2026, 11, 28, 12, 0, tzinfo=datetime.UTC)

# Shaped like the wiki's real pages: an Effects section, then bullets with version marks under headings.
CAR_BATTERY = Page(
    title="Car Battery",
    revision=274460,
    wikitext="""{{infobox passive collectible}}
== Effect ==
* Causes eligible [[activated item]]s to have their effects doubled or otherwise upgraded.

== Notes ==
* Works with the pocket active item.

== Synergies ==
* {{i|Box of Friends}}: Two copies of each familiar.
* {{I|Mega Blast|r+}}: Extends the length of the effect from 15 seconds to 23 seconds.
** Not while the beam is already firing.
* {{i|The Hourglass}}: Doubles the length of the effect.

== No Effect ==
* {{I|Genesis}}
* {{I|Mega Blast|anr+}}

== Trivia ==
* Mega Blast was once said to be doubled.
""",
)

MEGA_BLAST = Page(
    title="Mega Blast",
    revision=268534,
    wikitext="""== Effects ==
* Upon use, Isaac fires a giant laser for 15 seconds.
** The laser deals Isaac's damage multiplied by 5 per tick.

== Interactions ==
* [[Familiar]]s fire normal tears.
* Batteries:
** {{i|Car Battery|nr+}}: No effect.
*** Unlike most items.
* {{i|Anti-Gravity}}: No effect.
""",
)


def answer(**overrides: object) -> str:
    body: dict[str, object] = {
        "verdict": "repentance_plus_only",
        "rating": "C",
        "description": "Only in Repentance+: the beam lasts about 23 seconds.",
        "why": "Both pages mark the line r+ and nr+.",
        "quotes": [{"page": "Car Battery", "text": "* {{I|Mega Blast|r+}}: Extends the length of the effect"}],
    }
    body.update(overrides)
    return json.dumps(body)


# ---------------------------------------------------------------- excerpts


def test_an_excerpt_keeps_the_effects_and_only_the_lines_naming_another_member() -> None:
    found = wiki.excerpt(CAR_BATTERY, ["Mega Blast"])
    assert found.effects == [
        "* Causes eligible [[activated item]]s to have their effects doubled or otherwise upgraded."
    ]
    assert found.pairs == [
        ("synergies", "* {{I|Mega Blast|r+}}: Extends the length of the effect from 15 seconds to 23 seconds."),
        ("synergies", "** Not while the beam is already firing."),
        ("no effect", "* {{I|Mega Blast|anr+}}"),
    ]
    # Trivia is not a section the check reads, though it names the member.
    assert all("once said" not in line for _, line in found.pairs)


def test_a_nested_line_keeps_the_bullet_above_it_and_the_ones_below() -> None:
    found = wiki.excerpt(MEGA_BLAST, ["Car Battery"])
    assert [line for _, line in found.pairs] == [
        "* Batteries:",
        "** {{i|Car Battery|nr+}}: No effect.",
        "*** Unlike most items.",
    ]


def test_a_name_counts_only_whole() -> None:
    assert wiki.names_any("* {{i|Car Battery}}: doubled.", ["Car Battery"])
    assert not wiki.names_any("* {{i|Car Battery}}: doubled.", ["The Battery"])
    assert wiki.names_any("* {{i|The Battery}}: overcharge.", ["the battery"])
    # A longer name that holds a member's name whole still counts: an extra line, never a missed one.
    assert wiki.names_any("* {{i|Brimstone Bombs}}", ["Brimstone"])


def test_the_prompt_names_the_members_and_says_which_page_could_not_be_read() -> None:
    members = [Member("item", "Car Battery"), Member("item", "Mega Blast"), Member("trinket", "Missing Thing")]
    text, excerpts = wiki.prompt(members, {"Car Battery": CAR_BATTERY, "Mega Blast": MEGA_BLAST, "Missing Thing": None})
    first = "Members of the combination: Car Battery (item); Mega Blast (item); Missing Thing (trinket)."
    assert text.startswith(first)
    assert "## Page: Car Battery (revision 274460)" in text
    assert "[No Effect]\n* {{I|Mega Blast|anr+}}" in text
    assert "(No wiki page could be read for Missing Thing.)" in text
    assert set(excerpts) == {"Car Battery", "Mega Blast"}


# ---------------------------------------------------------------- the answer


def test_a_quote_from_the_excerpt_is_found_and_an_invented_one_is_not() -> None:
    pages = {"Car Battery": CAR_BATTERY, "Mega Blast": MEGA_BLAST}
    _, excerpts = wiki.prompt([Member("item", "Car Battery"), Member("item", "Mega Blast")], pages)
    quotes = [
        {"page": "Car Battery", "text": "{{I|Mega Blast|r+}}: Extends the length of the effect"},
        {"page": "Mega Blast", "text": "{{i|Car Battery|nr+}}: No effect."},
        {"page": "Car Battery", "text": "Car Battery doubles Mega Blast's damage."},  # invented
        {"page": "Car Battery", "text": "Mega Blast was once said to be doubled."},  # on the page, but not shown
    ]
    check = wiki.read_check(answer(quotes=quotes), pages, excerpts, NOW)
    assert [q["found"] for q in check["quotes"]] == [True, True, False, False]
    assert check["pages"] == [{"title": "Car Battery", "revision": 274460}, {"title": "Mega Blast", "revision": 268534}]
    assert check["checkedAt"] == "2026-11-28T12:00:00+00:00"
    assert check["verdict"] == "repentance_plus_only" and check["rating"] == "C"


def test_the_answer_is_trimmed_to_its_limits() -> None:
    long = "word " * 400
    check = wiki.read_check(answer(description=long, why=long, quotes=[{"page": "x", "text": "q"}] * 9), {}, {}, NOW)
    assert len(check["description"]) <= wiki.MAX_DESCRIPTION
    assert len(check["why"]) <= wiki.MAX_WHY
    assert len(check["quotes"]) == wiki.MAX_QUOTES


@pytest.mark.parametrize(
    "text",
    [
        "not json",
        answer(verdict="maybe"),
        answer(rating="Z"),
        answer(description="   "),
        json.dumps({"verdict": "none"}),
    ],
)
def test_an_answer_that_breaks_the_schema_is_refused(text: str) -> None:
    with pytest.raises(ValueError):
        wiki.read_check(text, {}, {}, NOW)


def test_the_public_check_says_whether_the_owner_changed_the_words() -> None:
    check = wiki.read_check(answer(), {"Car Battery": CAR_BATTERY}, {}, NOW)
    same = wiki.public_check(check, "C", check["description"])
    assert same == {
        "date": "2026-11-28",
        "verdict": "repentance_plus_only",
        "why": "Both pages mark the line r+ and nr+.",
        "pages": [{"title": "Car Battery", "revision": 274460}],
        "edited": False,
    }
    assert wiki.public_check(check, "B", check["description"])["edited"] is True  # type: ignore[index]
    assert wiki.public_check(None, "B", "words") is None


# ---------------------------------------------------------------- the client


class _Reply:
    def __init__(self, body: object) -> None:
        self._body = body

    def json(self) -> object:
        if isinstance(self._body, Exception):
            raise self._body
        return self._body


@pytest.mark.asyncio
async def test_the_client_reads_a_page_and_its_revision(monkeypatch: pytest.MonkeyPatch) -> None:
    asked: dict[str, object] = {}

    async def get(self: object, url: str, params: dict[str, str]) -> _Reply:
        asked.update(url=url, **params)
        return _Reply({"parse": {"title": "Car Battery", "revid": 274460, "wikitext": "== Effect =="}})

    monkeypatch.setattr("httpx.AsyncClient.get", get)
    page = await wiki.WikiClient().page("Car Battery")
    assert page == Page("Car Battery", 274460, "== Effect ==")
    assert asked["url"] == wiki.API and asked["page"] == "Car Battery" and asked["redirects"] == "1"


@pytest.mark.asyncio
@pytest.mark.parametrize("body", [{"error": {"code": "missingtitle"}}, ValueError("not json"), ["odd"]])
async def test_the_client_answers_none_for_a_missing_page_or_a_bad_reply(
    monkeypatch: pytest.MonkeyPatch, body: object
) -> None:
    async def get(self: object, url: str, params: dict[str, str]) -> _Reply:
        return _Reply(body)

    monkeypatch.setattr("httpx.AsyncClient.get", get)
    assert await wiki.WikiClient().page("Nothing") is None


@pytest.mark.asyncio
async def test_the_client_answers_none_when_the_wiki_cannot_be_reached(monkeypatch: pytest.MonkeyPatch) -> None:
    async def get(self: object, url: str, params: dict[str, str]) -> _Reply:
        raise httpx.ConnectError("no route")

    monkeypatch.setattr("httpx.AsyncClient.get", get)
    assert await wiki.WikiClient().page("Car Battery") is None


def test_a_quote_counts_only_on_the_page_it_names() -> None:
    """Finding (CodeRabbit, PR #14): a quote naming a page the model was not given was looked up on every page,
    so it could carry an invented page and found=true. Now the page must be one read (its title or the member
    it was read for, in any case), or the quote is not found."""
    pages = {"Car battery": CAR_BATTERY, "Mega Blast": MEGA_BLAST}  # the member's name differs in case
    _, excerpts = wiki.prompt([Member("item", "Car battery"), Member("item", "Mega Blast")], pages)
    line = "{{I|Mega Blast|r+}}: Extends the length of the effect"
    quotes = [
        {"page": "Made Up Page", "text": line},  # the words are on Car Battery's page, the page is invented
        {"page": "Mega Blast", "text": line},  # a real page, but not the one these words are on
        {"page": "car battery", "text": line},  # the member's name, in another case: the page it was read for
        {"page": "Car Battery", "text": line},  # the wiki's own title
    ]
    check = wiki.read_check(answer(quotes=quotes), pages, excerpts, NOW)
    assert [(q["page"], q["found"]) for q in check["quotes"]] == [
        ("Made Up Page", False),
        ("Mega Blast", False),
        ("Car Battery", True),
        ("Car Battery", True),
    ]
