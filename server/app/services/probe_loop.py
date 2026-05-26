"""Background task: probe configured tailnet targets every N seconds."""

from __future__ import annotations

import asyncio
import time

import httpx

from ..config import Settings
from ..db import _conn as _db_conn

_task: asyncio.Task | None = None
_PRUNE_INTERVAL_S = 3600
_KEEP_HISTORY_MS = 24 * 3600 * 1000


async def start_probe_loop(settings: Settings) -> None:
    global _task
    if _task and not _task.done():
        return
    _task = asyncio.create_task(_loop(settings))


async def _loop(settings: Settings) -> None:
    last_prune = time.monotonic()
    while True:
        await _run_probes()
        now = time.monotonic()
        if now - last_prune > _PRUNE_INTERVAL_S:
            await _prune()
            last_prune = now
        await asyncio.sleep(settings.probe_interval_s)


async def _run_probes() -> None:
    from ..db import _conn  # import here to avoid circular at module load

    if _conn is None:
        return

    async with _conn.execute("SELECT id, url FROM probe_target WHERE enabled = 1") as cur:
        targets = await cur.fetchall()

    for target in targets:
        await _probe_one(target["id"], target["url"])


async def _probe_one(target_id: int, url: str) -> None:
    from ..db import _conn

    if _conn is None:
        return

    start = time.monotonic()
    ok = False
    http_status = None
    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            resp = await client.head(url)
            http_status = resp.status_code
            ok = resp.status_code < 500
    except Exception:
        pass
    rtt_ms = int((time.monotonic() - start) * 1000)
    ts = int(time.time() * 1000)

    await _conn.execute(
        "INSERT INTO probe_result (target_id, ts, ok, rtt_ms, status) VALUES (?, ?, ?, ?, ?)",
        (target_id, ts, int(ok), rtt_ms, http_status),
    )
    await _conn.commit()


async def _prune() -> None:
    from ..db import _conn

    if _conn is None:
        return

    cutoff = int(time.time() * 1000) - _KEEP_HISTORY_MS
    await _conn.execute("DELETE FROM probe_result WHERE ts < ?", (cutoff,))
    await _conn.commit()
