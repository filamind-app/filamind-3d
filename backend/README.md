# FilaMind 3d — backend

A **lean FastAPI host**: it serves the built frontend SPA and exposes a small `/api` seam. It deliberately
does **not** proxy Moonraker — the frontend talks to Moonraker directly via `@filamind-app/core` (same-origin
reverse proxy or `VITE_MOONRAKER_WS_URL`). App-specific services (plugin host, etc.) attach here later.

## Endpoints
- `GET /api/health` → `{ status, version }`
- `GET /api/config` → `{ app_title, moonraker_ws_url }` (runtime config the frontend can fetch at boot)
- `GET /` and `/assets/*` → the built `../frontend/dist` (only when it exists; the app uses hash routing, so no history-mode fallback is needed)

## Structure (mirrors the FilaMind flow backend)
```
backend/
  app/
    main.py            # create_app() factory + static SPA mount
    config.py          # pydantic-settings (env prefix FILAMIND_)
    api/router.py      # /api router
    api/routes/        # health.py, config.py
    models/schemas.py  # pydantic response models
  tests/test_api.py    # pytest + FastAPI TestClient
  main.py              # uvicorn entry (port 8030)
```

## Develop
```bash
python -m venv .venv
.venv/Scripts/activate        # Windows  (or: source .venv/bin/activate)
pip install -r requirements-dev.txt
ruff check . && ruff format --check .
mypy app
pytest
python main.py                # serves on :8030
```

## Config (env, prefix `FILAMIND_`)
- `FILAMIND_APP_TITLE` — UI/title (default `FilaMind 3d`)
- `FILAMIND_MOONRAKER_WS_URL` — WS URL handed to the frontend (empty = derive from the serving host)
- `FILAMIND_LOG_LEVEL` — default `INFO`

Lean by design (fastapi · uvicorn · pydantic · pydantic-settings — no numpy/jinja/kconfig). GPL-3.0-or-later.
R1: no third-party Klipper-UI/tool names in shipped code (guard in CI).
