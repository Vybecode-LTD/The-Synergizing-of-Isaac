"""Saved answers and the daily counters, in one small SQLite file.

Nothing here identifies a visitor: counters are keyed by a salted hash of the IP address, and the salt is
random per installation.
"""

from __future__ import annotations

import datetime
import hashlib
import json
import secrets
import sqlite3
import threading
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .gamedata import combo_key

SITE = "*"

SCHEMA = """
CREATE TABLE IF NOT EXISTS analysis_cache (key TEXT PRIMARY KEY, text TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS usage (day TEXT NOT NULL, visitor TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0,
                                  PRIMARY KEY (day, visitor));
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    origin TEXT NOT NULL,
    combo TEXT NOT NULL,
    item_ids TEXT NOT NULL,
    trinket_ids TEXT NOT NULL,
    characters TEXT NOT NULL,
    rating TEXT NOT NULL,
    description TEXT NOT NULL,
    source_url TEXT,
    visitor TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    note TEXT,
    reviewed_at TEXT,
    check_json TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS submissions_once ON submissions (visitor, origin, combo);
CREATE INDEX IF NOT EXISTS submissions_by_status ON submissions (status, id);
CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    secret_tag TEXT NOT NULL,
    created_at TEXT NOT NULL,
    seen_at TEXT NOT NULL
);
"""

STATUSES = ("new", "approved", "rejected", "added")
SESSION_LIFETIME = datetime.timedelta(hours=12)
SESSION_IDLE = datetime.timedelta(hours=2)


class LimitReached(Exception):
    """Today's allowance is used up. `code` says whose: "rate_limited" (visitor) or "budget_exhausted" (site)."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


@dataclass(frozen=True)
class Reservation:
    """One analysis taken from a day's allowance. Kept so a refund goes back to the same day."""

    visitor: str
    day: str
    site_key: str = SITE
    amount: int = 1


def utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.UTC)


