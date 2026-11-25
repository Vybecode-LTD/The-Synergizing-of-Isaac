from __future__ import annotations

import asyncio
import datetime
import importlib.util
import json
import shutil
import sys
from dataclasses import replace
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import anthropic
import httpx2
import pytest

from app import analysis, parity
from app.analysis import AnalysisFailed, ClaudeAnalyzer
from app.gamedata import Build, GameData
from app.inflight import KeyedLocks
from app.pages import clamp, describe, fit_title, join_names
from app.settings import REPO, Settings
from app.store import SITE, LimitReached, Store

from .conftest import Clock

# ---------------------------------------------------------------- store


def test_store_counts_reserves_and_refunds(clock: Clock) -> None:
    store = Store(clock=clock)
    me = store.visitor("203.0.113.7")
    first = store.reserve(me, 2, 10)
    second = store.reserve(me, 2, 10)
    with pytest.raises(LimitReached) as refused:
        store.reserve(me, 2, 10)
    assert refused.value.code == "rate_limited"
    assert store.used(me) == 2
    store.release(first)
    assert store.used(me) == 1
    store.release(second)
    store.release(second)  # never goes below zero
    assert store.used(me) == 0


def test_store_can_refund_the_visitor_and_keep_the_site_charged(clock: Clock) -> None:
    store = Store(clock=clock)
    me = store.visitor("203.0.113.7")
    store.release(store.reserve(me, 1, 2), site=False)
    assert (store.used(me), store.used(SITE)) == (0, 1)
    store.release(store.reserve(me, 1, 2))
    assert (store.used(me), store.used(SITE)) == (0, 1)


def test_store_checks_the_site_budget_first(clock: Clock) -> None:
    store = Store(clock=clock)
    store.reserve(store.visitor("a"), 5, 1)
    with pytest.raises(LimitReached) as refused:
        store.reserve(store.visitor("b"), 5, 1)
    assert refused.value.code == "budget_exhausted"
    assert store.used(store.visitor("b")) == 0


def test_a_refund_goes_back_to_the_day_it_was_taken_from(clock: Clock) -> None:
    """Review finding: a call reserved before midnight that fails after it refunded the new day's usage."""
    store = Store(clock=clock)
    me, other = store.visitor("203.0.113.7"), store.visitor("198.51.100.9")
    clock.now = datetime.datetime(2026, 11, 24, 23, 59, 50, tzinfo=datetime.UTC)
    late = store.reserve(me, 1, 10)
    assert late.day == "2026-11-24"

    clock.now += datetime.timedelta(seconds=30)  # 00:00:20 on the 25th
    store.reserve(me, 1, 10)  # the visitor's one analysis for the new day
    store.reserve(other, 1, 10)
    store.release(late)  # yesterday's call failed just now

    # The new day is untouched: this visitor has still used their one, and the site two.
    assert store.used(me) == 1
    assert store.used(SITE) == 2
    with pytest.raises(LimitReached):
        store.reserve(me, 1, 10)
    # Yesterday's counters are the ones that went back down.
    clock.now -= datetime.timedelta(seconds=30)
    assert store.used(me) == 0
    assert store.used(SITE) == 0


async def test_keyed_locks_hold_one_key_at_a_time_and_forget_it_afterwards() -> None:
    locks = KeyedLocks()
    order: list[str] = []

    async def work(name: str, key: str) -> None:
        async with locks.hold(key):
            order.append(f"{name} in")
            await asyncio.sleep(0.01)
            order.append(f"{name} out")

    await asyncio.gather(work("a", "k"), work("b", "k"), work("c", "other"))
    assert order.index("a out") < order.index("b in")  # same key: one after the other
    assert order.index("c in") < order.index("a out")  # another key is not held up
    assert len(locks) == 0  # nothing is kept once the work is done


