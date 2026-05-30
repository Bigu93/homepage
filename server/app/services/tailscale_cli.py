"""Tailscale status via local CLI — cached 5 s."""

from __future__ import annotations

import asyncio
import json
import time
from typing import Any

_cache: tuple[float, Any] | None = None
_CACHE_TTL_S = 5.0
_TIMEOUT_S = 1.5


async def status_json() -> dict[str, Any]:
    global _cache
    now = time.monotonic()
    if _cache and now - _cache[0] < _CACHE_TTL_S:
        return _cache[1]

    try:
        proc = await asyncio.wait_for(
            asyncio.create_subprocess_exec(
                "tailscale", "status", "--json",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL,
            ),
            timeout=_TIMEOUT_S,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=_TIMEOUT_S)
        data = json.loads(stdout)
    except FileNotFoundError:
        data = {"error": "tailscale CLI not found", "online": False}
    except TimeoutError:
        data = {"error": "timeout", "online": False}
    except Exception as e:
        data = {"error": str(e), "online": False}

    _cache = (now, data)
    return data
