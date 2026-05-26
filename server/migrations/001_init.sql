-- 001_init.sql  — initial schema

CREATE TABLE IF NOT EXISTS overlay (
    id           INTEGER PRIMARY KEY CHECK (id = 1),
    json         TEXT    NOT NULL,
    revision     INTEGER NOT NULL,
    client_mtime INTEGER NOT NULL,
    server_mtime INTEGER NOT NULL,
    device_id    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS click_event (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    link_id   TEXT    NOT NULL,
    device_id TEXT    NOT NULL,
    ts        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS click_event_link_idx ON click_event (link_id);
CREATE INDEX IF NOT EXISTS click_event_ts_idx   ON click_event (ts);

CREATE TABLE IF NOT EXISTS favicon_cache (
    url_hash   TEXT    PRIMARY KEY,
    source_url TEXT    NOT NULL,
    bytes      BLOB,
    path       TEXT,
    mime       TEXT,
    fetched_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    status     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS probe_target (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name    TEXT    NOT NULL UNIQUE,
    url     TEXT    NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS probe_result (
    target_id INTEGER NOT NULL REFERENCES probe_target (id) ON DELETE CASCADE,
    ts        INTEGER NOT NULL,
    ok        INTEGER NOT NULL,
    rtt_ms    INTEGER,
    status    INTEGER,
    PRIMARY KEY (target_id, ts)
);

CREATE TABLE IF NOT EXISTS handoff_event (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    ts       INTEGER NOT NULL,
    from_dev TEXT    NOT NULL,
    to_dev   TEXT,
    payload  TEXT    NOT NULL
);
