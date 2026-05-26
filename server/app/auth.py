"""Bearer-token authentication dependency."""

from __future__ import annotations

import hmac

from fastapi import Depends, HTTPException, Request, status

from .config import Settings, get_settings


def require_token(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> None:
    """FastAPI dependency — raises 401 if token missing or wrong."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    provided = auth_header[len("Bearer "):]
    expected = settings.auth_token
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Server not bootstrapped — no auth token configured",
        )
    # Constant-time comparison to prevent timing attacks
    if not hmac.compare_digest(provided.encode(), expected.encode()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
