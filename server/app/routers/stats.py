"""GET /api/v1/stats/frequent — cross-device top-N links
DELETE /api/v1/stats        — clear all click events
"""

from __future__ import annotations

import time

import aiosqlite
from fastapi import APIRouter, Depends, Query

from ..auth import require_token
from ..db import get_db
from ..schemas import FrequentLink

router = APIRouter(dependencies=[Depends(require_token)], tags=["stats"])


@router.get("/stats/frequent", response_model=list[FrequentLink])
async def frequent_links(
    n: int = Query(6, ge=1, le=50),
    window_days: int = Query(30, ge=1, le=365),
    db: aiosqlite.Connection = Depends(get_db),
):
    cutoff = int(time.time() * 1000) - window_days * 24 * 3600 * 1000
    async with db.execute(
        """
        SELECT link_id, COUNT(*) AS cnt
        FROM click_event
        WHERE ts > ?
        GROUP BY link_id
        HAVING cnt >= 2
        ORDER BY cnt DESC, link_id
        LIMIT ?
        """,
        (cutoff, n),
    ) as cur:
        rows = await cur.fetchall()
    return [FrequentLink(link_id=r["link_id"], count=r["cnt"]) for r in rows]


@router.delete("/stats", status_code=204)
async def clear_stats(db: aiosqlite.Connection = Depends(get_db)):
    await db.execute("DELETE FROM click_event")
    await db.commit()
