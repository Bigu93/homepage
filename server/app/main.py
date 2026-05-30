"""FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import bootstrap, get_settings
from .db import close_db, open_db
from .routers import clicks, favicon, handoff, meta, probes, stats, sync, tailscale, weather
from .routers.health import router as health_router
from .services.probe_loop import start_probe_loop, stop_probe_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    bootstrap(settings)
    await open_db(settings)

    await start_probe_loop(settings)

    yield

    await stop_probe_loop()
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
    for router_module in (sync, favicon, weather, probes, tailscale, clicks, stats, handoff, meta):
        app.include_router(router_module.router, prefix="/api/v1")
    if settings.frontend_dir and Path(settings.frontend_dir).is_dir():
        app.mount("/", StaticFiles(directory=settings.frontend_dir, html=True), name="frontend")
    return app


app = create_app()
