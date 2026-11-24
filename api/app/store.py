"""Saved answers and the daily counters, in one small SQLite file.

Nothing here identifies a visitor: counters are keyed by a salted hash of the IP address, and the salt is
random per installation.
"""

from __future__ import annotations

import datetime
import hashlib
import secrets
import sqlite3
import threading
from collections.abc import Callable
from pathlib import Path

SITE = "*"

SCHEMA = """
CREATE TABLE IF NOT EXISTS analysis_cache (key TEXT PRIMARY KEY, text TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS usage (day TEXT NOT NULL, visitor TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0,
                                  PRIMARY KEY (day, visitor));
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
"""


def utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.UTC)


class Store:
    def __init__(self, path: Path | str = ":memory:", clock: Callable[[], datetime.datetime] = utc_now) -> None:
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._db = sqlite3.connect(str(path), check_same_thread=False, isolation_level=None)
        self._lock = threading.Lock()
        self._clock = clock
        with self._lock:
            self._db.executescript(SCHEMA)
            self._db.execute("INSERT OR IGNORE INTO meta (key, value) VALUES ('salt', ?)", (secrets.token_hex(32),))
            self._salt = self._db.execute("SELECT value FROM meta WHERE key = 'salt'").fetchone()[0]

    def close(self) -> None:
        with self._lock:
            self._db.close()

    # ------------------------------------------------------------ visitors

    def visitor(self, ip: str) -> str:
        """A stable stand-in for an IP address that cannot be turned back into one."""
        return hashlib.sha256(f"{self._salt}:{ip}".encode()).hexdigest()[:32]

    def _day(self) -> str:
        return self._clock().date().isoformat()

    def _count(self, day: str, visitor: str) -> int:
        row = self._db.execute("SELECT count FROM usage WHERE day = ? AND visitor = ?", (day, visitor)).fetchone()
        return int(row[0]) if row else 0

    def used(self, visitor: str) -> int:
        with self._lock:
            return self._count(self._day(), visitor)

    def reserve(self, visitor: str, per_visitor: int, site: int) -> str | None:
        """Take one analysis from today's allowance. Returns None, or which limit refused it."""
        day = self._day()
        with self._lock:
            self._db.execute("BEGIN IMMEDIATE")
            try:
                if self._count(day, SITE) >= site:
                    return "budget_exhausted"
                if self._count(day, visitor) >= per_visitor:
                    return "rate_limited"
                for who in (SITE, visitor):
                    self._db.execute(
                        "INSERT INTO usage (day, visitor, count) VALUES (?, ?, 1) "
                        "ON CONFLICT (day, visitor) DO UPDATE SET count = count + 1",
                        (day, who),
                    )
                return None
            finally:
                self._db.execute("COMMIT")

    def release(self, visitor: str) -> None:
        """Give an analysis back when the model call failed: the visitor got nothing for it."""
        day = self._day()
        with self._lock:
            for who in (SITE, visitor):
                self._db.execute(
                    "UPDATE usage SET count = count - 1 WHERE day = ? AND visitor = ? AND count > 0", (day, who)
                )

    # ------------------------------------------------------------ cache

    def cached(self, key: str) -> str | None:
        with self._lock:
            row = self._db.execute("SELECT text FROM analysis_cache WHERE key = ?", (key,)).fetchone()
        return row[0] if row else None

    def remember(self, key: str, text: str) -> None:
        with self._lock:
            self._db.execute(
                "INSERT OR REPLACE INTO analysis_cache (key, text, created_at) VALUES (?, ?, ?)",
                (key, text, self._clock().isoformat()),
            )
