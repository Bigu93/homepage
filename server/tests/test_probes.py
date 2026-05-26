"""Probe targets CRUD tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client(settings, db):
    with TestClient(app) as c:
        yield c


def test_create_and_list(client, auth_headers):
    resp = client.post(
        "/api/v1/probes/targets",
        json={"name": "NAS", "url": "http://nas.home/"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    target = resp.json()
    assert target["name"] == "NAS"
    assert target["id"] > 0

    resp = client.get("/api/v1/probes/targets", headers=auth_headers)
    assert resp.status_code == 200
    assert any(t["name"] == "NAS" for t in resp.json())


def test_delete(client, auth_headers):
    client.post(
        "/api/v1/probes/targets",
        json={"name": "HA", "url": "http://ha.home/"},
        headers=auth_headers,
    )
    resp = client.get("/api/v1/probes/targets", headers=auth_headers)
    target_id = next(t["id"] for t in resp.json() if t["name"] == "HA")

    resp = client.delete(f"/api/v1/probes/targets/{target_id}", headers=auth_headers)
    assert resp.status_code == 204

    resp = client.get("/api/v1/probes/targets", headers=auth_headers)
    assert not any(t["name"] == "HA" for t in resp.json())


def test_delete_nonexistent(client, auth_headers):
    resp = client.delete("/api/v1/probes/targets/9999", headers=auth_headers)
    assert resp.status_code == 404
