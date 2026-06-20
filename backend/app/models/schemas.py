"""Pydantic response models for the /api surface."""

from __future__ import annotations

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    version: str


class FrontendConfig(BaseModel):
    """Runtime config the frontend can fetch instead of relying on build-time env."""

    app_title: str
    moonraker_ws_url: str
