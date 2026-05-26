"""GET /api/v1/favicon?url=…  — server-side favicon proxy + cache."""

from __future__ import annotations

import json
import time
from pathlib import Path

import aiosqlite
from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import Response

from ..auth import require_token
from ..config import Settings, get_settings
from ..db import get_db
from ..services.favicon_fetcher import fetch, url_hash

router = APIRouter(dependencies=[Depends(require_token)], tags=["favicon"])


@router.get("/favicon")
async def get_favicon(
    url: str = Query(..., description="Page URL to resolve favicon for"),
    request: Request = None,
    db: aiosqlite.Connection = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    h = url_hash(url)
    now_ms = int(time.time() * 1000)

    # Cache lookup
    async with db.execute(
        "SELECT bytes, path, mime, expires_at, status FROM favicon_cache WHERE url_hash = ?", (h,)
    ) as cur:
        row = await cur.fetchone()

    if row and row["expires_at"] > now_ms and row["status"] != -1:
        data, mime = _resolve_row(row)
        if data:
            return _icon_response(data, mime)

    # Cache miss or expired — fetch
    result = await fetch(url, settings)
    data_bytes = result["bytes"]
    path_str = result["path"]
    mime = result["mime"] or "image/x-icon"
    expires_at = result["expires_at"]
    http_status = result["status"]

    # Upsert into cache
    await db.execute(
        """
        INSERT INTO favicon_cache (url_hash, source_url, bytes, path, mime, fetched_at, expires_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(url_hash) DO UPDATE SET
            source_url = excluded.source_url,
            bytes      = excluded.bytes,
            path       = excluded.path,
            mime       = excluded.mime,
            fetched_at = excluded.fetched_at,
            expires_at = excluded.expires_at,
            status     = excluded.status
        """,
        (h, url, data_bytes, path_str, mime, now_ms, expires_at, http_status),
    )
    await db.commit()

    if data_bytes:
        return _icon_response(data_bytes, mime)
    if path_str and Path(path_str).exists():
        return _icon_response(Path(path_str).read_bytes(), mime)

    return Response(status_code=status.HTTP_404_NOT_FOUND)


@router.post("/favicon/refresh")
async def refresh_favicon(
    url: str = Query(...),
    db: aiosqlite.Connection = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Force-refresh a cached favicon."""
    h = url_hash(url)
    await db.execute("DELETE FROM favicon_cache WHERE url_hash = ?", (h,))
    await db.commit()
    return {"queued": True, "url": url}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _resolve_row(row) -> tuple[bytes | None, str]:
    mime = row["mime"] or "image/x-icon"
    if row["bytes"]:
        return bytes(row["bytes"]), mime
    if row["path"] and Path(row["path"]).exists():
        return Path(row["path"]).read_bytes(), mime
    return None, mime


def _icon_response(data: bytes, mime: str) -> Response:
    return Response(
        content=data,
        media_type=mime,
        headers={"Cache-Control": "public, max-age=86400", "X-Cache": "HIT"},
    )
