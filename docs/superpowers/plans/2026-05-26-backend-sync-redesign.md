# Backend + Cross-Device Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Python+FastAPI+SQLite backend on the always-on tailnet host, turn the client into a PWA, and add cross-device sync + server-side Tailscale detection + favicon/weather proxies + cross-device click stats + handoff.

**Architecture:** See spec `docs/superpowers/specs/2026-05-26-backend-sync-design.md`.

**Tech stack additions:**

- Backend: Python 3.11+, FastAPI, Uvicorn, httpx, pydantic-settings, SQLite (stdlib `sqlite3` or `aiosqlite`).
- Container: Docker / docker-compose.
- Client additions: `service-worker.js`, `manifest.webmanifest`, new `js/sync.js`, new `js/api.js`, refactors to existing modules.

**Repo layout after this plan:**

```
/                       ← unchanged client root (still works file://)
  index.html
  js/ ...
  styles/ ...
  manifest.webmanifest  ← new
  service-worker.js     ← new
/server                 ← new backend
  pyproject.toml
  app/
    __init__.py
    main.py
    config.py
    db.py
    auth.py
    routers/
      sync.py
      favicon.py
      weather.py
      probes.py
      tailscale.py
      clicks.py
      stats.py
      handoff.py
      meta.py
      health.py
    services/
      favicon_fetcher.py
      tailscale_cli.py
      probe_loop.py
      handoff_bus.py
    models.py
    schemas.py
  migrations/
    001_init.sql
  Dockerfile
  docker-compose.yml
  README.md
  tests/
    conftest.py
    test_sync.py
    test_favicon.py
    ...
```

---

## Phase 0 — Decisions locked & repo prep

### Task 0.1: Add ADR + plan to repo

- Files: `docs/superpowers/specs/2026-05-26-backend-sync-design.md`, this file.
- [x] Spec written
- [x] Plan written
- [ ] Commit on a feature branch `feat/backend-sync`

### Task 0.2: Decide hostnames & paths

- [ ] Choose tailnet hostname for backend host (e.g. `pi.tail-xxxxx.ts.net`) — record in `server/README.md`
- [ ] Choose data dir on host (`/var/lib/startpage`) — create with `root:docker` `0750`
- [ ] Reserve port (default `:8800`)

---

## Phase 1 — Backend skeleton (no features yet)

### Task 1.1: Scaffold `server/` package

**Files:** New `server/pyproject.toml`, `server/app/__init__.py`, `server/app/main.py`, `server/app/config.py`.

- [ ] **Step 1:** Create `pyproject.toml` with deps: `fastapi`, `uvicorn[standard]`, `httpx`, `pydantic-settings`, `aiosqlite`, `python-multipart`. Dev deps: `pytest`, `pytest-asyncio`, `httpx[cli]`, `ruff`.
- [ ] **Step 2:** `app/config.py` — `Settings(BaseSettings)` with: `data_dir: Path`, `db_path: Path`, `favicon_dir: Path`, `auth_token: str`, `owm_api_key: str | None`, `cors_origins: list[str]`, `tailscale_socket: str | None`. Reads from env `STARTPAGE_*`.
- [ ] **Step 3:** `app/main.py` — `FastAPI(title="startpage", version="0.1.0")`, mount routers from Phase 2+, add CORS middleware from settings.
- [ ] **Step 4:** Add `app/routers/health.py` with `GET /healthz` → `{"ok": true}`.
- [ ] **Step 5:** Make `uvicorn app.main:app --host 0.0.0.0 --port 8800` runnable.

**Smoke test:**

- `uvicorn …` starts.
- `curl localhost:8800/healthz` → `{"ok": true}`.
- `curl localhost:8800/docs` shows Swagger.

### Task 1.2: SQLite bootstrap + migration runner

**Files:** New `server/app/db.py`, `server/migrations/001_init.sql`.

