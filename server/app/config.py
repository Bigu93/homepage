"""Runtime configuration via env vars (STARTPAGE_* prefix)."""

from __future__ import annotations

import secrets
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="STARTPAGE_", env_file=".env")

    # Storage
    data_dir: Path = Path("/var/lib/startpage")

    @property
    def db_path(self) -> Path:
        return self.data_dir / "db.sqlite"

    @property
    def favicon_dir(self) -> Path:
        return self.data_dir / "favicons"

    @property
    def token_path(self) -> Path:
        return self.data_dir / "token"

    # Auth — populated by bootstrap() if not set
    auth_token: str = ""

    # Upstream API keys
    owm_api_key: str = ""

    # CORS — space-separated list or "*"
    cors_origins: str = "*"

    # Tailscale socket path (host-mounted into container)
    tailscale_socket: str = "/var/run/tailscale/tailscaled.sock"

    # Optional: path to serve static frontend from
    frontend_dir: str = ""

    # Probe background task interval (seconds)
    probe_interval_s: int = 30

    def cors_origins_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def bootstrap(settings: Settings) -> None:
    """Ensure data_dir and auth token exist. Call once at startup."""
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.favicon_dir.mkdir(parents=True, exist_ok=True)

    if not settings.auth_token:
        token_path = settings.token_path
        if token_path.exists():
            settings.auth_token = token_path.read_text().strip()
        else:
            token = secrets.token_urlsafe(32)
            token_path.write_text(token)
            token_path.chmod(0o600)
            settings.auth_token = token
            print(f"\n*** Bootstrap token: {token} ***\n", flush=True)
