"""The owner's inbox at /api/admin: sign-in, sessions, review and export (decision 0008)."""

from __future__ import annotations

import datetime
import json
from collections.abc import Callable
from dataclasses import replace
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app import admin_password
from app.main import create_app
from app.settings import Settings
from app.store import Store, Submission

from .conftest import Clock

PASSWORD = "correct horse battery staple"
# Cheap parameters keep the suite fast; the real value uses admin_password's defaults.
HASH = admin_password.hash_password(PASSWORD, n=2**4, r=8, p=1)
LOGIN = {"username": "owner", "password": PASSWORD}
HTTPS = "https://testserver"


@pytest.fixture
def store(clock: Clock) -> Store:
    return Store(clock=clock)


@pytest.fixture
def make(settings: Settings, store: Store) -> Callable[..., TestClient]:
    """A client for the site. Production (the default fixture) sets Secure cookies, so it talks https."""

    def build(**overrides: Any) -> TestClient:
        values: dict[str, Any] = {"admin_username": "owner", "admin_password_hash": HASH, **overrides}
        base = HTTPS if replace(settings, **values).indexable else "http://testserver"
        return TestClient(create_app(replace(settings, **values), store=store), base_url=base)

    return build


@pytest.fixture
def owner(make: Callable[..., TestClient]) -> TestClient:
    client = make()
    assert client.post("/api/admin/login", json=LOGIN).status_code == 200
    return client


def sent(store: Store, items: tuple[int, ...] = (1, 2), origin: str = "visitor", visitor: str = "v1", **kw: Any) -> int:
    entry = Submission(
        origin=origin,
        item_ids=items,
        trinket_ids=kw.get("trinkets", ()),
        characters=kw.get("characters", ()),
        rating=kw.get("rating", "B"),
        description=kw.get("description", "They work together."),
        source_url=kw.get("source_url"),
    )
    [(row_id, _)] = store.submit_all(
        [entry], visitor, counter=f"sub:{visitor}", per_visitor=99, site_key="sub:*", site=999
    )
    return row_id


# ---------------------------------------------------------------- the password


def test_a_password_hash_checks_the_password_it_was_made_from() -> None:
    stored = admin_password.hash_password(PASSWORD, n=2**4, p=1)
    assert stored.startswith("scrypt$16$8$1$")
    assert admin_password.verify(PASSWORD, stored)
    assert not admin_password.verify(PASSWORD + "!", stored)
    assert not admin_password.verify(PASSWORD, None)
    assert admin_password.hash_password(PASSWORD, n=2**4, p=1) != stored  # a fresh salt every time


def test_the_same_letters_typed_two_ways_are_the_same_password() -> None:
    composed, decomposed = "café au lait every morning", "café au lait every morning"
    assert admin_password.verify(decomposed, admin_password.hash_password(composed, n=2**4, p=1))


@pytest.mark.parametrize(
    "stored",
    [
        "",
        "plain-password",
        "bcrypt$1$2$3$4$5",
        "scrypt$15$8$1$c2FsdHNhbHQ=$" + "A" * 44,
        "scrypt$16$8$1$!!$!!",
        "scrypt$16$8$1$c2FsdHNhbHQ=$c2hvcnQ=",
        "scrypt$16$0$1$c2FsdHNhbHQ=$" + "A" * 44,
    ],
)
def test_a_value_it_did_not_write_is_never_accepted(stored: str) -> None:
    assert admin_password.parse(stored) is None
    assert not admin_password.verify("anything at all", stored)


def test_new_passwords_need_length_not_rules() -> None:
    assert admin_password.problem_with("short") is not None
    assert admin_password.problem_with("a" * 20) is not None  # one character, repeated
    assert admin_password.problem_with("x" * 257) is not None
    assert admin_password.problem_with("plain lowercase words only") is None


def test_the_default_cost_is_owasp_strength() -> None:
    n, r, p, _, _ = admin_password.parse(admin_password.hash_password("x" * 20))  # type: ignore[misc]
    assert (n, r, p) == (2**14, 8, 5)


