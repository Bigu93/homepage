"""Sync endpoint tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

OVERLAY_A = {"added": {"categories": [], "links": {}}, "settings": {"username": "Marcin"}}
OVERLAY_B = {"added": {"categories": [], "links": {}}, "settings": {"username": "Phone"}}


@pytest.fixture()
def client(settings, db):
    with TestClient(app) as c:
        yield c


def test_pull_empty(client, auth_headers):
    resp = client.get("/api/v1/sync", headers=auth_headers)
    assert resp.status_code == 204


def test_first_push(client, auth_headers):
    resp = client.put(
        "/api/v1/sync",
        json={"overlay": OVERLAY_A, "client_mtime": 1000, "base_revision": 0},
        headers={**auth_headers, "X-Device-Id": "pc"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["accepted"] is True
    assert data["revision"] == 1


def test_pull_after_push(client, auth_headers):
    client.put(
        "/api/v1/sync",
        json={"overlay": OVERLAY_A, "client_mtime": 1000, "base_revision": 0},
        headers={**auth_headers, "X-Device-Id": "pc"},
    )
    resp = client.get("/api/v1/sync", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["revision"] == 1


def test_conflict_returns_409(client, auth_headers):
    # Push from PC → revision 1
    client.put(
        "/api/v1/sync",
        json={"overlay": OVERLAY_A, "client_mtime": 1000, "base_revision": 0},
        headers={**auth_headers, "X-Device-Id": "pc"},
    )
    # Push from phone with stale base_revision=0 → conflict
    resp = client.put(
        "/api/v1/sync",
        json={"overlay": OVERLAY_B, "client_mtime": 2000, "base_revision": 0},
        headers={**auth_headers, "X-Device-Id": "phone"},
    )
    assert resp.status_code == 409
    data = resp.json()
    assert data["accepted"] is False
    assert data["server_revision"] == 1
    assert "overlay" in data


def test_sequential_pushes(client, auth_headers):
    for i in range(3):
        resp = client.put(
            "/api/v1/sync",
            json={"overlay": OVERLAY_A, "client_mtime": (i + 1) * 1000, "base_revision": i},
            headers={**auth_headers, "X-Device-Id": "pc"},
        )
        assert resp.status_code == 200
        assert resp.json()["revision"] == i + 1


def test_overlay_size_cap(client, auth_headers):
    # Build a >5MB overlay
    big = {"junk": "x" * (5 * 1024 * 1024 + 1)}
    resp = client.put(
        "/api/v1/sync",
        json={"overlay": big, "client_mtime": 1, "base_revision": 0},
        headers=auth_headers,
    )
    assert resp.status_code == 422  # Pydantic validation error
