"""POST /api/v1/clicks — batch click event ingestion."""

from __future__ import annotations

import aiosqlite
from fastapi import APIRouter, Depends

from ..auth import require_token
from ..db import get_db
from ..schemas import ClickBatch

router = APIRouter(dependencies=[Depends(require_token)], tags=["stats"])


@router.post("/clicks", status_code=201)
async def ingest_clicks(body: ClickBatch, db: aiosqlite.Connection = Depends(get_db)):
    rows = [(e.link_id, body.device_id, e.ts) for e in body.events]
    await db.executemany(
        "INSERT INTO click_event (link_id, device_id, ts) VALUES (?, ?, ?)", rows
    )
    await db.commit()
    return {"accepted": len(rows)}
