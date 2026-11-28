"""The wiki check in /admin: POST /api/admin/submissions/{id}/check (decision 0008, point 8)."""

from __future__ import annotations

import json
import sqlite3
from collections.abc import Callable
from dataclasses import replace
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app import wiki
from app.main import create_app
from app.settings import Settings
from app.store import Store
from app.wiki import Page

from .conftest import Clock, FakeAnalyzer
from .test_admin import HASH, HTTPS, LOGIN, sent

CAR_BATTERY, MEGA_MUSH = 356, 625
VISITOR_WORDS = "Car Battery triggers Mega Mush twice, doubling it."  # what a visitor wrote: never sent

PAGES = {
    "Car Battery": Page(
        "Car Battery", 274460, "== Effect ==\n* Doubles actives.\n== Synergies ==\n* {{I|Mega Mush|r+}}: 23 seconds."
    ),
    "Mega Mush": Page(
        "Mega Mush", 268534, "== Effects ==\n* Big.\n== Interactions ==\n* {{i|Car Battery|nr+}}: No effect."
    ),
}


def check_answer(**overrides: object) -> str:
    body: dict[str, object] = {
        "verdict": "repentance_plus_only",
        "rating": "C",
        "description": "Only in Repentance+: the beam lasts about 23 seconds. In Repentance, no effect.",
        "why": "The pair is marked r+ on one page and nr+ on the other.",
        "quotes": [{"page": "Mega Mush", "text": "{{i|Car Battery|nr+}}: No effect."}],
    }
    body.update(overrides)
    return json.dumps(body)


class FakeWiki:
    def __init__(self, pages: dict[str, Page | None]) -> None:
        self.pages = pages
        self.asked: list[str] = []

    async def page(self, title: str) -> Page | None:
        self.asked.append(title)
        return self.pages.get(title)


@pytest.fixture
def store(clock: Clock) -> Store:
    return Store(clock=clock)


@pytest.fixture
def pages() -> FakeWiki:
    return FakeWiki(dict(PAGES))


@pytest.fixture
def make(settings: Settings, store: Store, analyzer: FakeAnalyzer, pages: FakeWiki) -> Callable[..., TestClient]:
    def build(with_ai: bool = True, **overrides: Any) -> TestClient:
        values: dict[str, Any] = {"admin_username": "owner", "admin_password_hash": HASH, **overrides}
        app = create_app(replace(settings, **values), analyzer=analyzer if with_ai else None, store=store, wiki=pages)
        client = TestClient(app, base_url=HTTPS)
        assert client.post("/api/admin/login", json=LOGIN).status_code == 200
        return client

    return build


@pytest.fixture
def owner(make: Callable[..., TestClient], analyzer: FakeAnalyzer) -> TestClient:
    analyzer.raw = check_answer()
    return make()


def a_pair(store: Store) -> int:
    return sent(store, items=(CAR_BATTERY, MEGA_MUSH), origin="ai", rating="S", description=VISITOR_WORDS)


def test_the_check_reads_the_wiki_and_never_sends_the_submitted_words(
    owner: TestClient, store: Store, analyzer: FakeAnalyzer, pages: FakeWiki
) -> None:
    row = a_pair(store)
    r = owner.post(f"/api/admin/submissions/{row}/check")
    assert r.status_code == 200, r.text
    check = r.json()["check"]
    assert check["verdict"] == "repentance_plus_only" and check["rating"] == "C"
    assert check["pages"] == [{"title": "Car Battery", "revision": 274460}, {"title": "Mega Mush", "revision": 268534}]
    assert check["quotes"] == [{"page": "Mega Mush", "text": "{{i|Car Battery|nr+}}: No effect.", "found": True}]
    assert sorted(pages.asked) == ["Car Battery", "Mega Mush"]

    system, user = analyzer.calls[-1]
    assert system == wiki.SYSTEM and analyzer.schemas[-1] == wiki.SCHEMA
    assert "Members of the combination: Car Battery (item); Mega Mush (item)." in user
    assert VISITOR_WORDS not in user and VISITOR_WORDS not in system  # CLAUDE.md rule 5
    assert "* {{I|Mega Mush|r+}}: 23 seconds." in user

    # The check is advice: the submission's own words and rating are unchanged until the owner saves.
    assert r.json()["description"] == VISITOR_WORDS and r.json()["rating"] == "S"
    listed = owner.get("/api/admin/submissions").json()["submissions"][0]
    assert listed["check"] == check


def test_a_row_with_no_check_says_so(owner: TestClient, store: Store) -> None:
    a_pair(store)
    assert owner.get("/api/admin/submissions").json()["submissions"][0]["check"] is None


def test_a_check_needs_the_ai(make: Callable[..., TestClient], store: Store, pages: FakeWiki) -> None:
    r = make(with_ai=False).post(f"/api/admin/submissions/{a_pair(store)}/check")
    assert r.status_code == 503 and r.json()["detail"]["code"] == "not_configured"
    assert pages.asked == []


def test_no_page_read_means_no_model_call(
    owner: TestClient, store: Store, analyzer: FakeAnalyzer, pages: FakeWiki
) -> None:
    pages.pages.clear()
    r = owner.post(f"/api/admin/submissions/{a_pair(store)}/check")
    assert r.status_code == 502 and r.json()["detail"]["code"] == "wiki_unreachable"
    assert analyzer.calls == []
    assert store.used("check") == 0  # nothing spent