def test_store_never_keeps_an_address_and_survives_a_restart(tmp_path: Path, clock: Clock) -> None:
    path = tmp_path / "var" / "db.sqlite3"
    store = Store(path, clock=clock)
    me = store.visitor("203.0.113.7")
    assert "203.0.113.7" not in me and len(me) == 32
    assert store.visitor("203.0.113.7") == me != store.visitor("203.0.113.8")
    store.reserve(me, 5, 10)
    store.remember("k", "saved answer")
    store.close()
    assert b"203.0.113.7" not in path.read_bytes()

    reopened = Store(path, clock=clock)
    assert reopened.visitor("203.0.113.7") == me  # same salt, so the same visitor
    assert reopened.used(me) == 1
    assert reopened.cached("k") == "saved answer" and reopened.cached("other") is None
    # A different installation hashes the same address differently.
    assert Store(clock=clock).visitor("203.0.113.7") != me


# ---------------------------------------------------------------- rules and pages


def test_the_parity_snapshot_is_current(data: GameData) -> None:
    saved = json.loads((Settings().data_path / "tests" / "parity.json").read_text(encoding="utf-8"))
    assert saved == parity.snapshot(data), "run `python -m app.parity` in api/"
    assert len(saved["pages"]) >= 12 and len(saved["builds"]) >= 8


