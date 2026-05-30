"""POST /api/v1/handoff         — send URL/event to another device
GET  /api/v1/handoff/stream  — SSE listener
"""

from __future__ import annotations

import asyncio
import json
import time

import aiosqlite
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse

from ..auth import require_token
from ..db import get_db, get_write_lock
from ..schemas import HandoffRequest
from ..services import handoff_bus

router = APIRouter(dependencies=[Depends(require_token)], tags=["handoff"])

_PING_INTERVAL_S = 25


@router.post("/handoff", status_code=202)
async def send_handoff(
    body: HandoffRequest,
    request: Request,
    db: aiosqlite.Connection = Depends(get_db),
):
    from_dev = request.headers.get("X-Device-Id", "unknown")
    ts = int(time.time() * 1000)
    payload = body.model_dump()

    async with get_write_lock():
        await db.execute(
            "INSERT INTO handoff_event (ts, from_dev, to_dev, payload) VALUES (?, ?, ?, ?)",
            (ts, from_dev, body.to_device, json.dumps(payload)),
        )
        await db.commit()

    await handoff_bus.publish(
        event={"ts": ts, "from": from_dev, **payload},
        from_device=from_dev,
        to_device=body.to_device,
    )
    return {"queued": True}


@router.get("/handoff/stream")
async def handoff_stream(
    device_id: str = Query(...),
    request: Request = None,
):
    q = handoff_bus.subscribe(device_id)

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(q.get(), timeout=_PING_INTERVAL_S)
                    yield f"data: {json.dumps(event)}\n\n"
                except TimeoutError:
                    yield ": ping\n\n"
        finally:
            handoff_bus.unsubscribe(device_id)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
