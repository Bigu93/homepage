"""Favicon endpoint tests — cache miss/hit, auth, refresh."""

from __future__ import annotations

import time
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.favicon_fetcher import url_hash


@pytest.fixture()
def client(settings, db):
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_FUTURE_EXPIRES = int(time.time() * 1000) + 86_400_000  # 1 day from now
_URL = "https://example.com"
_PNG_BYTES = b"\x89PNG\r\n"


def _miss_result() -> dict:
    return {
        "bytes": None,
        "path": None,
        "mime": None,
        "source_url": _URL,
        "status": -1,
        "expires_at": _FUTURE_EXPIRES,
    }


def _hit_result() -> dict:
    return {
        "bytes": _PNG_BYTES,
        "path": None,
        "mime": "image/png",
        "source_url": _URL,
        "status": 200,
        "expires_at": _FUTURE_EXPIRES,
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_favicon_no_auth(client):
    resp = client.get("/api/v1/favicon", params={"url": _URL})
    assert resp.status_code == 401


def test_favicon_cache_miss_network_error(client, auth_headers):
    with patch("app.routers.favicon.fetch", new=AsyncMock(return_value=_miss_result())):
        resp = client.get("/api/v1/favicon", params={"url": _URL}, headers=auth_headers)
    assert resp.status_code == 404


def test_favicon_cache_miss_returns_bytes(client, auth_headers):
    with patch("app.routers.favicon.fetch", new=AsyncMock(return_value=_hit_result())):
        resp = client.get("/api/v1/favicon", params={"url": _URL}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("image/png")
    assert resp.content == _PNG_BYTES


def test_favicon_cache_hit(client, auth_headers):
    mock_fetch = AsyncMock(return_value=_hit_result())
    with patch("app.routers.favicon.fetch", new=mock_fetch):
        # First request — cache miss, fetch is called
        resp1 = client.get("/api/v1/favicon", params={"url": _URL}, headers=auth_headers)
        assert resp1.status_code == 200
        assert resp1.content == _PNG_BYTES

        # Second request — should hit the DB cache, fetch must NOT be called again
        resp2 = client.get("/api/v1/favicon", params={"url": _URL}, headers=auth_headers)

    assert resp2.status_code == 200
    assert resp2.content == _PNG_BYTES
    assert mock_fetch.call_count == 1


def test_favicon_refresh_clears_cache(client, db, auth_headers):
    h = url_hash(_URL)
    now_ms = int(time.time() * 1000)

    # Seed a cache row directly
    import asyncio

    asyncio.get_event_loop().run_until_complete(
        db.execute(
            """
            INSERT INTO favicon_cache (url_hash, source_url, bytes, path, mime, fetched_at, expires_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (h, _URL, _PNG_BYTES, None, "image/png", now_ms, _FUTURE_EXPIRES, 200),
        )
    )
    asyncio.get_event_loop().run_until_complete(db.commit())

    # Verify row exists before refresh
    async def _count():
        async with db.execute(
            "SELECT COUNT(*) FROM favicon_cache WHERE url_hash = ?", (h,)
        ) as cur:
            row = await cur.fetchone()
            return row[0]

    assert asyncio.get_event_loop().run_until_complete(_count()) == 1

    # Refresh endpoint
    resp = client.post("/api/v1/favicon/refresh", params={"url": _URL}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["queued"] is True
    assert data["url"] == _URL

    # Row should be gone
    assert asyncio.get_event_loop().run_until_complete(_count()) == 0