- [ ] **Step 1:** Translate the spec's DDL into `001_init.sql` (overlay, click_event, favicon_cache, probe_target, probe_result, handoff_event).
- [ ] **Step 2:** `db.py` — `async def connect() -> aiosqlite.Connection`. Sets `PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA synchronous=NORMAL`.
- [ ] **Step 3:** `db.py:migrate()` — track applied migrations in a `schema_migrations(filename, applied_at)` table, apply unapplied `*.sql` in lexicographic order. Run from `main.py` startup event.
- [ ] **Step 4:** Provide a `get_db()` FastAPI dependency yielding a connection.

**Smoke test:**

- Start server with fresh data dir. `sqlite3 db.sqlite '.tables'` shows all tables + `schema_migrations`.
- Restart — no re-application errors.

### Task 1.3: Bearer-token auth

**Files:** New `server/app/auth.py`.

- [ ] **Step 1:** `auth.py:require_token(request: Request, settings: Settings = Depends(get_settings)) -> None`. Reads `Authorization: Bearer <token>`, constant-time compare against `settings.auth_token`. Raise 401 on mismatch.
- [ ] **Step 2:** On first run with no token in env and no token file, generate `secrets.token_urlsafe(32)`, write to `<data_dir>/token`, log it once.
- [ ] **Step 3:** Attach `require_token` as a router-level dependency on all routers except `health`.

**Smoke test:**

- `curl /api/v1/sync` (later route) → 401 without header, 200 with valid token.

---

## Phase 2 — Sync core (LWW overlay)

### Task 2.1: `POST/GET /api/v1/sync`

**Files:** New `server/app/routers/sync.py`, `server/app/schemas.py`.

- [ ] **Step 1:** `schemas.py` — `SyncPullResponse`, `SyncPushRequest`, `SyncPushResponse`, `Conflict`. Overlay typed as `dict[str, Any]` (opaque JSON).
- [ ] **Step 2:** `GET /api/v1/sync` — read singleton overlay row. Return 204 if absent.
- [ ] **Step 3:** `PUT /api/v1/sync` — read body; in a transaction, lock the row (SQLite single-writer via WAL is enough). If row absent, INSERT with revision=1. Else if `request.baseRevision == row.revision`, UPDATE incrementing revision. Else return 409 with current row.
- [ ] **Step 4:** Validate overlay size ≤ 5 MB to avoid runaway writes; reject 413 if larger.
- [ ] **Step 5:** Tests in `tests/test_sync.py`: empty → 204; first push → 1; conflicting push → 409; concurrent pushes serialize.

**Smoke test:**

- `curl -X PUT -H 'Authorization: Bearer …' -d '{"overlay":{},"clientMtime":1,"baseRevision":0}' /api/v1/sync` → 200, revision 1.
- Repeat with `baseRevision=0` → 409.

### Task 2.2: Client sync module

**Files:** New `js/api.js`, new `js/sync.js`; modify `js/storage.js`, `js/main.js`, `js/crud/settings.js`.

- [ ] **Step 1:** `js/api.js` — small `apiFetch(path, opts)` wrapper that injects `Authorization: Bearer <token>` from `overlay.settings.sync`, prepends `overlay.settings.sync.baseUrl`. Throws typed errors (`NetError`, `AuthError`, `ConflictError`).
- [ ] **Step 2:** Storage schema bump v2 → v3: add `settings.sync = { baseUrl, token, deviceId, enabled, lastRevision, lastSyncAt }`. Migration generates `deviceId = crypto.randomUUID()`.
- [ ] **Step 3:** `js/sync.js`:
  - `init({overlay, onPulled, onConflict})` — sets up periodic poll (every 60s when tab focused, 5min when hidden) + event-driven sync after `save`.
  - `pull()` — GET sync; if revision > local, overwrite local overlay (preserving `settings.sync` and `theme`), call `onPulled`.
  - `push()` — PUT sync with current overlay (minus `settings.sync`) + `baseRevision = lastRevision` + `clientMtime`.
  - On 409 → compare mtimes → newer wins → set local to newer payload → update `lastRevision` → optionally trigger a re-push if local won.
