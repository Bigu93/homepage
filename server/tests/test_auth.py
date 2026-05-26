"""Auth middleware tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client(settings, db):
    # TestClient runs sync; db fixture ensures DB is open
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


def test_healthz_no_auth(client):
    resp = client.get("/healthz")
    assert resp.status_code == 200


def test_sync_no_token(client):
    resp = client.get("/api/v1/sync")
    assert resp.status_code == 401


def test_sync_wrong_token(client):
    resp = client.get("/api/v1/sync", headers={"Authorization": "Bearer wrong"})
    assert resp.status_code == 401


def test_sync_valid_token_returns_204_or_200(client, auth_headers):
    resp = client.get("/api/v1/sync", headers=auth_headers)
    assert resp.status_code in (200, 204)
