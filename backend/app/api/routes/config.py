"""Runtime config the frontend fetches at boot."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.config import Settings, get_settings
from app.models.schemas import FrontendConfig

router = APIRouter(tags=["config"])

SettingsDep = Annotated[Settings, Depends(get_settings)]


@router.get("/config", response_model=FrontendConfig)
async def frontend_config(settings: SettingsDep) -> FrontendConfig:
    return FrontendConfig(
        app_title=settings.app_title,
        moonraker_ws_url=settings.moonraker_ws_url,
    )
