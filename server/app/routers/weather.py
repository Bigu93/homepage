"""GET /api/v1/weather?city=…  — OWM proxy with server-held key."""

from __future__ import annotations

import time
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..auth import require_token
from ..config import Settings, get_settings

router = APIRouter(dependencies=[Depends(require_token)], tags=["weather"])

_OWM_URL = "https://api.openweathermap.org/data/2.5/weather"
_cache: dict[str, tuple[float, Any]] = {}  # (city,units) → (fetched_at, data)
_TTL_S = 15 * 60


@router.get("/weather")
async def get_weather(
    city: str = Query(...),
    units: str = Query("metric"),
    settings: Settings = Depends(get_settings),
):
    if not settings.owm_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OWM_API_KEY not configured on server",
        )

    cache_key = f"{city}:{units}"
    now = time.time()
    if cache_key in _cache:
        fetched_at, data = _cache[cache_key]
        if now - fetched_at < _TTL_S:
            return data

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                _OWM_URL,
                params={"q": city, "units": units, "appid": settings.owm_api_key},
            )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    if resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=resp.text)

    data = resp.json()
    _cache[cache_key] = (now, data)
    return data
