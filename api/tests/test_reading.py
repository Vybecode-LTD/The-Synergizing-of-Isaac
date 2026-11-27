"""Reading the model's JSON answer: the read in sections, and the finds checked against the build."""

from __future__ import annotations

import json
import shutil
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.analysis import MAX_LINE, SCHEMA, AnalysisFailed, read_answer
from app.gamedata import Build, GameData

from .conftest import FakeAnalyzer, answer_json, read_of

REPO = Path(__file__).resolve().parents[2]


def find(pieces: list[str], **kw: Any) -> dict[str, Any]:
    return {"pieces": pieces, "only_as_character": False, "tier": "B", "description": "They combine.", **kw}


def answer(**fields: Any) -> str:
    base = json.loads(answer_json())
    return json.dumps({**base, **fields})


BUILD = Build(character="azazel", items=(1, 2, 3, 118), trinkets=(39,))


def test_every_object_in_the_schema_is_closed_and_complete() -> None:
    """Structured outputs need additionalProperties false and every property required, at every level."""

    def walk(node: dict[str, Any]) -> None:
        if node.get("type") == "object":
            assert node["additionalProperties"] is False
            assert sorted(node["required"]) == sorted(node["properties"])
            for child in node["properties"].values():
                walk(child)
        if node.get("type") == "array":
            walk(node["items"])

    walk(SCHEMA)


def test_the_read_comes_back_in_sections(data: GameData) -> None:
    reading = read_answer(answer_json("It plays well."), data, BUILD)
    assert reading.read == read_of("It plays well.")
    assert reading.found == []


def test_stray_markup_and_references_are_taken_out(data: GameData) -> None:
    text = answer(
        how_it_plays=["- **Brimstone** [i118] fires   a beam.", "", "   ", "# Heading", "two", "three", "four"],
        verdict={"tier": "S", "why": "`Strong` [t39]."},
    )
    read = read_answer(text, data, BUILD).read
    assert read["howItPlays"] == ["Brimstone fires a beam.", "Heading", "two"]  # at most three, blanks dropped
    assert read["verdict"] == {"tier": "S", "why": "Strong."}


def test_a_long_line_is_cut_and_marked(data: GameData) -> None:
    line = read_answer(answer(how_it_plays=["word " * 200]), data, BUILD).read["howItPlays"][0]
    assert len(line) == MAX_LINE and line.endswith("\N{HORIZONTAL ELLIPSIS}")


def test_finds_are_kept_only_when_they_fit_the_build(data: GameData) -> None:
    found = read_answer(
        answer(
            synergies_found=[
                find(["i2", "[i1]"], tier="A"),  # kept, sorted, brackets allowed
                find(["i1", "i2"]),  # the same pieces again: dropped
                find(["i1", "i999"]),  # not in the build
                find(["i1", "Brimstone"]),  # not a reference
                find(["i3"]),  # one piece, no character
                find(["i3"], only_as_character=True),  # one piece and the character: kept
                find(["i118", "t39"], description="   "),  # no words
                find(["i2", "i118"]),  # on the curated list already
                find(["i3", "t39"], description="**Bold** words [i3]."),  # kept, cleaned
                find(["i1", "i3"]),  # kept: the fourth
                find(["i2", "i3"]),  # a fifth: over the limit
            ]
        ),
        data,
        BUILD,
    ).found
    assert [(f["itemIds"], f["trinketIds"], f["characterSlugs"], f["rating"]) for f in found] == [
        ([1, 2], [], [], "A"),
        ([3], [], ["azazel"], "B"),
        ([3], [39], [], "B"),
        ([1, 3], [], [], "B"),
    ]
    assert found[2]["description"] == "Bold words."


def test_a_find_that_needs_a_character_needs_one_chosen(data: GameData) -> None:
    found = read_answer(answer(synergies_found=[find(["i3"], only_as_character=True)]), data, Build(items=(3,)))
    assert found.found == []
    # Finding (CodeRabbit, PR #12): with two pickups it passed the count and lost its character condition.
    two = read_answer(answer(synergies_found=[find(["i1", "i3"], only_as_character=True)]), data, Build(items=(1, 3)))
    assert two.found == []


@pytest.mark.parametrize(
    "text",
    [
        "How it plays:\n- An old plain-text answer.",
        "",
        json.dumps({"how_it_plays": ["x"]}),  # missing sections
        answer(verdict={"tier": "Z", "why": "x"}),  # not a tier
        answer(how_it_plays=[], best_interactions=[" "], watch_out_for=[]),  # nothing to say
    ],
)
def test_an_answer_it_cannot_show_is_a_billed_failure(data: GameData, text: str) -> None:
    with pytest.raises(AnalysisFailed) as failed:
        read_answer(text, data, BUILD)
    assert failed.value.billed is True


