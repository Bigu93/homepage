"""Safe outbound HTTP helpers for URL enrichment/proxy endpoints."""

from __future__ import annotations

import asyncio
import ipaddress
from urllib.parse import urljoin, urlparse

import httpx

_BLOCKED_HOSTS = {"localhost"}
_MAX_REDIRECTS = 3


class UnsafeUrlError(ValueError):
    pass


def validate_http_url(url: str, *, allow_private: bool = False) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise UnsafeUrlError("URL must use http or https")

    host = parsed.hostname
    if not host:
        raise UnsafeUrlError("URL host is required")

    host_l = host.rstrip(".").lower()
    if host_l in _BLOCKED_HOSTS or host_l.endswith(".localhost"):
        raise UnsafeUrlError("localhost URLs are not allowed")

    try:
        ip = ipaddress.ip_address(host_l)
    except ValueError:
        return url

    if not allow_private and _is_blocked_ip(ip):
        raise UnsafeUrlError("private, loopback, and link-local URLs are not allowed")
    return url


async def validate_resolved_url(url: str, *, allow_private: bool = False) -> str:
    validate_http_url(url, allow_private=allow_private)
    parsed = urlparse(url)
    host = parsed.hostname
    if not host:
        raise UnsafeUrlError("URL host is required")

    try:
        infos = await asyncio.get_running_loop().getaddrinfo(host, parsed.port or 443)
    except OSError as exc:
        raise UnsafeUrlError("URL host could not be resolved") from exc

    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if not allow_private and _is_blocked_ip(ip):
            raise UnsafeUrlError("URL resolves to a blocked network address")
    return url


async def fetch_limited_text(
    url: str,
    *,
    max_bytes: int,
    timeout: float,
    headers: dict[str, str] | None = None,
) -> tuple[httpx.Response, str]:
    response, data = await fetch_limited_bytes(
        url,
        max_bytes=max_bytes,
        timeout=timeout,
        headers=headers,
    )
    encoding = response.encoding or "utf-8"
    return response, data.decode(encoding, errors="replace")


async def fetch_limited_bytes(
    url: str,
    *,
    max_bytes: int,
    timeout: float,
    headers: dict[str, str] | None = None,
) -> tuple[httpx.Response, bytes]:
    current = await validate_resolved_url(url)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        for _ in range(_MAX_REDIRECTS + 1):
            async with client.stream("GET", current, headers=headers) as response:
                if response.is_redirect:
                    location = response.headers.get("location")
                    if not location:
                        return response, b""
                    current = await validate_resolved_url(urljoin(current, location))
                    continue

                chunks: list[bytes] = []
                total = 0
                async for chunk in response.aiter_bytes():
                    total += len(chunk)
                    if total > max_bytes:
                        raise UnsafeUrlError("response exceeded maximum allowed size")
                    chunks.append(chunk)
                return response, b"".join(chunks)

    raise UnsafeUrlError("too many redirects")


def _is_blocked_ip(ip: ipaddress._BaseAddress) -> bool:
    return any(
        (
            ip.is_private,
            ip.is_loopback,
            ip.is_link_local,
            ip.is_multicast,
            ip.is_reserved,
            ip.is_unspecified,
        )
    )
