"""Application settings + logging. Everything is env-driven (prefix ``FILAMIND_``)."""

from __future__ import annotations

import logging

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, overridable via env vars or a ``.env`` file."""

    model_config = SettingsConfigDict(env_prefix="FILAMIND_", env_file=".env", extra="ignore")

    app_title: str = "FilaMind 3d"
    # Moonraker WebSocket URL handed to the frontend. Empty = the frontend derives it from
    # the serving host (same-origin reverse proxy or VITE_MOONRAKER_WS_URL).
    moonraker_ws_url: str = ""
    log_level: str = "INFO"


def get_settings() -> Settings:
    """Return the active settings (a fresh read; cheap, and easy to override in tests)."""
    return Settings()


def configure_logging(level: str) -> None:
    logging.basicConfig(level=getattr(logging, level.upper(), logging.INFO))
