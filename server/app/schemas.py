"""Shared Pydantic schemas."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, field_validator

from .services.outbound import UnsafeUrlError, validate_http_url

MAX_OVERLAY_BYTES = 5 * 1024 * 1024  # 5 MB


# ---------------------------------------------------------------------------
# Sync
# ---------------------------------------------------------------------------


class SyncPullResponse(BaseModel):
    revision: int
    overlay: dict[str, Any]
    server_mtime: int
    device_id: str


class SyncPushRequest(BaseModel):
    overlay: dict[str, Any]
    client_mtime: int
    base_revision: int

    @field_validator("overlay")
    @classmethod
    def size_cap(cls, v: dict[str, Any]) -> dict[str, Any]:
        import json

        raw = json.dumps(v)
        if len(raw.encode()) > MAX_OVERLAY_BYTES:
            raise ValueError(f"overlay exceeds {MAX_OVERLAY_BYTES // 1024} KB limit")
        return v


class SyncPushResponse(BaseModel):
    revision: int
    accepted: bool


class SyncConflict(BaseModel):
    accepted: bool
    server_revision: int
    server_mtime: int
    overlay: dict[str, Any]


# ---------------------------------------------------------------------------
# Probes
# ---------------------------------------------------------------------------


class ProbeTargetIn(BaseModel):
    name: str
    url: str
    enabled: bool = True

    @field_validator("url")
    @classmethod
    def valid_probe_url(cls, v: str) -> str:
        try:
            return validate_http_url(v, allow_private=True)
        except UnsafeUrlError as exc:
            raise ValueError(str(exc)) from exc


class ProbeTargetOut(BaseModel):
    id: int
    name: str
    url: str
    enabled: bool
    latest: dict[str, Any] | None = None
    history: list[dict[str, Any]] = []


# ---------------------------------------------------------------------------
# Clicks / Stats
# ---------------------------------------------------------------------------


class ClickEvent(BaseModel):
    link_id: str
    ts: int


class ClickBatch(BaseModel):
    events: list[ClickEvent]
    device_id: str

    @field_validator("events")
    @classmethod
    def max_events(cls, v: list[ClickEvent]) -> list[ClickEvent]:
        if len(v) > 500:
            raise ValueError("max 500 events per batch")
        return v


class FrequentLink(BaseModel):
    link_id: str
    count: int


# ---------------------------------------------------------------------------
# Handoff
# ---------------------------------------------------------------------------


class HandoffRequest(BaseModel):
    kind: str  # "open" | ...
    url: str
    title: str | None = None
    to_device: str | None = None


# ---------------------------------------------------------------------------
# Meta enrichment
# ---------------------------------------------------------------------------


class MetaResponse(BaseModel):
    url: str
    title: str | None = None
    og_title: str | None = None
    og_image: str | None = None
    description: str | None = None
