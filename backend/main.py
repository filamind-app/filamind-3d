"""Dev/prod entry point: ``python main.py`` serves the app with uvicorn."""

from __future__ import annotations

import uvicorn


def main() -> None:
    uvicorn.run("app.main:app", host="0.0.0.0", port=8030, reload=False)


if __name__ == "__main__":
    main()
