"""Vercel entrypoint for the APIx FastAPI application.

The application code remains in backend/ so local development is unchanged.
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"

# backend/ contains the existing top-level packages used by the application
# (database, index_engine, scraper, analytics, etc.).
for path in (PROJECT_ROOT, BACKEND_DIR):
    value = str(path)
    if value not in sys.path:
        sys.path.insert(0, value)

from backend.api.main import app

__all__ = ["app"]
