# Startpage Backend + Cross-Device Sync — Design

**Status:** Proposed
**Date:** 2026-05-26
**Decider:** Marcin (owner)
**Supersedes:** N/A (introduces backend tier; existing client-only design remains valid for offline-first behavior)

---

## 1. Context

The startpage today is fully client-side: vanilla JS ES modules, `localStorage` overlay (`startpage_overlay_v1`), no build, no server. Recent features (Tailscale chip, click stats, favicon cache) push the limits of what a browser-only app can do:

- **Tailscale detection** is constrained by browser security. HTTP MagicDNS probe works on `http://`/`file://`, but HTTPS deployments need a user-configured probe URL workaround. A server *on* the tailnet sidesteps both.
- **Sync** between PC and mobile does not exist. Users must export/import JSON manually.
- **Weather API key** ships in the client. Acceptable for personal use, not ideal.
- **Favicon CORS** fails on certain hosts; the in-browser cache cannot retry centrally.
- **Click stats** are per-device. "Frequent" group on phone ≠ frequent on PC.

The user runs a Tailscale tailnet with an always-on NAS/Pi available as a host. AI coding agents (Claude) will execute the plan.

## 2. Decision

Introduce a small **Python + FastAPI + SQLite** backend running on the always-on tailnet host. The frontend becomes a **PWA** that talks to the backend over the tailnet, authenticated with a **shared bearer token**.

Client retains **offline-first** behavior: it still reads/writes the `localStorage` overlay, then syncs to the backend opportunistically. Conflict policy is **last-write-wins on the whole overlay** keyed by a monotonic `revision` and a `clientLastModified` timestamp.

The backend additionally provides:

| Endpoint | Purpose |
|---|---|
| `GET/PUT /api/v1/sync` | Pull / push overlay (LWW) |
| `GET /api/v1/favicon?url=…` | Server-side favicon fetch + cache |
| `GET /api/v1/weather?city=…` | OWM proxy, server holds key |
| `GET /api/v1/probes` | Health of configured tailnet targets |
| `GET /api/v1/tailscale/status` | Server reports own tailscale up/down via local `tailscale status` CLI |
| `POST /api/v1/clicks` | Append click events; server aggregates |
| `GET /api/v1/stats/frequent` | Cross-device frequent links |
| `GET /api/v1/meta?url=…` | Title / og:image on link add (optional) |
| `POST /api/v1/handoff` | "Open on phone / send to PC" via SSE |
| `GET /api/v1/handoff/stream` | SSE listener for handoff |
| `GET /healthz` | Liveness (no auth) |

## 3. Options Considered

### Option A — Python + FastAPI + SQLite (CHOSEN)

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | Free, self-hosted |
| Scalability | More than enough (single-user, ~tens of writes/min) |
| Team familiarity | Owner comfortable with Python; AI agents handle FastAPI well |
| Pi/NAS fit | Runs anywhere Python 3.11+ runs; ARM support trivial |

**Pros:** Fast iteration, batteries-included (Pydantic validation, automatic OpenAPI), SQLite = single file backup, plenty of training data for coding agents.
**Cons:** Heavier runtime than Go binary; needs venv or container management on the host.

### Option B — Node + Fastify + SQLite

**Pros:** Single-language stack (JS frontend + JS backend), shared TypeScript types possible later.
**Cons:** Less owner familiarity; less interesting given existing Python comfort. Rejected.

### Option C — Go + chi + SQLite

**Pros:** Single static binary, lowest footprint on Pi, ARM cross-compile trivial.
**Cons:** Higher upfront cost for AI agents (more boilerplate), Pydantic-style validation absent. Rejected.

### Option D — Stay client-only, use a third-party sync service (Firebase, Supabase)

**Pros:** Zero ops.
**Cons:** Data leaves the tailnet. Vendor lock-in. Tailscale-aware server-side features impossible. Rejected.

## 4. Architecture

```
┌─────────────┐         ┌─────────────┐
│ PC browser  │         │ Phone PWA   │
│ (overlay LS)│         │ (overlay LS)│
└─────┬───────┘         └──────┬──────┘
      │   HTTPS over tailnet   │
      │   Bearer token         │
      └───────────┬────────────┘
                  │
        ┌─────────▼─────────┐
        │ FastAPI backend   │
        │  /sync /favicon   │
        │  /weather /probes │
        │  /stats /handoff  │
        └─────────┬─────────┘
                  │
        ┌─────────▼─────────┐
        │  SQLite (single   │
        │  file, WAL mode)  │
        │  + favicon disk   │
        │  cache dir        │
        └───────────────────┘
                  │
       ┌──────────┴──────────┐
       │ Local processes:    │
       │  - `tailscale` CLI  │
       │  - OWM API (egress) │
       │  - httpx fetcher    │
       └─────────────────────┘
```

