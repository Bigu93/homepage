# Startpage — Backend Server

FastAPI + SQLite backend for cross-device sync, server-side Tailscale detection, favicon/weather proxies, health probes, click stats, and cross-device handoff.

## Requirements

- Docker + Docker Compose (or Python 3.11+ for bare-metal)
- An always-on host on your Tailscale tailnet (NAS, Pi, etc.)

## Quick start

```bash
# 1. Clone / cd into server/
cd server

# 2. (Optional) set your OpenWeatherMap key
echo "OWM_API_KEY=your_key_here" > .env

# 3. Start
docker compose up -d

# 4. Grab the bootstrap token (printed once on first run)
docker compose logs | grep "Bootstrap token"
```

The token is also stored at `/var/lib/startpage/token` with `chmod 600`.

## Expose over HTTPS on your tailnet

**Option A — Tailscale Serve (recommended)**

```bash
# On the host (not inside the container):
tailscale serve --bg https / http://localhost:8800
```

The startpage is now available at `https://<hostname>.tail-xxxxx.ts.net/` with a valid cert, accessible to all tailnet peers.

**Option B — Caddy with tailscale cert**

```caddyfile
<hostname>.tail-xxxxx.ts.net {
    tls {
        get_certificate tailscale
    }
    reverse_proxy localhost:8800
}
```

## Client configuration

Open startpage → Settings → Sync:

- **Base URL**: `https://<hostname>.tail-xxxxx.ts.net` (or `http://localhost:8800` locally)
- **Token**: value from step 4 above
- Enable sync, hit "Test connection", click "Sync now"

## Data

All data lives in `/var/lib/startpage/`:

- `db.sqlite` — overlay, click events, probe results, handoff log
- `favicons/` — cached favicon images > 32 KB
- `token` — bearer token (chmod 600)

Back up the whole directory to preserve state.

## API reference

Swagger UI: `http://localhost:8800/docs`

### Key endpoints

| Method   | Path                                | Description                         |
| -------- | ----------------------------------- | ----------------------------------- |
| `GET`    | `/healthz`                          | Liveness (no auth)                  |
| `GET`    | `/api/v1/sync`                      | Pull current overlay                |
| `PUT`    | `/api/v1/sync`                      | Push overlay (LWW)                  |
| `GET`    | `/api/v1/favicon?url=…`             | Favicon proxy + cache               |
| `GET`    | `/api/v1/weather?city=…`            | OWM proxy                           |
| `GET`    | `/api/v1/tailscale/status`          | Server-side tailscale detect        |
| `GET`    | `/api/v1/probes`                    | Health probe results                |
| `POST`   | `/api/v1/probes/targets`            | Add probe target                    |
| `POST`   | `/api/v1/clicks`                    | Batch click events                  |
| `GET`    | `/api/v1/stats/frequent`            | Cross-device frequent links         |
| `DELETE` | `/api/v1/stats`                     | Clear all click data                |
| `POST`   | `/api/v1/handoff`                   | Send URL to another device          |
| `GET`    | `/api/v1/handoff/stream?deviceId=…` | SSE listener                        |
| `GET`    | `/api/v1/meta?url=…`                | og:title / og:image for link-add UX |

## Running bare-metal (without Docker)

```bash
cd server
python -m venv .venv && source .venv/bin/activate
pip install -e .
STARTPAGE_DATA_DIR=./data STARTPAGE_OWM_API_KEY=xxx uvicorn app.main:app --reload
```

## Tailscale socket mount

The `tailscale status --json` call needs access to the tailscale daemon socket. The compose file mounts `/var/run/tailscale` read-only. If your distro uses a different path, update the volume mount accordingly.
