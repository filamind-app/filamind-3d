from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app import __version__
from app.main import FRONTEND_DIST, app

client = TestClient(app)


def test_health() -> None:
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["version"] == __version__


def test_config() -> None:
    r = client.get("/api/config")
    assert r.status_code == 200
    body = r.json()
    assert body["app_title"]
    assert "moonraker_ws_url" in body


@pytest.mark.skipif(not FRONTEND_DIST.is_dir(), reason="frontend not built")
def test_spa_index() -> None:
    r = client.get("/")
    assert r.status_code == 200
    assert "text/html" in r.headers["content-type"]