class Store:
    def __init__(self, path: Path | str = ":memory:", clock: Callable[[], datetime.datetime] = utc_now) -> None:
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._db = sqlite3.connect(str(path), check_same_thread=False, isolation_level=None)
        self._lock = threading.Lock()
        self._clock = clock
        self._revision = 0
        with self._lock:
            self._db.executescript(SCHEMA)
            # A file made before the wiki check (2026-11-28) has the table without its column.
            columns = {row[1] for row in self._db.execute("PRAGMA table_info(submissions)")}
            if "check_json" not in columns:
                self._db.execute("ALTER TABLE submissions ADD COLUMN check_json TEXT")
            self._db.execute("INSERT OR IGNORE INTO meta (key, value) VALUES ('salt', ?)", (secrets.token_hex(32),))
            self._salt = self._db.execute("SELECT value FROM meta WHERE key = 'salt'").fetchone()[0]

    def close(self) -> None:
        with self._lock:
            self._db.close()

    # ------------------------------------------------------------ visitors

    def visitor(self, ip: str) -> str:
        """A stable stand-in for an IP address that cannot be turned back into one."""
        return hashlib.sha256(f"{self._salt}:{ip}".encode()).hexdigest()[:32]

    def now(self) -> datetime.datetime:
        return self._clock()

    def _day(self) -> str:
        return self._clock().date().isoformat()

    def _count(self, day: str, visitor: str) -> int:
        row = self._db.execute("SELECT count FROM usage WHERE day = ? AND visitor = ?", (day, visitor)).fetchone()
        return int(row[0]) if row else 0

    def used(self, visitor: str) -> int:
        with self._lock:
            return self._count(self._day(), visitor)

    def bump(self, key: str) -> int:
        """Add one to today's count for a key (a failed sign-in, say) and return the new count."""
        day = self._day()
        with self._lock:
            self._db.execute(
                "INSERT INTO usage (day, visitor, count) VALUES (?, ?, 1) "
                "ON CONFLICT (day, visitor) DO UPDATE SET count = count + 1",
                (day, key),
            )
            return self._count(day, key)

    def reserve(self, visitor: str, per_visitor: int, site: int, site_key: str = SITE, amount: int = 1) -> Reservation:
        """Take `amount` from today's allowance, all or none, or raise LimitReached.

        The AI's counters are keyed by the visitor and SITE. Other allowances (submissions) pass their own
        prefixed keys, so they share the table and the midnight reset but never each other's counts.
        """
        day = self._day()
        with self._lock:
            self._db.execute("BEGIN IMMEDIATE")
            try:
                if self._count(day, site_key) + amount > site:
                    raise LimitReached("budget_exhausted")
                if self._count(day, visitor) + amount > per_visitor:
                    raise LimitReached("rate_limited")
                for who in (site_key, visitor):
                    self._db.execute(
                        "INSERT INTO usage (day, visitor, count) VALUES (?, ?, ?) "
                        "ON CONFLICT (day, visitor) DO UPDATE SET count = count + ?",
                        (day, who, amount, amount),
                    )
                return Reservation(visitor=visitor, day=day, site_key=site_key, amount=amount)
            finally:
                self._db.execute("COMMIT")

    def release(self, reservation: Reservation, *, site: bool = True, amount: int | None = None) -> None:
        """Give an analysis back when the model call failed: the visitor got nothing for it.

        The refund goes to the day the reservation was taken from, not today: a call reserved just before
        midnight UTC that fails just after must not hand back an analysis somebody used on the new day.

        `site=False` keeps the site's counter charged, for a failure the model was paid for: the site's
        daily budget is the spending cap, so it counts every call that cost money.
        """
        back = reservation.amount if amount is None else min(amount, reservation.amount)
        with self._lock:
            for who in (reservation.site_key, reservation.visitor) if site else (reservation.visitor,):
                self._db.execute(
                    "UPDATE usage SET count = MAX(count - ?, 0) WHERE day = ? AND visitor = ?",
                    (back, reservation.day, who),
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

    # ------------------------------------------------------------ submissions

    def submit_all(
        self, entries: list[Submission], visitor: str, *, counter: str, per_visitor: int, site_key: str, site: int
    ) -> list[tuple[int, bool]]:
        """Store a visitor's submissions in one step: (id, repeat) for each, or LimitReached and nothing stored.

        Finding the repeats, charging the new ones to today's allowance (`counter` for the visitor, `site_key`
        for the site) and storing all happen in one transaction under the store's lock. So a repeat is free
        whatever else is sent at the same moment, and a batch that doesn't fit stores none of itself.
        """
        day, now = self._day(), self._clock().isoformat()
        with self._lock:
            self._db.execute("BEGIN IMMEDIATE")
            try:
                found = [
                    self._db.execute(
                        "SELECT id, status FROM submissions WHERE visitor = ? AND origin = ? AND combo = ?",
                        (visitor, e.origin, e.combo),
                    ).fetchone()
                    for e in entries
                ]
                fresh = sum(row is None for row in found)
                if fresh:
                    if self._count(day, site_key) + fresh > site:
                        raise LimitReached("budget_exhausted")
                    if self._count(day, counter) + fresh > per_visitor:
                        raise LimitReached("rate_limited")
                    for who in (site_key, counter):
                        self._db.execute(
                            "INSERT INTO usage (day, visitor, count) VALUES (?, ?, ?) "
                            "ON CONFLICT (day, visitor) DO UPDATE SET count = count + ?",
                            (day, who, fresh, fresh),
                        )
                results: list[tuple[int, bool]] = []
                for entry, row in zip(entries, found, strict=True):
                    if row is not None:
                        if row[1] == "new":  # a repeat replaces the words of one still waiting, nothing else
                            self._db.execute(
                                "UPDATE submissions SET rating = ?, description = ?, source_url = ? WHERE id = ?",
                                (entry.rating, entry.description, entry.source_url, row[0]),
                            )
                        results.append((int(row[0]), True))
                        continue
                    cursor = self._db.execute(
                        "INSERT INTO submissions (created_at, origin, combo, item_ids, trinket_ids, characters, "
                        "rating, description, source_url, visitor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        (
                            now,
                            entry.origin,
                            entry.combo,
                            json.dumps(list(entry.item_ids)),
                            json.dumps(list(entry.trinket_ids)),
                            json.dumps(list(entry.characters)),
                            entry.rating,
                            entry.description,
                            entry.source_url,
                            visitor,
                        ),
                    )
                    results.append((int(cursor.lastrowid or 0), False))
            except BaseException:
                self._db.execute("ROLLBACK")
                raise
            self._db.execute("COMMIT")
            return results

    def live_twin(self, submission_id: int) -> int | None:
        """Another live (approved) submission for the same combination as this one, if there is one."""
        with self._lock:
            row = self._db.execute(
                "SELECT id FROM submissions WHERE status = 'approved' AND id != ? "
                "AND combo = (SELECT combo FROM submissions WHERE id = ?) ORDER BY id LIMIT 1",
                (submission_id, submission_id),
            ).fetchone()
        return int(row[0]) if row else None

    def submissions(self, status: str | None = None) -> list[dict[str, Any]]:
        """Rows as the inbox shows them, newest first. The visitor hash never leaves this module."""
        where, args = ("WHERE status = ?", (status,)) if status else ("", ())
        with self._lock:
            rows = self._db.execute(
                "SELECT id, created_at, origin, combo, item_ids, trinket_ids, characters, rating, description, "
                f"source_url, status, note, reviewed_at, check_json FROM submissions {where} ORDER BY id DESC",
                args,
            ).fetchall()
            combos = dict(self._db.execute("SELECT combo, COUNT(*) FROM submissions GROUP BY combo").fetchall())
        return [
            {
                "id": r[0],
                "createdAt": r[1],
                "origin": r[2],
                "itemIds": json.loads(r[4]),
                "trinketIds": json.loads(r[5]),
                "characterSlugs": json.loads(r[6]),
                "rating": r[7],
                "description": r[8],
                "sourceUrl": r[9],
                "status": r[10],
                "note": r[11],
                "reviewedAt": r[12],
                "alsoSent": int(combos.get(r[3], 1)) - 1,
                "check": json.loads(r[13]) if r[13] else None,
            }
            for r in rows
        ]

    @property
    def revision(self) -> int:
        """Goes up whenever the set of live (approved) submissions may have changed."""
        return self._revision

    def community(self) -> list[dict[str, Any]]:
        """The approved submissions: what the site shows as community synergies, oldest first."""
        with self._lock:
            rows = self._db.execute(
                "SELECT id, item_ids, trinket_ids, characters, rating, description, check_json FROM submissions "
                "WHERE status = 'approved' ORDER BY id"
            ).fetchall()
        return [
            {
                "id": r[0],
                "itemIds": json.loads(r[1]),
                "trinketIds": json.loads(r[2]),
                "characterSlugs": json.loads(r[3]),
                "rating": r[4],
                "description": r[5],
                "check": json.loads(r[6]) if r[6] else None,
            }
            for r in rows
        ]

    def set_check(self, submission_id: int, check: dict[str, Any]) -> bool:
        """Store the wiki check on a submission (the words stay the owner's). False when there is no such row."""
        with self._lock:
            done = self._db.execute(
                "UPDATE submissions SET check_json = ? WHERE id = ?",
                (json.dumps(check, ensure_ascii=False, separators=(",", ":")), submission_id),
            ).rowcount
            if done:
                self._revision += 1  # the public list carries the check
            return bool(done)

    def settle(self, curated: set[str]) -> int:
        """Mark approved submissions whose combination the curated list now has as added. Returns how many.

        Run at start-up: after a pull request folds community synergies into data/synergies.json and the
        site redeploys, the database copies retire on their own.
        """
        with self._lock:
            rows = self._db.execute("SELECT id, combo FROM submissions WHERE status = 'approved'").fetchall()
            done = [r[0] for r in rows if r[1] in curated]
            now = self._clock().isoformat()
            for row_id in done:
                self._db.execute("UPDATE submissions SET status = 'added', reviewed_at = ? WHERE id = ?", (now, row_id))
            if done:
                self._revision += 1
            return len(done)

    def submission(self, submission_id: int) -> dict[str, Any] | None:
        return next((s for s in self.submissions() if s["id"] == submission_id), None)

    def counts(self) -> dict[str, int]:
        with self._lock:
            found = dict(self._db.execute("SELECT status, COUNT(*) FROM submissions GROUP BY status").fetchall())
        return {status: int(found.get(status, 0)) for status in STATUSES}

    def review(self, submission_id: int, changes: dict[str, Any]) -> bool:
        """Apply the owner's changes (status, rating, description, note). False when there is no such row."""
        allowed = {k: v for k, v in changes.items() if k in ("status", "rating", "description", "note")}
        with self._lock:
            if self._db.execute("SELECT 1 FROM submissions WHERE id = ?", (submission_id,)).fetchone() is None:
                return False
            if allowed:
                # Column names come from the fixed tuple above, never from the request.
                columns = ", ".join(f"{k} = ?" for k in allowed)
                self._db.execute(
                    f"UPDATE submissions SET {columns}, reviewed_at = ? WHERE id = ?",
                    (*allowed.values(), self._clock().isoformat(), submission_id),
                )
                self._revision += 1
            return True

    def delete_submission(self, submission_id: int) -> bool:
        with self._lock:
            deleted = self._db.execute("DELETE FROM submissions WHERE id = ?", (submission_id,)).rowcount > 0
            self._revision += 1
            return deleted

    # ------------------------------------------------------------ admin sessions

    @staticmethod
    def _token_hash(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    def open_session(self, username: str, secret_tag: str) -> str:
        """A new session. Only the token's hash is kept; the token goes to the browser, once."""
        token = secrets.token_urlsafe(32)
        now = self._clock()
        with self._lock:
            # Sign-in is the moment to sweep out sessions that can no longer be used.
            self._db.execute(
                "DELETE FROM admin_sessions WHERE created_at < ? OR seen_at < ?",
                ((now - SESSION_LIFETIME).isoformat(), (now - SESSION_IDLE).isoformat()),
            )
            self._db.execute(
                "INSERT INTO admin_sessions (token_hash, username, secret_tag, created_at, seen_at) "
                "VALUES (?, ?, ?, ?, ?)",
                (self._token_hash(token), username, secret_tag, now.isoformat(), now.isoformat()),
            )
        return token

    def session(self, token: str, username: str, secret_tag: str) -> bool:
        """Whether a token is a live session for this username and these credentials, and if so, touch it.

        A session ends 12 hours after sign-in, after 2 hours unused, or as soon as the username or the
        password hash changes (the tag is derived from both), so changing the password signs out everywhere.
        """
        now = self._clock()
        digest = self._token_hash(token)
        with self._lock:
            row = self._db.execute(
                "SELECT username, secret_tag, created_at, seen_at FROM admin_sessions WHERE token_hash = ?", (digest,)
            ).fetchone()
            if row is None:
                return False
            created, seen = datetime.datetime.fromisoformat(row[2]), datetime.datetime.fromisoformat(row[3])
            # Bytes, not str: compare_digest refuses str that is not ASCII, and a username need not be.
            live = (
                secrets.compare_digest(row[0].encode(), username.encode())
                and secrets.compare_digest(row[1].encode(), secret_tag.encode())
                and now - created < SESSION_LIFETIME
                and now - seen < SESSION_IDLE
            )
            if not live:
                self._db.execute("DELETE FROM admin_sessions WHERE token_hash = ?", (digest,))
                return False
            self._db.execute("UPDATE admin_sessions SET seen_at = ? WHERE token_hash = ?", (now.isoformat(), digest))
            return True

    def close_session(self, token: str) -> None:
        with self._lock:
            self._db.execute("DELETE FROM admin_sessions WHERE token_hash = ?", (self._token_hash(token),))


@dataclass(frozen=True)
class Submission:
    """A checked submission, ready to store: ids known, at least two requirements, words bounded."""

    origin: str  # "visitor" or "ai"
    item_ids: tuple[int, ...]
    trinket_ids: tuple[int, ...]
    characters: tuple[str, ...]
    rating: str
    description: str
    source_url: str | None = None

    @property
    def combo(self) -> str:
        return combo_key(self.item_ids, self.trinket_ids, self.characters)