def test_settings_never_print_the_secrets() -> None:
    shown = repr(Settings(anthropic_api_key="sk-secret", admin_password_hash=HASH))
    assert "sk-secret" not in shown and HASH not in shown


# ---------------------------------------------------------------- signing in


def test_without_settings_there_is_no_admin(make: Callable[..., TestClient]) -> None:
    client = make(admin_username=None, admin_password_hash=None)
    assert client.get("/api/admin/session").json() == {"configured": False, "signedIn": False, "username": None}
    assert client.post("/api/admin/login", json=LOGIN).json()["detail"]["code"] == "admin_off"
    r = client.get("/api/admin/submissions")
    assert r.status_code == 503 and r.json()["detail"]["code"] == "admin_off"


def test_a_hash_it_cannot_read_turns_the_admin_off(make: Callable[..., TestClient]) -> None:
    client = make(admin_password_hash=PASSWORD)  # the password pasted where the hash belongs
    assert client.get("/api/admin/session").json()["configured"] is False
    assert client.post("/api/admin/login", json=LOGIN).status_code == 503


def test_signing_in_sets_a_locked_down_cookie(make: Callable[..., TestClient]) -> None:
    client = make()
    r = client.post("/api/admin/login", json=LOGIN)
    assert r.status_code == 200 and r.json() == {"configured": True, "signedIn": True, "username": "owner"}
    cookie = r.headers["set-cookie"]
    assert cookie.startswith("__Host-isaac_admin=")
    for flag in ("HttpOnly", "Secure", "Path=/", "SameSite=strict", "Max-Age=43200"):
        assert flag in cookie
    assert "Domain" not in cookie
    assert client.get("/api/admin/session").json() == {"configured": True, "signedIn": True, "username": "owner"}


def test_outside_production_the_cookie_works_over_plain_http(make: Callable[..., TestClient]) -> None:
    client = make(environment="development")
    cookie = client.post("/api/admin/login", json=LOGIN).headers["set-cookie"]
    assert cookie.startswith("isaac_admin=") and "Secure" not in cookie
    assert client.get("/api/admin/session").json()["signedIn"] is True


def test_a_wrong_name_and_a_wrong_password_get_the_same_answer(make: Callable[..., TestClient]) -> None:
    client = make()
    wrong_password = client.post("/api/admin/login", json={**LOGIN, "password": "nope"})
    wrong_name = client.post("/api/admin/login", json={**LOGIN, "username": "admin"})
    assert wrong_password.status_code == wrong_name.status_code == 401
    assert (
        wrong_password.json()
        == wrong_name.json()
        == {"detail": {"code": "wrong_login", "message": "That username and password don't match."}}
    )
    assert "set-cookie" not in wrong_password.headers


def test_a_wrong_name_still_costs_a_full_hash(make: Callable[..., TestClient], monkeypatch: pytest.MonkeyPatch) -> None:
    checked: list[str | None] = []
    real = admin_password.verify
    monkeypatch.setattr(admin_password, "verify", lambda pw, stored: checked.append(stored) or real(pw, stored))
    make().post("/api/admin/login", json={**LOGIN, "username": "admin"})
    assert checked == [None]  # verify(…, None) runs the dummy hash


def test_ten_wrong_tries_lock_that_visitor_out_for_the_day(make: Callable[..., TestClient], clock: Clock) -> None:
    client = make()
    for _ in range(10):
        assert client.post("/api/admin/login", json={**LOGIN, "password": "guess"}).status_code == 401
    locked = client.post("/api/admin/login", json=LOGIN)
    assert locked.status_code == 429 and locked.json()["detail"]["code"] == "too_many_attempts"
    # Somebody else is not locked out by it, so nobody can lock the owner out from elsewhere.
    other = client.post("/api/admin/login", json=LOGIN, headers={"x-forwarded-for": "198.51.100.4"})
    assert other.status_code == 200
    clock.now += datetime.timedelta(days=1)
    assert client.post("/api/admin/login", json=LOGIN).status_code == 200


def test_a_right_sign_in_does_not_use_up_the_tries(make: Callable[..., TestClient]) -> None:
    client = make()
    for _ in range(12):
        assert client.post("/api/admin/login", json=LOGIN).status_code == 200