- [ ] **Step 4:** Wire `sync.init` from `main.js` after overlay load, only if `settings.sync.enabled`.
- [ ] **Step 5:** Settings UI: new "Sync" section with Base URL input, Token input (password field), Enable toggle, "Test connection" button, "Sync now" button, last-sync timestamp.

**Smoke test:**

- Enable sync on PC, add a link, observe push.
- Open on phone (same settings), pull triggers, link appears.
- Edit on phone offline, edit on PC, reconnect phone → LWW resolves to newest mtime.

### Task 2.3: Field excluded from sync

- [ ] **Step 1:** Define `SYNC_EXCLUDE_KEYS = ['settings.sync', 'settings.theme']` (theme stays per-device).
- [ ] **Step 2:** In `sync.js`, deep-clone overlay then strip excluded paths before PUT; on pull, merge response into local while preserving excluded paths.

---

## Phase 3 — Server-side Tailscale detection

### Task 3.1: Tailscale CLI service

**Files:** New `server/app/services/tailscale_cli.py`, `server/app/routers/tailscale.py`.

- [ ] **Step 1:** `tailscale_cli.py:status_json()` — `await asyncio.create_subprocess_exec("tailscale", "status", "--json", stdout=PIPE)`, parse JSON, return dict. Cache for 5s to avoid hammering. Timeout 1.5s; on timeout return `{"online": false, "reason": "timeout"}`.
- [ ] **Step 2:** `routers/tailscale.py:GET /api/v1/tailscale/status` — call service, return trimmed payload `{self, peers, fetchedAt}`.
- [ ] **Step 3:** Handle "tailscale not installed" by returning 503 with `{detail:"tailscale CLI not found"}`. Document the `-v /usr/bin/tailscale:/usr/bin/tailscale:ro` compose mount.

**Smoke test:**

- `curl /api/v1/tailscale/status` on the host → live data.
- Disable tailscaled → server returns `online: false`.

### Task 3.2: Client chip switches to backend probe

**Files:** Modify `js/tailscale.js`.

- [ ] **Step 1:** If `settings.sync.enabled`, primary probe is `GET /api/v1/tailscale/status` via `api.js`. Treat HTTP 200 with `self.online === true` as "on".
- [ ] **Step 2:** On network failure or 4xx/5xx, fall back to existing MagicDNS / custom-probe-URL behavior.
- [ ] **Step 3:** Tooltip should say "Backend says tailnet up — last checked …" when in backend mode.

**Smoke test:**

- Sync disabled → existing behavior unchanged.
- Sync enabled, backend reachable → chip flips to backend mode and shows accurate state.

---

## Phase 4 — Favicon proxy

### Task 4.1: Favicon fetcher service

**Files:** New `server/app/services/favicon_fetcher.py`.

- [ ] **Step 1:** `fetch(page_url) -> FaviconResult(bytes|path, mime, source_url, status)`. Steps: GET page HTML with httpx (timeout 3s, follow redirects, max 1 MB), parse `<link rel="icon" …>` (or `apple-touch-icon`), absolutize, GET icon (timeout 3s, ≤ 256 KB). If that fails, try `/favicon.ico`. If that fails, fall back to `https://www.google.com/s2/favicons?domain=…&sz=64`.
- [ ] **Step 2:** Store ≤ 32 KB blobs inline in DB, larger on disk under `<data_dir>/favicons/<sha>.<ext>`.
- [ ] **Step 3:** Cache TTL = 7 days for hits, 1 day for failures.

### Task 4.2: Router

**Files:** New `server/app/routers/favicon.py`.

- [ ] **Step 1:** `GET /api/v1/favicon?url=…&size=64` — hash URL, look up cache, if miss fetch via service, return bytes with `Cache-Control: public, max-age=86400` and proper `Content-Type`.
- [ ] **Step 2:** Optional admin route `POST /api/v1/favicon/refresh?url=…` (auth required) to force refresh.