def test_parity_tool_writes_and_checks(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    copy = tmp_path / "data"
    shutil.copytree(Settings().data_path, copy, ignore=shutil.ignore_patterns("sprites", "sources"))
    monkeypatch.setenv("DATA_PATH", str(copy))
    monkeypatch.setattr(sys, "argv", ["parity", "--check"])
    assert parity.main() == 0
    (copy / "tests" / "parity.json").write_text("{}", encoding="utf-8")
    assert parity.main() == 1 and "out of date" in capsys.readouterr().out
    monkeypatch.setattr(sys, "argv", ["parity"])
    assert parity.main() == 0
    monkeypatch.setattr(sys, "argv", ["parity", "--check"])
    assert parity.main() == 0


def test_rules_match_the_examples_people_know(data: GameData) -> None:
    brim_tammy = Build(items=(118, 38))
    assert [s.id for s in data.find_synergies(brim_tammy)] == ["brimstone+tammys-head"]
    assert data.find_synergies(Build()) == [] and data.suggest_additions(Build()) == []
    # Lilith starts with Box of Friends, so its character synergy applies with nothing picked.
    assert any("box-of-friends" in s.id for s in data.find_synergies(Build(character="lilith")))
    assert data.awaiting_character(Build(character="azazel", items=(619,))) == []
    assert len(data.awaiting_character(Build(items=(619,)))) >= 10
    assert data.top_partners("character", "lilith")[:1] == ["Box of Friends"]


def test_page_text_helpers() -> None:
    assert fit_title(["{name} " + "x" * 70, "{name} short"], {"name": "A"}) == "A short"
    assert clamp("short") == "short"
    cut = clamp("word " * 50)
    assert len(cut) <= 160 and cut.endswith("\N{HORIZONTAL ELLIPSIS}") and " \N{HORIZONTAL ELLIPSIS}" not in cut
    assert clamp("x" * 200) == "x" * 159 + "\N{HORIZONTAL ELLIPSIS}"
    assert [join_names(n) for n in ([], ["A"], ["A", "B"], ["A", "B", "C"])] == ["", "A", "A and B", "A, B and C"]


def test_every_page_fits_the_search_limits_and_has_its_own_title(data: GameData) -> None:
    from app.pages import all_paths

    pages = [describe(p, data, "isaac.toys") for p in all_paths(data)]
    assert [p.path for p in pages if len(p.title) > 60 or len(p.description) > 160 or not p.found] == []
    assert len({p.title for p in pages}) == len(pages)


def test_settings_read_the_environment_and_ignore_nonsense(monkeypatch: pytest.MonkeyPatch) -> None:
    for name, value in {
        "ANTHROPIC_API_KEY": "  ",
        "AI_MODEL": "claude-haiku-5-5",
        "AI_PER_VISITOR_PER_DAY": "3",
        "AI_SITE_PER_DAY": "not a number",
        "CLIENT_IP_HEADER": "X-Evil-Header",
        "SITE_URL": "https://example.test/",
        "ENVIRONMENT": "staging",
    }.items():
        monkeypatch.setenv(name, value)
    s = Settings.from_env()
    assert s.anthropic_api_key is None  # blank is not a key
    assert (s.ai_model, s.per_visitor_per_day, s.site_per_day) == ("claude-haiku-5-5", 3, 200)
    assert s.client_ip_header == "x-forwarded-for"  # only the two known headers are accepted
    assert (s.site_url, s.site_domain, s.indexable) == ("https://example.test", "example.test", False)
    assert replace(s, environment="production").indexable is True


# ---------------------------------------------------------------- the model call


class StubMessages:
    def __init__(self, outcome: Any) -> None:
        self.outcome = outcome
        self.kwargs: dict[str, Any] = {}

    async def create(self, **kwargs: Any) -> Any:
        self.kwargs = kwargs
        if isinstance(self.outcome, Exception):
            raise self.outcome
        return self.outcome


def stub_client(monkeypatch: pytest.MonkeyPatch, outcome: Any) -> StubMessages:
    messages = StubMessages(outcome)
    client = SimpleNamespace(beta=SimpleNamespace(messages=messages))
    monkeypatch.setattr(analysis.anthropic, "AsyncAnthropic", lambda **_: client)
    return messages


def reply(text: str = "Fine.", stop_reason: str = "end_turn") -> Any:
    blocks = [SimpleNamespace(type="thinking", thinking=""), SimpleNamespace(type="text", text=text)]
    return SimpleNamespace(stop_reason=stop_reason, content=blocks)


async def test_calls_the_model_with_low_effort_and_a_refusal_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    messages = stub_client(monkeypatch, reply("  The answer.  "))
    out = await ClaudeAnalyzer(Settings(anthropic_api_key="test-key")).analyze("SYS", "USER")
    assert out == "The answer."
    assert messages.kwargs == {
        "model": "claude-opus-5-5",
        "max_tokens": 4000,
        "system": "SYS",
        "messages": [{"role": "user", "content": "USER"}],
        "output_config": {"effort": "low"},
        "betas": ["server-side-fallback-2026-07-01"],
        "fallbacks": "default",
    }


async def test_a_model_without_server_fallbacks_is_not_sent_the_parameter(monkeypatch: pytest.MonkeyPatch) -> None:
    messages = stub_client(monkeypatch, reply())
    await ClaudeAnalyzer(Settings(anthropic_api_key="k", ai_model="claude-haiku-5-5", ai_effort="medium")).analyze(
        "S", "U"
    )
    assert "fallbacks" not in messages.kwargs and "betas" not in messages.kwargs
    assert messages.kwargs["output_config"] == {"effort": "medium"}


def api_error(cls: type[anthropic.APIStatusError], status: int) -> anthropic.APIStatusError:
    request = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
    return cls("nope", response=httpx2.Response(status, request=request), body=None)


@pytest.mark.parametrize(
    ("outcome", "billed"),
    [
        # The model answered, so the call may have been charged for.
        (reply(stop_reason="refusal"), True),
        (reply(text="   "), True),
        (reply(text="How it plays:\n- Half an ans", stop_reason="max_tokens"), True),
        # The call never produced an answer.
        (api_error(anthropic.RateLimitError, 429), False),
        (api_error(anthropic.InternalServerError, 500), False),
        (anthropic.APIConnectionError(request=httpx2.Request("POST", "https://api.anthropic.com/v1/messages")), False),
    ],
)
async def test_every_way_the_model_can_fail_becomes_one_error_that_says_whether_it_was_paid_for(
    monkeypatch: pytest.MonkeyPatch, outcome: Any, billed: bool
) -> None:
    stub_client(monkeypatch, outcome)
    with pytest.raises(AnalysisFailed) as failed:
        await ClaudeAnalyzer(Settings(anthropic_api_key="k")).analyze("S", "U")
    assert failed.value.billed is billed


# ---------------------------------------------------------------- the data itself


def load_gamedata_script() -> Any:
    spec = importlib.util.spec_from_file_location("gamedata_script", REPO / "scripts" / "gamedata.py")
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_the_shipped_data_validates() -> None:
    assert load_gamedata_script().validate() == []


def test_the_validator_catches_what_it_exists_for(tmp_path: Path) -> None:
    """Positive control: break a copy of the data in the ways the old files were broken."""
    script = load_gamedata_script()
    copy = tmp_path / "data"
    shutil.copytree(REPO / "data", copy)
    synergies = json.loads((copy / "synergies.json").read_text(encoding="utf-8"))
    synergies[0]["trinkets"] = ["A Trinket That Does Not Exist"]
    synergies[1]["characters"] = ["Jacob & Esau"]
    synergies[2]["description"] = "fires " + chr(0xC3) + chr(0xA2) + chr(0x20AC) + " both"
    synergies[3]["rating"] = "Z"
    synergies.append(dict(synergies[4], id="copy-of-4"))
    (copy / "synergies.json").write_text(json.dumps(synergies), encoding="utf-8")
    (copy / "sprites" / "items" / "118.png").unlink()

    problems = "\n".join(script.validate(copy))
    for expected in (
        "unknown trinket 'A Trinket That Does Not Exist'",
        "unknown character 'Jacob & Esau'",
        "garbled characters",
        "rating 'Z'",
        "same combination as",
        "no sprite for 'Brimstone'",
    ):
        assert expected in problems


def test_the_validator_catches_a_broken_transformation_file(tmp_path: Path) -> None:
    """Positive control for data/transformations.json (decision 0006): a clean copy passes, each break is named."""
    script = load_gamedata_script()
    copy = tmp_path / "data"
    shutil.copytree(REPO / "data", copy)
    assert script.validate(copy) == []

    doc = json.loads((copy / "transformations.json").read_text(encoding="utf-8"))
    sets = {t["id"]: t for t in doc["transformations"]}
    sets["beelzebub"]["items"].append(148)  # Infestation, already Repentance+ only
    sets["guppy"]["trinkets"].append(9999)
    sets["bob"]["needs"] = 0
    del sets["stompy"]["revision"]
    sets["fun-guy"]["needs"] = True  # a JSON true is an int to Python (CodeRabbit, PR #6)
    sets["bookworm"]["revision"] = True
    sets["spun"]["items"].append(sets["spun"]["items"][0])
    sets["super-bum"].update(items=[], trinkets=[], plusItems=[], plusTrinkets=[])
    doc["transformations"].append(dict(sets["leviathan"]))
    (copy / "transformations.json").write_text(json.dumps(doc), encoding="utf-8")

    problems = "\n".join(script.validate(copy))
    for expected in (
        "transformation 'beelzebub': [148] in both items and plusItems",
        "transformation 'guppy': unknown trinket id 9999 in trinkets",
        "transformation 'bob': needs must be a whole number above 0",
        "transformation 'stompy': no wiki page and revision",
        "transformation 'fun-guy': needs must be a whole number above 0",
        "transformation 'bookworm': no wiki page and revision",
        "transformation 'spun': repeated id in items",
        "transformation 'super-bum': counts nothing",
        "transformations: duplicate id: leviathan",
        # The built tags no longer match the file: build was not run.
        "item 'Infestation': transformations differs from transformations.json (run build)",
        "item 'Bum Friend': transformations differs from transformations.json (run build)",
    ):
        assert expected in problems


def test_slugs_and_text_repair() -> None:
    script = load_gamedata_script()
    assert script.slugify("Mom's Knife") == "moms-knife"
    assert script.slugify("???'s Only Friend") == "blue-babys-only-friend"
    assert script.slugify("20/20") == "20-20"
    assert script.norm("Jacob & Esau") == script.norm("Jacob and Esau")
    dash = chr(0x2014)
    twice = dash.encode("utf-8").decode("cp1252").encode("utf-8").decode("cp1252", errors="replace")
    assert script.demojibake("plain text") == "plain text"
    assert script.demojibake("a " + dash.encode("utf-8").decode("cp1252") + " b") == f"a {dash} b"
    assert chr(0xC3) in twice
