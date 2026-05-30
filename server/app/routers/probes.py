"""Probe targets CRUD + status read."""

from __future__ import annotations

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, Response, status

from ..auth import require_token
from ..db import get_db, get_write_lock
from ..schemas import ProbeTargetIn, ProbeTargetOut

router = APIRouter(dependencies=[Depends(require_token)], tags=["probes"])

_HISTORY_POINTS = 30


@router.get("/probes", response_model=list[ProbeTargetOut])
async def list_probes(db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute("SELECT id, name, url, enabled FROM probe_target ORDER BY id") as cur:
        targets = await cur.fetchall()

    result = []
    for t in targets:
        latest = await _latest(db, t["id"])
        history = await _history(db, t["id"])
        result.append(
            ProbeTargetOut(
                id=t["id"],
                name=t["name"],
                url=t["url"],
                enabled=bool(t["enabled"]),
                latest=latest,
                history=history,
            )
        )
    return result


@router.post("/probes/targets", response_model=ProbeTargetOut, status_code=status.HTTP_201_CREATED)
async def create_probe_target(body: ProbeTargetIn, db: aiosqlite.Connection = Depends(get_db)):
    async with get_write_lock():
        async with db.execute(
            "INSERT INTO probe_target (name, url, enabled) VALUES (?, ?, ?) RETURNING id",
            (body.name, body.url, int(body.enabled)),
        ) as cur:
            row = await cur.fetchone()
        await db.commit()
    return ProbeTargetOut(id=row["id"], name=body.name, url=body.url, enabled=body.enabled)


@router.get("/probes/targets", response_model=list[ProbeTargetOut])
async def get_probe_targets(db: aiosqlite.Connection = Depends(get_db)):
    return await _targets_list(db)


@router.delete("/probes/targets/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_probe_target(target_id: int, db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute("SELECT id FROM probe_target WHERE id = ?", (target_id,)) as cur:
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    async with get_write_lock():
        await db.execute("DELETE FROM probe_target WHERE id = ?", (target_id,))
        await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _latest(db: aiosqlite.Connection, target_id: int) -> dict | None:
    async with db.execute(
        """
        SELECT ok, rtt_ms, status, ts
        FROM probe_result
        WHERE target_id = ?
        ORDER BY ts DESC
        LIMIT 1
        """,
        (target_id,),
    ) as cur:
        row = await cur.fetchone()
    if not row:
        return None
    return {
        "ok": bool(row["ok"]),
        "rtt_ms": row["rtt_ms"],
        "status": row["status"],
        "ts": row["ts"],
    }


async def _history(db: aiosqlite.Connection, target_id: int) -> list[dict]:
    async with db.execute(
        """
        SELECT ok, rtt_ms, ts
        FROM probe_result
        WHERE target_id = ?
        ORDER BY ts DESC
        LIMIT ?
        """,
        (target_id, _HISTORY_POINTS),
    ) as cur:
        rows = await cur.fetchall()
    return [{"ok": bool(r["ok"]), "rtt_ms": r["rtt_ms"], "ts": r["ts"]} for r in reversed(rows)]


async def _targets_list(db: aiosqlite.Connection) -> list[ProbeTargetOut]:
    async with db.execute("SELECT id, name, url, enabled FROM probe_target ORDER BY id") as cur:
        rows = await cur.fetchall()
    return [ProbeTargetOut(id=r["id"], name=r["name"], url=r["url"], enabled=bool(r["enabled"]))
            for r in rows]
