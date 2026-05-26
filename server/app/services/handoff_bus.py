"""In-process SSE fan-out bus for cross-device handoff events."""

from __future__ import annotations

import asyncio
from typing import Any

_queues: dict[str, asyncio.Queue] = {}


def subscribe(device_id: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue(maxsize=64)
    _queues[device_id] = q
    return q


def unsubscribe(device_id: str) -> None:
    _queues.pop(device_id, None)


async def publish(event: dict[str, Any], from_device: str, to_device: str | None = None) -> None:
    for dev_id, q in list(_queues.items()):
        if dev_id == from_device:
            continue
        if to_device and dev_id != to_device:
            continue
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            pass  # Slow consumer — drop event
