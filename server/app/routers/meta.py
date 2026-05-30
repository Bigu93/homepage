"""GET /api/v1/meta?url=…  — title / og:image enrichment for link-add UX."""

from __future__ import annotations

import re
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..auth import require_token
from ..schemas import MetaResponse
from ..services.outbound import UnsafeUrlError, fetch_limited_text

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
        resp, html = await fetch_limited_text(
            url,
            max_bytes=_MAX_BYTES,
            timeout=_TIMEOUT,
            headers={"Accept": "text/html"},
        )
        if resp.status_code < 400:
            result.title = _meta_tag(html, "title")
            result.og_title = _meta_prop(html, "og:title")
            result.og_image = _meta_prop(html, "og:image")
            result.description = _meta_name(html, "description")
    except UnsafeUrlError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
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
        r'<meta[^>]+name=["\']description["\'][^>]*content=["\']([^"\']+)["\']',
        html,
        re.IGNORECASE,
    )
    if not m:
        m = re.search(
            r'<meta[^>]+content=["\']([^"\']+)["\'][^>]*name=["\']description["\']',
            html,
            re.IGNORECASE,
        )
    return m.group(1).strip() if m else None