**Smoke test:**

- `curl /api/v1/favicon?url=https://github.com` saves bytes; second call hits cache (compare `X-Cache: HIT` header if added).
- Phone loads favicons via backend without CORS issues.

### Task 4.3: Client switches favicon resolution to backend

**Files:** Modify `js/favicons.js`, `js/render/grid.js`.

- [ ] **Step 1:** When `settings.sync.enabled`, `iconUrlFor(link.url)` returns `${baseUrl}/api/v1/favicon?url=${encodeURIComponent(link.url)}` instead of resolving locally.
- [ ] **Step 2:** Remove or defer the local IndexedDB/localStorage favicon cache writes when backend mode is on (browser cache + service worker handle it).
- [ ] **Step 3:** Keep file-protocol/no-sync path working as before.

---

## Phase 5 — Weather proxy

### Task 5.1: Weather router

**Files:** New `server/app/routers/weather.py`.

- [ ] **Step 1:** `GET /api/v1/weather?city=<name>&units=metric` — proxy OWM `data/2.5/weather`. Require server env `OWM_API_KEY`. 502 if upstream errors.
- [ ] **Step 2:** In-memory TTL cache 15 min keyed by `(city, units)`.

### Task 5.2: Client switch

**Files:** Modify `js/weather.js`, `js/crud/settings.js`.

- [ ] **Step 1:** If `settings.sync.enabled`, `weather.js` calls backend with city only. Hide the OWM key field from the Weather settings tab in backend mode (still configurable for offline mode).
- [ ] **Step 2:** Update README weather section to mention server-side key.

**Smoke test:** Phone shows weather without owning the API key.

---

## Phase 6 — Probes (health strip)

### Task 6.1: Background probe loop

**Files:** New `server/app/services/probe_loop.py`.

- [ ] **Step 1:** On app startup, launch `asyncio.create_task(loop())`. Every 30s, for each enabled probe target, `httpx.head(url, timeout=1.5)`; record `ok`, `rtt_ms`, `status` into `probe_result`.
- [ ] **Step 2:** Prune `probe_result` rows older than 24h every hour.

### Task 6.2: CRUD router

**Files:** New `server/app/routers/probes.py`.

- [ ] **Step 1:** `GET /api/v1/probes/targets`, `POST /api/v1/probes/targets`, `DELETE /api/v1/probes/targets/{id}`.
- [ ] **Step 2:** `GET /api/v1/probes` → `[{id, name, url, latest:{ok, rtt_ms, ts}, history:[…30 points…]}]`.

### Task 6.3: Client UI

**Files:** Modify `index.html`, `styles/main.css`, modify `js/tailscale.js` to a more general `js/health.js` (or add alongside).

- [ ] **Step 1:** Replace the single Tailscale chip area with a "health strip" containing 1–N chips. Tailscale chip remains first.
- [ ] **Step 2:** Each chip has a dot + name + tooltip showing sparkline (CSS or inline SVG from history).
- [ ] **Step 3:** Settings → Probes section: add/edit/delete targets via backend API.
- [ ] **Step 4:** Hide the strip (or show only Tailscale) when sync is disabled.

---

## Phase 7 — Click stats aggregation

### Task 7.1: Server routes

**Files:** New `server/app/routers/clicks.py`, `server/app/routers/stats.py`.

- [ ] **Step 1:** `POST /api/v1/clicks` body `{events:[{linkId, ts}], deviceId}` → bulk insert into `click_event`. Validate `len(events) ≤ 500`.
- [ ] **Step 2:** `GET /api/v1/stats/frequent?n=6&windowDays=30` → SQL `SELECT link_id, COUNT(*) FROM click_event WHERE ts > … GROUP BY link_id ORDER BY 2 DESC LIMIT n`.
- [ ] **Step 3:** Periodic compaction: keep raw events 30 days, then collapse into a per-link counter table (defer to a follow-up if time-boxed).