def test_every_sign_in_gets_a_new_token(make: Callable[..., TestClient]) -> None:
    client = make()
    client.cookies.set("__Host-isaac_admin", "planted-by-someone-else", domain="testserver.local")
    client.post("/api/admin/login", json=LOGIN)
    first = client.cookies.get("__Host-isaac_admin")
    assert first and first != "planted-by-someone-else"
    client.post("/api/admin/login", json=LOGIN)
    assert client.cookies.get("__Host-isaac_admin") != first
    stale = make()
    stale.cookies.set("__Host-isaac_admin", first, domain="testserver.local")
    assert stale.get("/api/admin/session").json()["signedIn"] is False


@pytest.mark.parametrize(
    "headers",
    [{"origin": "https://evil.example"}, {"sec-fetch-site": "cross-site"}, {"sec-fetch-site": "same-site"}],
)
def test_another_site_cannot_sign_in_or_change_anything(
    owner: TestClient, store: Store, headers: dict[str, str]
) -> None:
    row = sent(store)
    for r in (
        owner.post("/api/admin/login", json=LOGIN, headers=headers),
        owner.patch(f"/api/admin/submissions/{row}", json={"status": "approved"}, headers=headers),
        owner.delete(f"/api/admin/submissions/{row}", headers=headers),
        owner.post("/api/admin/logout", headers=headers),
    ):
        assert r.status_code == 403 and r.json()["detail"]["code"] == "bad_origin"
    assert store.submission(row)["status"] == "new"  # type: ignore[index]
    assert owner.get("/api/admin/session").json()["signedIn"] is True


def test_the_site_itself_can(owner: TestClient, store: Store) -> None:
    row = sent(store)
    same = {"origin": HTTPS, "sec-fetch-site": "same-origin"}
    assert owner.patch(f"/api/admin/submissions/{row}", json={"status": "approved"}, headers=same).status_code == 200


# ---------------------------------------------------------------- sessions


def test_signing_out_ends_the_session(owner: TestClient) -> None:
    token = owner.cookies.get("__Host-isaac_admin")
    assert owner.post("/api/admin/logout").json()["signedIn"] is False
    assert owner.get("/api/admin/submissions").status_code == 401
    owner.cookies.set("__Host-isaac_admin", token or "", domain="testserver.local")
    assert owner.get("/api/admin/submissions").json()["detail"]["code"] == "signed_out"


def test_a_session_ends_after_two_idle_hours(owner: TestClient, clock: Clock) -> None:
    clock.now += datetime.timedelta(hours=1, minutes=59)
    assert owner.get("/api/admin/submissions").status_code == 200
    clock.now += datetime.timedelta(hours=1, minutes=59)  # used a minute ago, so still alive
    assert owner.get("/api/admin/submissions").status_code == 200
    clock.now += datetime.timedelta(hours=2)
    assert owner.get("/api/admin/submissions").status_code == 401


def test_a_session_ends_twelve_hours_after_sign_in_however_busy(owner: TestClient, clock: Clock) -> None:
    for _ in range(11):
        clock.now += datetime.timedelta(hours=1)
        assert owner.get("/api/admin/submissions").status_code == 200
    clock.now += datetime.timedelta(hours=1)
    assert owner.get("/api/admin/submissions").status_code == 401


def test_changing_the_password_signs_out_everywhere(owner: TestClient, make: Callable[..., TestClient]) -> None:
    token = owner.cookies.get("__Host-isaac_admin") or ""
    after = make(admin_password_hash=admin_password.hash_password("a brand new long password", n=2**4, p=1))
    after.cookies.set("__Host-isaac_admin", token, domain="testserver.local")
    assert after.get("/api/admin/session").json()["signedIn"] is False
    renamed = make(admin_username="someone-else")
    renamed.cookies.set("__Host-isaac_admin", token, domain="testserver.local")
    assert renamed.get("/api/admin/submissions").status_code == 401


