"""GET /api/v1/sync  — pull overlay
PUT /api/v1/sync  — push overlay (LWW)
"""

from __future__ import annotations

import json
import time

import aiosqlite
from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import JSONResponse

from ..auth import require_token
from ..db import get_db, get_write_lock
from ..schemas import SyncConflict, SyncPullResponse, SyncPushRequest, SyncPushResponse

router = APIRouter(dependencies=[Depends(require_token)], tags=["sync"])


@router.get("/sync", response_model=SyncPullResponse)
async def pull_overlay(
    request: Request,
    db: aiosqlite.Connection = Depends(get_db),
):
    async with db.execute("SELECT * FROM overlay WHERE id = 1") as cur:
        row = await cur.fetchone()

    if row is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return SyncPullResponse(
        revision=row["revision"],
        overlay=json.loads(row["json"]),
        server_mtime=row["server_mtime"],
        device_id=row["device_id"],
    )


@router.put("/sync")
async def push_overlay(
    body: SyncPushRequest,
    request: Request,
    db: aiosqlite.Connection = Depends(get_db),
):
    device_id = request.headers.get("X-Device-Id", "unknown")
    now_ms = int(time.time() * 1000)
    overlay_json = json.dumps(body.overlay)

    async with get_write_lock():
        try:
            await db.execute("BEGIN IMMEDIATE")
            async with db.execute(
                "SELECT revision, server_mtime, json FROM overlay WHERE id = 1"
            ) as cur:
                row = await cur.fetchone()

            if row is None:
                await db.execute(
                    """
                    INSERT INTO overlay (id, json, revision, client_mtime, server_mtime, device_id)
                    VALUES (1, ?, 1, ?, ?, ?)
                    """,
                    (overlay_json, body.client_mtime, now_ms, device_id),
                )
                await db.commit()
                return SyncPushResponse(revision=1, accepted=True)

            server_revision = row["revision"]

            if body.base_revision != server_revision:
                await db.rollback()
                return JSONResponse(
                    status_code=status.HTTP_409_CONFLICT,
                    content=SyncConflict(
                        accepted=False,
                        server_revision=server_revision,
                        server_mtime=row["server_mtime"],
                        overlay=json.loads(row["json"]),
                    ).model_dump(),
                )

            new_revision = server_revision + 1
            cur = await db.execute(
                """
                UPDATE overlay
                SET json = ?, revision = ?, client_mtime = ?, server_mtime = ?, device_id = ?
                WHERE id = 1 AND revision = ?
                """,
                (overlay_json, new_revision, body.client_mtime, now_ms, device_id, server_revision),
            )
            if cur.rowcount != 1:
                await db.rollback()
                return JSONResponse(
                    status_code=status.HTTP_409_CONFLICT,
                    content=SyncConflict(
                        accepted=False,
                        server_revision=server_revision,
                        server_mtime=row["server_mtime"],
                        overlay=json.loads(row["json"]),
                    ).model_dump(),
                )
            await db.commit()
            return SyncPushResponse(revision=new_revision, accepted=True)
        except Exception:
            await db.rollback()
            raise