def test_an_unreadable_answer_refunds_the_visitor_but_not_the_site_and_is_not_saved(
    make_client: Callable[..., TestClient], analyzer: FakeAnalyzer
) -> None:
    client = make_client(per_visitor_per_day=1, site_per_day=2)
    analyzer.raw = "not json at all"
    failed = client.post("/api/analyze", json={"items": [1]})
    assert failed.status_code == 502 and failed.json()["detail"]["code"] == "failed"
    analyzer.raw = None
    ok = client.post("/api/analyze", json={"items": [1]})
    assert ok.status_code == 200 and ok.json()["cached"] is False  # nothing was saved, and the visitor is refunded
    assert len(analyzer.calls) == 2
    # The site paid for both calls, and two is its budget.
    refused = client.post("/api/analyze", json={"items": [2]}, headers={"x-forwarded-for": "198.51.100.9"})
    assert refused.json()["detail"]["code"] == "budget_exhausted"


# ---------------------------------------------------------------- the /admin page


def test_the_admin_page_is_a_page_that_is_never_indexed(client: TestClient) -> None:
    r = client.get("/admin")
    assert r.status_code == 200
    assert r.headers["x-robots-tag"] == "noindex"  # even in production
    html = r.text
    assert '<meta name="robots" content="noindex" />' in html
    assert "<title>Synergy Inbox | isaac.toys</title>" in html
    assert "<h1>Synergy inbox</h1>" in html
    assert 'rel="canonical"' not in html and "application/ld+json" not in html
    assert "/admin" not in client.get("/sitemap.xml").text
    # Every other page is still indexable in production.
    assert "x-robots-tag" not in client.get("/about").headers


# ---------------------------------------------------------------- scripts/gamedata.py add-submissions


@pytest.fixture
def data_copy(tmp_path: Path) -> Path:
    copy = tmp_path / "data"
    shutil.copytree(REPO / "data", copy, ignore=shutil.ignore_patterns("sprites", "sources", "tests"))
    return copy


def script() -> Any:
    from .test_core import load_gamedata_script

    return load_gamedata_script()


ENTRY = {
    "id": "the-inner-eye+the-sad-onion",
    "items": ["The Sad Onion", "The Inner Eye"],
    "trinkets": [],
    "characters": [],
    "rating": "B",
    "description": "  Three   fast tears. ",
}


def test_add_submissions_appends_an_export(data_copy: Path, tmp_path: Path) -> None:
    export = tmp_path / "export.json"
    export.write_text(json.dumps({"entries": [ENTRY], "submissions": []}), encoding="utf-8")
    before = json.loads((data_copy / "synergies.json").read_text(encoding="utf-8"))
    assert script().add_submissions(export, data_copy) == ["the-inner-eye+the-sad-onion"]
    after = json.loads((data_copy / "synergies.json").read_text(encoding="utf-8"))
    assert after[:-1] == before
    assert after[-1] == {**ENTRY, "description": "Three fast tears."}
    # The copy leaves the sprites out, so only those are missing.
    assert [p for p in script().validate(data_copy) if "no sprite" not in p] == []


@pytest.mark.parametrize(
    ("entry", "says"),
    [
        ({**ENTRY, "items": ["The Sad Onion", "Not An Item"]}, "unknown item 'Not An Item'"),
        ({**ENTRY, "rating": "Z"}, "rating 'Z'"),
        ({**ENTRY, "description": " "}, "empty description"),
        ({**ENTRY, "id": "brimstone+tammys-head"}, "missing or duplicate id"),
        ({**ENTRY, "items": ["Tammy's Head", "Brimstone"]}, "same combination as brimstone+tammys-head"),
    ],
)
def test_add_submissions_writes_nothing_when_anything_is_wrong(
    data_copy: Path, tmp_path: Path, entry: dict[str, Any], says: str
) -> None:
    export = tmp_path / "export.json"
    export.write_text(json.dumps([ENTRY | {"id": "fine-one", "items": ["The Sad Onion", "Spoon Bender"]}, entry]))
    before = (data_copy / "synergies.json").read_bytes()
    with pytest.raises(SystemExit) as refused:
        script().add_submissions(export, data_copy)
    assert says in str(refused.value)
    assert (data_copy / "synergies.json").read_bytes() == before
