from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

HOST = os.getenv("DEVORDEAD_HOST", "127.0.0.1")
PORT = int(os.getenv("DEVORDEAD_PORT", "8000"))
JWT_SECRET = os.getenv("DEVORDEAD_JWT_SECRET", "devordead-local-dev-secret-change-in-production")
JWT_EXPIRE_SECONDS = int(os.getenv("DEVORDEAD_JWT_EXPIRE_SECONDS", str(60 * 60 * 24 * 7)))

_raw_db = os.getenv("DEVORDEAD_DB_PATH", str(BASE_DIR / "data" / "devordead.db"))
DB_PATH = Path(_raw_db) if Path(_raw_db).is_absolute() else (BASE_DIR / _raw_db).resolve()

_raw_origins = os.getenv(
    "DEVORDEAD_CORS_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174",
)
CORS_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]
