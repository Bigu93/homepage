"""Shared fixtures for pytest."""

from __future__ import annotations

from pathlib import Path

import pytest
import pytest_asyncio

import app.config as config_module
import app.db as db_module
from app.config import Settings


@pytest.fixture()
def tmp_data_dir(tmp_path: Path) -> Path:
    (tmp_path / "favicons").mkdir()
    return tmp_path


@pytest.fixture()
def settings(tmp_data_dir: Path) -> Settings:
    s = Settings(
        data_dir=tmp_data_dir,
        auth_token="test-token-abc",
        owm_api_key="test-owm-key",
    )
    # Patch module-level singleton
    config_module._settings = s
    yield s
    config_module._settings = None


@pytest_asyncio.fixture()
async def db(settings: Settings):
    await db_module.open_db(settings)
    yield db_module._conn
    await db_module.close_db()


@pytest.fixture()
def auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer test-token-abc"}
