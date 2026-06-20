"""Liveness + version endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app import __version__
from app.models.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", version=__version__)
