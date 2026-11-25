"""One piece of work per key at a time, within this process.

Two people asking for the same build at the same moment should cost one model call, not two: the second
waits for the first, then finds the saved answer. Different keys never wait for each other.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager


class KeyedLocks:
    def __init__(self) -> None:
        # key -> (lock, how many tasks hold or wait for it). An entry is dropped when nobody needs it.
        self._locks: dict[str, tuple[asyncio.Lock, int]] = {}

    def __len__(self) -> int:
        return len(self._locks)

    @asynccontextmanager
    async def hold(self, key: str) -> AsyncIterator[None]:
        # No await between reading and writing the table, so this bookkeeping cannot interleave.
        lock, users = self._locks.get(key, (asyncio.Lock(), 0))
        self._locks[key] = (lock, users + 1)
        try:
            async with lock:
                yield
        finally:
            lock, users = self._locks[key]
            if users == 1:
                del self._locks[key]
            else:
                self._locks[key] = (lock, users - 1)