### Task 7.2: Client batching

**Files:** Modify `js/stats.js`.

- [ ] **Step 1:** Add an in-memory queue. Every click pushes `{linkId, ts}`. On `visibilitychange→hidden` or every 30s, flush via `POST /api/v1/clicks`.
- [ ] **Step 2:** `topLinks(merged)` in backend mode calls `GET /api/v1/stats/frequent`, caches result for 60s. Falls back to local counts on network error.
- [ ] **Step 3:** "Clear stats" button: in backend mode, calls `DELETE /api/v1/stats` (add this route) and also clears local.

---

## Phase 8 — Cross-device handoff

### Task 8.1: SSE bus

**Files:** New `server/app/services/handoff_bus.py`, `server/app/routers/handoff.py`.

- [ ] **Step 1:** `handoff_bus.py` — `asyncio.Queue` per connected device id. `publish(event)` fans out to all queues except the source.
- [ ] **Step 2:** `POST /api/v1/handoff` body `{kind:"open", url, title?, toDevice?}` → publish.
- [ ] **Step 3:** `GET /api/v1/handoff/stream?deviceId=…` → `StreamingResponse` with `text/event-stream`, sends `data: <json>\n\n` per event, plus periodic `:ping`.

### Task 8.2: Client UI

**Files:** New `js/handoff.js`; modify `js/main.js`; modify sidebar/grid to expose a "send to device" affordance.

- [ ] **Step 1:** `handoff.js:listen()` opens an `EventSource` to `/api/v1/handoff/stream?deviceId=…`. On event, show a toast: "Open <title>?" with Open / Dismiss buttons.
- [ ] **Step 2:** Card menu (long-press or context menu): "Send to phone / Send to PC" → `POST /api/v1/handoff`. Device list fetched from `/api/v1/tailscale/status` peers.

**Smoke test:** Trigger from PC → toast on phone → tap → URL opens.

---

## Phase 9 — Link metadata enrichment (proposed extra)

### Task 9.1: `GET /api/v1/meta?url=…`

**Files:** New `server/app/routers/meta.py`.

- [ ] **Step 1:** Fetch page (timeout 3s, max 512 KB), parse `<title>`, `meta[property=og:title]`, `meta[property=og:image]`, `meta[name=description]`. Return JSON. Cache 7 days.
- [ ] **Step 2:** Use in link-editor "Add link" modal: paste URL → autofill name + favicon preview.

---

## Phase 10 — PWA

### Task 10.1: Web app manifest

**Files:** New `manifest.webmanifest`, modify `index.html`.

- [ ] **Step 1:** Manifest with `name`, `short_name=Startpage`, `start_url=/`, `display=standalone`, `theme_color`, `background_color`, 192/512 icons (generate from `favicon.png`).
- [ ] **Step 2:** `<link rel="manifest">` + iOS meta tags.

### Task 10.2: Service worker

**Files:** New `service-worker.js`, modify `js/main.js`.

- [ ] **Step 1:** Cache-first for static assets (`index.html`, `js/**`, `styles/**`, `favicon.png`). Versioned cache name; on update, evict old.
- [ ] **Step 2:** Network-first for `/api/v1/sync`, `/api/v1/stats/*`, `/api/v1/handoff/*`.
- [ ] **Step 3:** Stale-while-revalidate for `/api/v1/favicon`, `/api/v1/weather`.
- [ ] **Step 4:** `main.js` registers `service-worker.js` after window load (feature-detect).

### Task 10.3: Mobile CSS pass

**Files:** Modify `styles/main.css`.

- [ ] **Step 1:** Add a mobile media query bundle: collapse sidebar into a bottom sheet or hamburger; enlarge tap targets; convert grid to single column under 600 px.
- [ ] **Step 2:** Test on actual phone — keyboard does not occlude search, touch DnD usable or disabled gracefully.

---

## Phase 11 — Packaging & deploy

### Task 11.1: Dockerfile + compose