def test_one_page_is_enough(owner: TestClient, store: Store, analyzer: FakeAnalyzer, pages: FakeWiki) -> None:
    pages.pages["Mega Mush"] = None
    analyzer.raw = check_answer(quotes=[])
    r = owner.post(f"/api/admin/submissions/{a_pair(store)}/check")
    assert r.status_code == 200
    assert "(No wiki page could be read for Mega Mush.)" in analyzer.calls[-1][1]
    assert r.json()["check"]["pages"] == [{"title": "Car Battery", "revision": 274460}]


@pytest.mark.parametrize("raw", ["not json", check_answer(verdict="maybe")])
def test_an_answer_that_breaks_the_schema_is_a_502_and_keeps_the_old_check(
    owner: TestClient, store: Store, analyzer: FakeAnalyzer, raw: str
) -> None:
    row = a_pair(store)
    first = owner.post(f"/api/admin/submissions/{row}/check").json()["check"]
    analyzer.raw = raw
    r = owner.post(f"/api/admin/submissions/{row}/check")
    assert r.status_code == 502 and r.json()["detail"]["code"] == "failed"
    assert owner.get("/api/admin/submissions").json()["submissions"][0]["check"] == first


def test_a_model_failure_is_a_502(owner: TestClient, store: Store, analyzer: FakeAnalyzer) -> None:
    analyzer.fail = True
    r = owner.post(f"/api/admin/submissions/{a_pair(store)}/check")
    assert r.status_code == 502 and r.json()["detail"]["code"] == "failed"


def test_checks_have_a_daily_ceiling(make: Callable[..., TestClient], store: Store, analyzer: FakeAnalyzer) -> None:
    analyzer.raw = check_answer()
    client = make(admin_checks_per_day=2)
    row = a_pair(store)
    assert [client.post(f"/api/admin/submissions/{row}/check").status_code for _ in range(3)] == [200, 200, 429]
    assert client.post(f"/api/admin/submissions/{row}/check").json()["detail"]["code"] == "checks_limited"
    assert len(analyzer.calls) == 2


def test_a_check_needs_the_owner_and_the_owners_site(owner: TestClient, store: Store) -> None:
    row = a_pair(store)
    stranger = TestClient(owner.app, base_url=HTTPS)
    assert stranger.post(f"/api/admin/submissions/{row}/check").status_code == 401
    r = owner.post(f"/api/admin/submissions/{row}/check", headers={"Origin": "https://evil.example"})
    assert r.status_code == 403 and r.json()["detail"]["code"] == "bad_origin"
    assert owner.post("/api/admin/submissions/999/check").status_code == 404


def test_a_check_on_a_row_deleted_meanwhile_is_a_404(
    owner: TestClient, store: Store, monkeypatch: pytest.MonkeyPatch
) -> None:
    row = a_pair(store)
    monkeypatch.setattr(store, "set_check", lambda _id, _check: False)
    assert owner.post(f"/api/admin/submissions/{row}/check").status_code == 404


def test_an_older_database_file_gains_the_check_column(tmp_path: Path, clock: Clock) -> None:
    path = tmp_path / "old.sqlite3"
    db = sqlite3.connect(path)
    db.execute(
        "CREATE TABLE submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL,"
        " origin TEXT NOT NULL,"
        " combo TEXT NOT NULL, item_ids TEXT NOT NULL, trinket_ids TEXT NOT NULL, characters TEXT NOT NULL,"
        " rating TEXT NOT NULL, description TEXT NOT NULL, source_url TEXT, visitor TEXT NOT NULL,"
        " status TEXT NOT NULL DEFAULT 'new', note TEXT, reviewed_at TEXT)"
    )
    db.execute(
        "INSERT INTO submissions (created_at, origin, combo, item_ids, trinket_ids, characters, rating, description,"
        " visitor) VALUES ('2026-11-27', 'ai', 'i:356.441|t:|c:', '[356,441]', '[]', '[]', 'S', 'Old.', 'v')"
    )
    db.commit()
    db.close()
    store = Store(path, clock=clock)
    [row] = store.submissions()
    assert row["description"] == "Old." and row["check"] is None
    assert store.set_check(row["id"], {"verdict": "none"})
    assert store.submissions()[0]["check"] == {"verdict": "none"}
    store.close()
    assert Store(path, clock=clock).submissions()[0]["check"] == {"verdict": "none"}  # and opens again


def test_a_new_check_changes_what_the_live_list_says(owner: TestClient, store: Store) -> None:
    row = a_pair(store)
    owner.patch(f"/api/admin/submissions/{row}", json={"status": "approved"})
    before = store.revision
    owner.post(f"/api/admin/submissions/{row}/check")
    assert store.revision > before


def test_the_public_list_carries_the_check_and_whether_the_owner_changed_it(owner: TestClient, store: Store) -> None:
    row = a_pair(store)
    owner.patch(f"/api/admin/submissions/{row}", json={"status": "approved"})
    [entry] = owner.get("/api/community").json()["entries"]
    assert entry["check"] is None  # published without a check: the weekly fold leaves it Community

    check = owner.post(f"/api/admin/submissions/{row}/check").json()["check"]
    owner.patch(f"/api/admin/submissions/{row}", json={"rating": check["rating"], "description": check["description"]})
    [entry] = owner.get("/api/community").json()["entries"]
    assert entry["check"] == {
        "date": "2026-11-24",
        "verdict": "repentance_plus_only",
        "why": check["why"],
        "pages": check["pages"],
        "edited": False,
    }
    assert entry["description"] == check["description"] and entry["rating"] == "C"

    owner.patch(f"/api/admin/submissions/{row}", json={"description": "The owner's own words."})
    assert owner.get("/api/community").json()["entries"][0]["check"]["edited"] is True
