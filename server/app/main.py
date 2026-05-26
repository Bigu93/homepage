"""FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import bootstrap, get_settings
from .db import close_db, open_db
from .routers.health import router as health_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    bootstrap(settings)
    await open_db(settings)

    # Import and register all feature routers here so DB is ready
    from .routers import (  # noqa: PLC0415
        clicks,
        favicon,
        handoff,
        meta,
        probes,
        stats,
        sync,
        tailscale,
        weather,
    )
    from .services.probe_loop import start_probe_loop  # noqa: PLC0415

    for router_module in (sync, favicon, weather, probes, tailscale, clicks, stats, handoff, meta):
        app.include_router(router_module.router, prefix="/api/v1")

    await start_probe_loop(settings)

    # Serve static frontend if configured
    if settings.frontend_dir and Path(settings.frontend_dir).is_dir():
        app.mount("/", StaticFiles(directory=settings.frontend_dir, html=True), name="frontend")

    yield

    await close_db()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Startpage",
        version="0.1.0",
        lifespan=lifespan,
    )

    origins = settings.cors_origins_list()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    return app


app = create_app()