def test_nothing_in_the_inbox_without_signing_in(make: Callable[..., TestClient], store: Store) -> None:
    client = make()
    row = sent(store)
    for r in (
        client.get("/api/admin/submissions"),
        client.patch(f"/api/admin/submissions/{row}", json={"status": "approved"}),
        client.delete(f"/api/admin/submissions/{row}"),
        client.get("/api/admin/export"),
    ):
        assert r.status_code == 401 and r.json()["detail"]["code"] == "signed_out"
    client.cookies.set("__Host-isaac_admin", "made-up", domain="testserver.local")
    assert client.get("/api/admin/submissions").status_code == 401


def test_admin_answers_are_never_cached(owner: TestClient) -> None:
    assert owner.get("/api/admin/submissions").headers["cache-control"] == "no-store"
    assert owner.get("/api/admin/session").headers["cache-control"] == "no-store"


# ---------------------------------------------------------------- the inbox


def test_the_inbox_lists_new_ones_by_default(owner: TestClient, store: Store) -> None:
    a = sent(store, (1, 2), source_url="https://example.com/wiki")
    b = sent(store, (38, 118), origin="ai")  # on the curated list already
    sent(store, (1, 2), visitor="v2")
    store.review(a, {"status": "rejected"})
    body = owner.get("/api/admin/submissions").json()
    assert body["counts"] == {"new": 2, "approved": 0, "rejected": 1, "added": 0}
    rows = body["submissions"]
    assert [r["id"] for r in rows] == [3, b]
    assert rows[1]["onList"] == ["brimstone+tammys-head"] and rows[1]["origin"] == "ai"
    assert rows[0]["onList"] == [] and rows[0]["alsoSent"] == 1
    everything = owner.get("/api/admin/submissions?status=all").json()["submissions"]
    assert [r["id"] for r in everything] == [3, b, a]
    assert everything[2]["sourceUrl"] == "https://example.com/wiki"
    assert owner.get("/api/admin/submissions?status=bogus").status_code == 422


def test_the_owner_can_edit_and_approve(owner: TestClient, store: Store, clock: Clock) -> None:
    row = sent(store)
    r = owner.patch(
        f"/api/admin/submissions/{row}",
        json={"status": "approved", "rating": "A", "description": "  Checked on the wiki.\n", "note": "wiki 2026-11"},
    )
    assert r.status_code == 200
    got = r.json()
    assert (got["status"], got["rating"], got["description"], got["note"]) == (
        "approved",
        "A",
        "Checked on the wiki.",
        "wiki 2026-11",
    )
    assert got["reviewedAt"] == clock.now.isoformat()
    cleared = owner.patch(f"/api/admin/submissions/{row}", json={"note": "   "}).json()
    assert cleared["note"] is None and cleared["status"] == "approved"


@pytest.mark.parametrize(
    "body", [{"status": "published"}, {"rating": "Z"}, {"description": "  "}, {"description": "x" * 601}]
)
def test_the_owner_cannot_save_nonsense(owner: TestClient, store: Store, body: dict[str, Any]) -> None:
    row = sent(store)
    assert owner.patch(f"/api/admin/submissions/{row}", json=body).status_code == 422
    assert store.submission(row)["status"] == "new"  # type: ignore[index]


def test_a_submission_that_is_not_there(owner: TestClient) -> None:
    assert owner.patch("/api/admin/submissions/99", json={"status": "approved"}).status_code == 404
    assert owner.delete("/api/admin/submissions/99").json()["detail"]["code"] == "not_found"


def test_the_owner_can_delete_spam(owner: TestClient, store: Store) -> None:
    row = sent(store)
    assert owner.delete(f"/api/admin/submissions/{row}").json() == {"deleted": row}
    assert store.submissions() == []


