"""GET /api/v1/tailscale/status — server-side tailscale detection."""

from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import require_token
from ..services.tailscale_cli import status_json

router = APIRouter(dependencies=[Depends(require_token)], tags=["tailscale"])


@router.get("/tailscale/status")
async def tailscale_status():
    raw = await status_json()

    if "error" in raw:
        if "not found" in raw["error"]:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="tailscale CLI not found — mount /usr/bin/tailscale into container",
            )
        return {"online": False, "error": raw["error"], "fetchedAt": int(time.time() * 1000)}

    # Parse Tailscale status JSON shape
    self_info = raw.get("Self", {})
    peers_raw = raw.get("Peer", {})

    def _peer(p: dict) -> dict[str, Any]:
        return {
            "hostname": p.get("HostName", p.get("DNSName", "?")),
            "online": p.get("Online", False),
            "lastSeen": p.get("LastSeen"),
            "os": p.get("OS"),
        }

    peers = [_peer(p) for p in peers_raw.values()] if isinstance(peers_raw, dict) else []

    return {
        "self": {
            "online": True,
            "hostname": self_info.get("HostName") or self_info.get("DNSName", "unknown"),
            "tailnet": raw.get("MagicDNSSuffix", ""),
        },
        "peers": peers,
        "fetchedAt": int(time.time() * 1000),
    }
