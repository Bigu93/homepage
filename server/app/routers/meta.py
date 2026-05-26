"""GET /api/v1/meta?url=…  — title / og:image enrichment for link-add UX."""

from __future__ import annotations

import re
import time
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Query

from ..auth import require_token
from ..schemas import MetaResponse

router = APIRouter(dependencies=[Depends(require_token)], tags=["meta"])

_cache: dict[str, tuple[float, Any]] = {}
_TTL_S = 7 * 24 * 3600
_MAX_BYTES = 512 * 1024
_TIMEOUT = 3.0


@router.get("/meta", response_model=MetaResponse)
async def get_meta(url: str = Query(...)):
    now = time.time()
    if url in _cache and now - _cache[url][0] < _TTL_S:
        return _cache[url][1]

    result = MetaResponse(url=url)
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=_TIMEOUT) as client:
            resp = await client.get(url, headers={"Accept": "text/html"})
            if resp.status_code < 400:
                html = resp.text[:_MAX_BYTES]
                result.title = _meta_tag(html, "title")
                result.og_title = _meta_prop(html, "og:title")
                result.og_image = _meta_prop(html, "og:image")
                result.description = _meta_name(html, "description")
    except Exception:
        pass

    _cache[url] = (now, result)
    return result


def _meta_tag(html: str, tag: str) -> str | None:
    m = re.search(rf"<{tag}[^>]*>(.*?)</{tag}>", html, re.IGNORECASE | re.DOTALL)
    return m.group(1).strip() if m else None


def _meta_prop(html: str, prop: str) -> str | None:
    m = re.search(
        rf'<meta[^>]+property=["\']og:{prop.split(":")[-1]}["\'][^>]*content=["\']([^"\']+)["\']',
        html,
        re.IGNORECASE,
    )
    if not m:
        m = re.search(
            rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]*property=["\']og:{prop.split(":")[-1]}["\']',
            html,
            re.IGNORECASE,
        )
    return m.group(1).strip() if m else None


def _meta_name(html: str, name: str) -> str | None:
    m = re.search(
        rf'<meta[^>]+name=["\']description["\'][^>]*content=["\']([^"\']+)["\']',
        html,
        re.IGNORECASE,
    )
    if not m:
        m = re.search(
            rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]*name=["\']description["\']',
            html,
            re.IGNORECASE,
        )
    return m.group(1).strip() if m else None