def test_the_export_is_ready_for_add_submissions(owner: TestClient, store: Store) -> None:
    plain = sent(store, (1, 2), source_url="https://example.com/a", rating="A", description="Fast triple tears.")
    with_more = sent(store, (118,), trinkets=(39,), characters=("azazel",), origin="ai")
    twin = sent(store, (38, 118), description="A better description.")  # same pieces as a curated entry
    sent(store, (1, 3))  # not approved: left out
    for row in (plain, with_more, twin):
        store.review(row, {"status": "approved"})
    body = owner.get("/api/admin/export").json()
    assert body["entries"] == [
        {
            "id": "the-inner-eye+the-sad-onion",
            "items": ["The Sad Onion", "The Inner Eye"],
            "trinkets": [],
            "characters": [],
            "rating": "A",
            "description": "Fast triple tears.",
        },
        {
            "id": "brimstone+t-cancer+c-azazel",
            "items": ["Brimstone"],
            "trinkets": ["Cancer"],
            "characters": ["Azazel"],
            "rating": "B",
            "description": "They work together.",
        },
    ]
    # A combination the curated list has is not exported (add-submissions would refuse the whole file); its
    # row is listed against the curated entry.
    assert {"id": twin, "entry": "brimstone+tammys-head", "origin": "visitor", "sourceUrl": None} in body["submissions"]
    assert body["submissions"][0] == {
        "id": plain,
        "entry": "the-inner-eye+the-sad-onion",
        "origin": "visitor",
        "sourceUrl": "https://example.com/a",
    }
    assert json.loads(json.dumps(body)) == body


def test_only_one_submission_per_combination_can_be_live(owner: TestClient, store: Store) -> None:
    """Finding (PR #12 review): two live rows for one combination showed twice and broke the backup import."""
    first = sent(store, (1, 2), visitor="v1")
    second = sent(store, (1, 2), visitor="v2", description="Other words.")
    ai = sent(store, (1, 2), origin="ai", visitor="v1")
    assert owner.patch(f"/api/admin/submissions/{first}", json={"status": "approved"}).status_code == 200
    for row in (second, ai):
        refused = owner.patch(f"/api/admin/submissions/{row}", json={"status": "approved"})
        assert refused.status_code == 409 and refused.json()["detail"]["code"] == "already_live"
        assert store.submission(row)["status"] == "new"  # type: ignore[index]
    # Editing the live one is fine, and once it is unpublished another can take its place.
    assert owner.patch(f"/api/admin/submissions/{first}", json={"status": "approved", "rating": "S"}).status_code == 200
    owner.patch(f"/api/admin/submissions/{first}", json={"status": "rejected"})
    assert owner.patch(f"/api/admin/submissions/{second}", json={"status": "approved"}).status_code == 200
    # A different character is a different combination.
    other = sent(store, (1, 2), characters=("azazel",), visitor="v3")
    assert owner.patch(f"/api/admin/submissions/{other}", json={"status": "approved"}).status_code == 200


def test_the_export_lists_a_later_twin_against_the_oldest_entry(owner: TestClient, store: Store) -> None:
    """Rows published by the store directly (or before the one-live rule) still export one entry each."""
    first = sent(store, (1, 2), visitor="v1", description="Oldest.")
    second = sent(store, (1, 2), visitor="v2", description="Newer.")
    for row in (first, second):
        store.review(row, {"status": "approved"})
    body = owner.get("/api/admin/export").json()
    assert [e["description"] for e in body["entries"]] == ["Oldest."]
    assert [(s["id"], s["entry"]) for s in body["submissions"]] == [
        (first, "the-inner-eye+the-sad-onion"),
        (second, "the-inner-eye+the-sad-onion"),
    ]


# ---------------------------------------------------------------- CodeRabbit review of PR #12


def test_a_username_that_is_not_ascii_works(make: Callable[..., TestClient]) -> None:
    """Finding: the session check compared str with compare_digest, which refuses non-ASCII text."""
    client = make(admin_username="José")
    assert client.post("/api/admin/login", json={**LOGIN, "username": "José"}).status_code == 200
    assert client.get("/api/admin/session").json()["signedIn"] is True
    assert client.get("/api/admin/submissions").status_code == 200


def test_a_submission_deleted_while_it_is_being_saved_is_a_404(
    owner: TestClient, store: Store, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Finding: a delete between the update and the read-back hit an assert (a 500)."""
    row = sent(store)
    monkeypatch.setattr(store, "submission", lambda _id: None)
    r = owner.patch(f"/api/admin/submissions/{row}", json={"note": "x"})
    assert r.status_code == 404 and r.json()["detail"]["code"] == "not_found"