**Files:** New `server/Dockerfile`, `server/docker-compose.yml`, `server/README.md`.

- [ ] **Step 1:** Dockerfile based on `python:3.11-slim`, install deps from `pyproject.toml` (pip + `--no-cache-dir`), copy app, run `uvicorn`.
- [ ] **Step 2:** `docker-compose.yml`:
  ```yaml
  services:
    startpage:
      build: .
      restart: unless-stopped
      ports: ["127.0.0.1:8800:8800"]
      volumes:
        - /var/lib/startpage:/data
        - /usr/bin/tailscale:/usr/bin/tailscale:ro
        - /var/run/tailscale:/var/run/tailscale
      environment:
        STARTPAGE_DATA_DIR: /data
        STARTPAGE_OWM_API_KEY: ${OWM_API_KEY}
        STARTPAGE_CORS_ORIGINS: "*"
  ```
- [ ] **Step 3:** README: install steps, token bootstrap, how to expose via `tailscale serve --https=443 http://localhost:8800` or Caddy with `tailscale cert`.

### Task 11.2: Frontend hosting decision

- [ ] **Step 1:** Decide: serve static frontend from the same FastAPI instance (`StaticFiles` mount at `/`) OR keep GitHub Pages. Recommendation: serve from FastAPI in backend mode so the PWA scope and API share an origin → simpler CORS + SW.
- [ ] **Step 2:** If self-serve, add `app.mount("/", StaticFiles(directory=settings.frontend_dir, html=True))` last. Copy `index.html`, `js/`, `styles/`, manifest, service worker into image at build time (or bind-mount during dev).

### Task 11.3: Bootstrap procedure

- [ ] **Step 1:** Document one-liner: `docker compose up -d` → `docker compose logs | grep "Bootstrap token:"` → paste into Settings → Sync on each device.
- [ ] **Step 2:** Document QR pairing follow-up (Phase 12).

---

## Phase 12 — QR pairing (proposed extra, post-MVP)

- [ ] Add `GET /api/v1/pair/qr` (auth) returning a PNG QR encoding `{baseUrl, token}` JSON.
- [ ] Settings → Sync → "Pair another device" button shows QR on screen 1.
- [ ] On device 2, "Scan QR" uses `BarcodeDetector` API → autofills the Sync form.

---

## Phase 13 — Tests & docs

### Task 13.1: Backend tests

- [ ] `tests/conftest.py` with a fresh-tmp-dir `Settings` fixture + `TestClient`.
- [ ] `test_auth.py` — 401 unauth, 200 auth.
- [ ] `test_sync.py` — happy path + 409 conflict + size cap.
- [ ] `test_favicon.py` — mock httpx; cache hit/miss.
- [ ] `test_probes.py` — mock target, verify result row inserted.

### Task 13.2: README updates

- [ ] Update root `README.md`: add "Optional self-hosted backend" section linking to `server/README.md`.
- [ ] List which features require the backend (sync, server-side tailscale, favicon/weather proxy, handoff, merged stats).

### Task 13.3: CHANGELOG (if file exists, else skip)

---

## Acceptance criteria

- [ ] Fresh client (PC) without sync settings → app behaves exactly as today (no regression).
- [ ] Enable sync with valid token on PC → add link → install PWA on phone with same settings → link appears within 60 s.
- [ ] Pull plug on backend → all features that have a client fallback still work (links, search, weather with key, tailscale via MagicDNS, local stats).
- [ ] `docker compose up -d` on the NAS/Pi yields a running service reachable on the tailnet over HTTPS.
- [ ] No secret (token, OWM key) ships in the static client.
- [ ] Lighthouse PWA score ≥ 90 on the phone.

---

## Open questions (resolve during execution)

- TLS termination: Tailscale Serve vs Caddy + `tailscale cert` — pick during Phase 11.
- Whether to also keep a static `index.html` deployable to GitHub Pages without backend, or make backend the only path. Default: keep both.
- Multi-user: defer until requested.
