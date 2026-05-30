"""Server-side favicon fetch + cache."""

from __future__ import annotations

import hashlib
import re
import time
from urllib.parse import urljoin, urlparse

from ..config import Settings
from .outbound import UnsafeUrlError, fetch_limited_bytes, fetch_limited_text, validate_http_url

_TIMEOUT = 3.0
_MAX_ICON_BYTES = 256 * 1024
_MAX_PAGE_BYTES = 1024 * 1024
_TTL_HIT_MS = 7 * 24 * 3600 * 1000   # 7 days
_TTL_MISS_MS = 24 * 3600 * 1000       # 1 day (failures)
_INLINE_THRESHOLD = 32 * 1024          # store ≤32 KB inline; larger on disk

GOOGLE_S2 = "https://www.google.com/s2/favicons?domain={domain}&sz=64"


def url_hash(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()


async def fetch(page_url: str, settings: Settings) -> dict:
    """
    Returns dict with keys: bytes | path, mime, source_url, status, expires_at.
    Tries: <link rel=icon> → /favicon.ico → Google S2.
    """
    try:
        validate_http_url(page_url)
    except UnsafeUrlError:
        return _miss(page_url)

    icon_url = await _discover_icon(page_url)
    if icon_url:
        result = await _fetch_bytes(icon_url)
        if result:
            return _build_result(result, settings)

    # Fallback: /favicon.ico
    parsed = urlparse(page_url)
    ico_url = f"{parsed.scheme}://{parsed.netloc}/favicon.ico"
    result = await _fetch_bytes(ico_url)
    if result:
        return _build_result(result, settings)

    # Fallback: Google S2
    domain = urlparse(page_url).netloc
    g_url = GOOGLE_S2.format(domain=domain)
    result = await _fetch_bytes(g_url)
    if result:
        return _build_result(result, settings)

    return _miss(page_url)


async def _discover_icon(page_url: str) -> str | None:
    """Parse page HTML for <link rel='icon'> or apple-touch-icon."""
    try:
        resp, html = await fetch_limited_text(
            page_url,
            max_bytes=_MAX_PAGE_BYTES,
            timeout=_TIMEOUT,
            headers={"Accept": "text/html"},
        )
        if resp.status_code >= 400:
            return None
    except Exception:
        return None

    # Prefer apple-touch-icon, then icon, then shortcut icon
    patterns = [
        r'<link[^>]+rel=["\']apple-touch-icon["\'][^>]*href=["\']([^"\']+)["\']',
        r'<link[^>]+href=["\']([^"\']+)["\'][^>]*rel=["\']apple-touch-icon["\']',
        r'<link[^>]+rel=["\'](?:shortcut )?icon["\'][^>]*href=["\']([^"\']+)["\']',
        r'<link[^>]+href=["\']([^"\']+)["\'][^>]*rel=["\'](?:shortcut )?icon["\']',
    ]
    for pat in patterns:
        m = re.search(pat, html, re.IGNORECASE)
        if m:
            return urljoin(page_url, m.group(1))
    return None


async def _fetch_bytes(url: str) -> dict | None:
    try:
        resp, content = await fetch_limited_bytes(
            url,
            max_bytes=_MAX_ICON_BYTES,
            timeout=_TIMEOUT,
        )
        if resp.status_code >= 400 or not content:
            return None
        mime = resp.headers.get("content-type", "image/x-icon").split(";")[0].strip()
        return {"data": content, "mime": mime, "url": str(resp.url), "status": resp.status_code}
    except Exception:
        return None


def _miss(url: str) -> dict:
    return {
        "bytes": None,
        "path": None,
        "mime": None,
        "source_url": url,
        "status": -1,
        "expires_at": int(time.time() * 1000) + _TTL_MISS_MS,
    }


def _build_result(raw: dict, settings: Settings) -> dict:
    data: bytes = raw["data"]
    mime = raw["mime"]
    source_url = raw["url"]
    now_ms = int(time.time() * 1000)
    expires_at = now_ms + _TTL_HIT_MS

    if len(data) <= _INLINE_THRESHOLD:
        return {"bytes": data, "path": None, "mime": mime, "source_url": source_url,
                "status": raw["status"], "expires_at": expires_at}

    # Store on disk
    ext = _ext_for_mime(mime)
    fname = hashlib.sha256(data).hexdigest() + ext
    fpath = settings.favicon_dir / fname
    fpath.write_bytes(data)
    return {"bytes": None, "path": str(fpath), "mime": mime, "source_url": source_url,
            "status": raw["status"], "expires_at": expires_at}


def _ext_for_mime(mime: str) -> str:
    return {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/gif": ".gif",
        "image/svg+xml": ".svg",
        "image/webp": ".webp",
    }.get(mime, ".ico")
