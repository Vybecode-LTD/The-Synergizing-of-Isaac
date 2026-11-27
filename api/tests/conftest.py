from __future__ import annotations

import datetime
import json
from collections.abc import Callable
from dataclasses import replace
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.analysis import AnalysisFailed
from app.gamedata import GameData
from app.main import create_app
from app.settings import Settings
from app.store import Store


def answer_json(line: str = "It plays well.", found: list[dict[str, Any]] | None = None, tier: str = "A") -> str:
    """An answer in the shape the model is held to (analysis.SCHEMA)."""
    return json.dumps(
        {
            "how_it_plays": [line],
            "best_interactions": ["Brimstone and Tammy's Head fire lasers in every direction."],
            "watch_out_for": [],
            "verdict": {"tier": tier, "why": "Strong damage."},
            "synergies_found": found or [],
        }
    )


def read_of(line: str = "It plays well.", tier: str = "A") -> dict[str, Any]:
    """What the page is sent for answer_json(line)."""
    return {
        "howItPlays": [line],
        "bestInteractions": ["Brimstone and Tammy's Head fire lasers in every direction."],
        "watchOutFor": [],
        "verdict": {"tier": tier, "why": "Strong damage."},
    }


class FakeAnalyzer:
    """Stands in for the model: records what it was asked and answers, or fails, on demand."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, str]] = []
        self.fail = False
        self.billed = False
        self.found: list[dict[str, Any]] = []
        self.raw: str | None = None  # answer this text instead, to test what the server does with it

    async def analyze(self, system: str, user: str) -> str:
        self.calls.append((system, user))
        if self.fail:
            raise AnalysisFailed("boom", billed=self.billed)
        return self.raw if self.raw is not None else answer_json(f"Answer number {len(self.calls)}.", self.found)


class Clock:
    def __init__(self) -> None:
        self.now = datetime.datetime(2026, 11, 24, 12, 0, tzinfo=datetime.UTC)

    def __call__(self) -> datetime.datetime:
        return self.now


@pytest.fixture(scope="session")
def data() -> GameData:
    return GameData.load(Settings().data_path)


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    # No web build and a throwaway folder: tests never touch the real dist or the real database.
    return replace(Settings(), web_dist=tmp_path / "no-dist", data_dir=tmp_path / "var", environment="production")


@pytest.fixture
def analyzer() -> FakeAnalyzer:
    return FakeAnalyzer()


@pytest.fixture
def clock() -> Clock:
    return Clock()


@pytest.fixture
def make_client(settings: Settings, analyzer: FakeAnalyzer, clock: Clock) -> Callable[..., TestClient]:
    def make(with_ai: bool = True, **overrides: object) -> TestClient:
        app = create_app(
            replace(settings, **overrides),  # type: ignore[arg-type]
            analyzer=analyzer if with_ai else None,
            store=Store(clock=clock),
        )
        return TestClient(app)

    return make


@pytest.fixture
def client(make_client: Callable[..., TestClient]) -> TestClient:
    return make_client()