### 4.1 Data model (SQLite)

```sql
-- Single user assumed. Multi-user trivially added later (user_id columns).
CREATE TABLE overlay (
  id            INTEGER PRIMARY KEY CHECK (id = 1),  -- singleton row
  json          TEXT    NOT NULL,                    -- full overlay JSON
  revision      INTEGER NOT NULL,                    -- server-monotonic
  client_mtime  INTEGER NOT NULL,                    -- ms epoch from client
  server_mtime  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  device_id     TEXT    NOT NULL                     -- last writer
);

CREATE TABLE click_event (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id    TEXT    NOT NULL,
  device_id  TEXT    NOT NULL,
  ts         INTEGER NOT NULL                        -- ms epoch
);
CREATE INDEX click_event_link_idx ON click_event(link_id);

CREATE TABLE favicon_cache (
  url_hash   TEXT PRIMARY KEY,                       -- sha256(url)
  source_url TEXT NOT NULL,
  bytes      BLOB,                                   -- small icons inline
  path       TEXT,                                   -- big icons on disk
  mime       TEXT,
  fetched_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  status     INTEGER NOT NULL                        -- last HTTP code; -1 = neterror
);

CREATE TABLE probe_target (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  url        TEXT NOT NULL,
  enabled    INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE probe_result (
  target_id  INTEGER NOT NULL REFERENCES probe_target(id) ON DELETE CASCADE,
  ts         INTEGER NOT NULL,
  ok         INTEGER NOT NULL,
  rtt_ms     INTEGER,
  status     INTEGER,
  PRIMARY KEY (target_id, ts)
);

CREATE TABLE handoff_event (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ts         INTEGER NOT NULL,
  from_dev   TEXT NOT NULL,
  to_dev     TEXT,                                   -- null = broadcast
  payload    TEXT NOT NULL                           -- JSON: {kind, url, ...}
);
```

### 4.2 Sync protocol (LWW whole overlay)

**Pull**

```
GET /api/v1/sync
Authorization: Bearer <token>
→ 200 { "revision": 42, "overlay": {...}, "serverMtime": 1700000000000 }
→ 204 (no overlay yet)
```

**Push**

```
PUT /api/v1/sync
Authorization: Bearer <token>
X-Device-Id: <uuid>
Body: { "overlay": {...}, "clientMtime": 1700000123456,
        "baseRevision": 42 }

→ 200 { "revision": 43, "accepted": true }
→ 409 { "accepted": false, "serverRevision": 43, "serverMtime": ... }
       Conflict: server overlay is newer than client's base. Client must
       merge by LWW field-level OR overwrite/discard local based on which
       mtime is newer.
```

**Client merge rule (LWW on whole overlay):**

- On 409, compare `serverMtime` with `clientMtime`.
- Newer wins. The newer-side payload becomes the next local state. The other side's edits since base are dropped (acceptable for single-user, multi-device).
- Client then re-PUTs with the new `baseRevision` to converge.

**Why not field-level / CRDT:** Single user, low write rate, conflict only on simultaneous offline edits. LWW is sufficient and simple to implement and audit. Field-level merge can be added later behind the same endpoint without changing storage shape.

### 4.3 Auth

- One shared secret token, generated at server bootstrap and printed once to stdout (and stored at `/var/lib/startpage/token` with `chmod 600`).
- Header: `Authorization: Bearer <token>`.
- Token configured in the client via Settings → Sync. Stored in `overlay.settings.syncToken` (not synced; remains device-local).
- Tailscale ACLs already gate network reachability; the token is belt-and-braces and supports future "lend a friend" scenarios.
- `/healthz` is the only unauthenticated route.

### 4.4 Tailscale detection (server-side)

- Server shells out to `tailscale status --json` (or reads `tailscale --socket … status`).
- Endpoint `GET /api/v1/tailscale/status` returns:
  ```json
  { "self": { "online": true, "hostname": "…", "tailnet": "…" },
    "peers": [{ "hostname": "phone", "online": true, "lastSeen": … }] }
  ```
- The browser chip flips from "probe the tailnet" to "ask the backend." HTTPS mixed-content problem disappears because the chip calls the backend (same origin via PWA / configured base URL).
- Fallback: if backend unreachable, chip falls back to the existing MagicDNS / custom-URL probe.

### 4.5 Favicon proxy

