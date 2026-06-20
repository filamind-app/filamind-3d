"""FastAPI application factory: the /api seam + serving the built SPA."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app import __version__
from app.api.router import api_router
from app.config import configure_logging, get_settings

# <repo>/frontend/dist — the prebuilt bundle the printer host serves.
FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        yield

    app = FastAPI(
        title="FilaMind 3d",
        version=__version__,
        summary="Lean host for the FilaMind 3d control UI.",
        lifespan=lifespan,
    )
    app.include_router(api_router)

    # Serve the SPA if it has been built. The app uses hash routing, so the server only ever
    # serves "/" (index.html) + /assets/* — no history-mode fallback is needed.
    if FRONTEND_DIST.is_dir():
        app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="spa")

    return app


app = create_app()
