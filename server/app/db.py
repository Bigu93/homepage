"""SQLite connection + migration runner."""

from __future__ import annotations

import asyncio
import time
from collections.abc import AsyncGenerator
from pathlib import Path

import aiosqlite

from .config import Settings

_MIGRATIONS_DIR = Path(__file__).parent.parent / "migrations"


async def connect(db_path: Path) -> aiosqlite.Connection:
    conn = await aiosqlite.connect(db_path)
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA journal_mode=WAL")
    await conn.execute("PRAGMA foreign_keys=ON")
    await conn.execute("PRAGMA synchronous=NORMAL")
    return conn


async def migrate(conn: aiosqlite.Connection) -> None:
    """Apply unapplied *.sql migrations in lexicographic order."""
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename   TEXT    PRIMARY KEY,
            applied_at INTEGER NOT NULL
        )
        """
    )
    await conn.commit()

    async with conn.execute("SELECT filename FROM schema_migrations") as cur:
        applied = {row[0] async for row in cur}

    sql_files = sorted(_MIGRATIONS_DIR.glob("*.sql"))
    for sql_file in sql_files:
        if sql_file.name in applied:
            continue
        sql = sql_file.read_text()
        await conn.executescript(sql)
        await conn.execute(
            "INSERT INTO schema_migrations (filename, applied_at) VALUES (?, ?)",
            (sql_file.name, int(time.time() * 1000)),
        )
        await conn.commit()


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

_conn: aiosqlite.Connection | None = None
_write_lock = asyncio.Lock()


async def open_db(settings: Settings) -> None:
    global _conn
    settings.db_path.parent.mkdir(parents=True, exist_ok=True)
    _conn = await connect(settings.db_path)
    await migrate(_conn)


async def close_db() -> None:
    global _conn
    if _conn:
        await _conn.close()
        _conn = None


async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    if _conn is None:
        raise RuntimeError("DB not initialised — call open_db() at startup")
    yield _conn


def get_write_lock() -> asyncio.Lock:
    return _write_lock