- Endpoint: `GET /api/v1/favicon?url=<page-url>`.
- Server hashes URL → checks `favicon_cache`. If fresh (< 7 days), serves cached bytes. Else fetches with `httpx`, follows `<link rel="icon">` discovery, falls back to `/favicon.ico`, falls back to Google s2 favicons, caches result (even failures with shorter TTL).
- Client `js/favicons.js` becomes thin: just `<img src="/api/v1/favicon?url=…">`. Browser caches naturally. Existing localStorage favicon cache deprecated.
- Mobile gets free CORS escape.

### 4.6 Weather proxy

- `GET /api/v1/weather?city=<name>` → forwards to OWM with the server-held key.
- OWM key configured via env var `OWM_API_KEY`. Removed from client.
- Server caches per-city 15 min (matches current client behavior).

### 4.7 Health probes

- Probe targets configured via `POST/GET/DELETE /api/v1/probes/targets`. Stored in `probe_target`.
- Background task pings each target every 30s with `httpx.head` (timeout 1.5s), records to `probe_result`.
- `GET /api/v1/probes` returns latest result per target + last-N for sparkline.
- UI: extend the current Tailscale chip area into a small "health strip" that the user can configure.

### 4.8 Click stats aggregation

- Client posts batched events: `POST /api/v1/clicks` `{events: [{linkId, ts}]}`.
- Posted opportunistically (every N clicks or on visibility change). `device_id` derived from the client.
- `GET /api/v1/stats/frequent?n=6&windowDays=30` returns merged ranking.
- Client `js/stats.js` swaps local `topLinks(...)` for backend result when sync is enabled (offline falls back to local counts).

### 4.9 Cross-device handoff (new feature, no client equivalent)

- `POST /api/v1/handoff { kind: "open", url, toDevice? }` queues an event.
- `GET /api/v1/handoff/stream` is an SSE stream the PWA keeps open; on event the PWA shows a toast: "Open <title> from PC?" → click opens.
- Enables "send this tab to my phone" or vice versa via a sidebar button.

### 4.10 PWA mobile

- Add `manifest.webmanifest`, `service-worker.js`, mobile-first CSS tweaks.
- Service worker caches the shell (HTML/CSS/JS) and `/api/v1/favicon` responses. Falls through to network for `/api/v1/sync`.
- Installable on Android/iOS home screen. Reuses existing JS modules.

### 4.11 Deployment

- Container: `python:3.11-slim` base + `pip install fastapi uvicorn[standard] httpx pydantic-settings`.
- Compose file binds:
  - `:8800` (HTTP, fronted by Tailscale `tailscale serve --https=443` or Caddy reverse proxy with cert from `tailscale cert`).
  - Volume: `/var/lib/startpage` → SQLite file + favicon disk cache + token.
- `tailscale` CLI inside container OR mounted from host (`-v /usr/bin/tailscale:/usr/bin/tailscale:ro -v /var/run/tailscale:/var/run/tailscale`). Host-mount is simpler.
- Systemd or `docker compose --restart unless-stopped`.

## 5. Trade-off Analysis

| Concern | LWW whole-overlay (chosen) | Field-level LWW | CRDT |
|---|---|---|---|
| Implementation effort | ~50 LOC | ~200 LOC | ~500 LOC + Yjs deps |
| Concurrent offline edits | Last writer wins, other side loses | Per-key merge | True merge |
| Single-user fit | Excellent | Overkill | Massive overkill |
| Future multi-user | Add user_id, still works | Same | Same |

| Concern | FastAPI (chosen) | Go | Node |
|---|---|---|---|
| Owner familiarity | High | Low | Medium |
| AI agent code quality | Excellent | Good | Excellent |
| Footprint on Pi | ~60 MB RAM idle | ~10 MB | ~50 MB |
| Iteration speed | Highest | Lowest | High |

## 6. Consequences

**Easier**
- Mobile sync becomes real.
- Tailscale detection becomes definitive (server reads `tailscale status`).
- Secrets (OWM key, future API keys) leave the client.
- Favicon CORS / cache problems vanish.
- Cross-device features (handoff, merged stats) become trivial to add.

**Harder**
- A new process to operate (start, update, back up).
- Two failure modes instead of one (offline backend → graceful degradation needed).
- Bootstrap step: token provisioning + probe URL config on each device.

**Revisit later**
- Multi-user (add `user_id` column + per-user token).
- Conflict policy if real multi-device concurrent editing becomes painful → upgrade to field-level LWW.
- TLS termination strategy (Tailscale serve vs Caddy vs traefik).

## 7. Action Items

See work plan: `docs/superpowers/plans/2026-05-26-backend-sync-redesign.md`.
