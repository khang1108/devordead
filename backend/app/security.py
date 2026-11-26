from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import Header, HTTPException, status

from .config import JWT_EXPIRE_SECONDS, JWT_SECRET
from .database import get_db


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return f"pbkdf2_sha256${_b64url_encode(salt)}${_b64url_encode(dk)}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        scheme, salt_b64, dk_b64 = stored_hash.split("$", 2)
        if scheme != "pbkdf2_sha256":
            return False
        salt = _b64url_decode(salt_b64)
        expected = _b64url_decode(dk_b64)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def create_access_token(user_id: str, email: str, account_role: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "role": account_role,
        "iat": now,
        "exp": now + JWT_EXPIRE_SECONDS,
    }
    h_seg = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    p_seg = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{h_seg}.{p_seg}".encode("ascii")
    sig = hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{h_seg}.{p_seg}.{_b64url_encode(sig)}"


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        h_seg, p_seg, sig_seg = parts
        signing_input = f"{h_seg}.{p_seg}".encode("ascii")
        expected_sig = hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
        actual_sig = _b64url_decode(sig_seg)
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        payload = json.loads(_b64url_decode(p_seg).decode("utf-8"))
        if not isinstance(payload, dict):
            return None
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def derive_initials(name: str, fallback: str = "UV") -> str:
    parts = [p for p in name.strip().split() if p]
    if not parts:
        return fallback
    if len(parts) == 1:
        return parts[0][:2].upper()
    return f"{parts[0][0]}{parts[-1][0]}".upper()


def row_to_user_profile(row: dict[str, Any]) -> dict[str, Any]:
    role = row["role"] or "Backend"
    level = row["level"] or "Fresher"
    account_role = row["account_role"] or "candidate"
    subtitle = "Quản trị viên" if account_role == "admin" else f"{role} · {level}"
    return {
        "id": row["id"],
        "name": row["name"],
        "initials": row["initials"] or derive_initials(row["name"]),
        "subtitle": subtitle,
        "email": row["email"],
        "accountRole": account_role,
        "role": role,
        "level": level,
        "targetCompany": row["target_company"] or "",
        "interviewInDays": row["interview_in_days"],
        "streakDays": int(row["streak_days"] or 0),
    }


def get_optional_user(authorization: str | None = Header(default=None)) -> dict[str, Any] | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization[7:].strip()
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        return None
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (payload["sub"],)).fetchone()
        return dict(row) if row else None


WORKSPACE_USER_ID = "u-workspace"


def get_authenticated_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    """Strictly require a valid Bearer JWT token."""
    user = get_optional_user(authorization)
    if user:
        return user
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Phiên đăng nhập chưa được khởi tạo. Vui lòng đăng ký hoặc đăng nhập.",
    )


def get_active_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    """Return authenticated user if Bearer token is valid; otherwise ensure and return an isolated local workspace profile."""
    user = get_optional_user(authorization)
    if user:
        return user
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (WORKSPACE_USER_ID,)).fetchone()
        if not row:
            conn.execute(
                """
                INSERT OR IGNORE INTO users
                (id, email, password_hash, name, initials, account_role, role, level, streak_days, created_at)
                VALUES (?, ?, ?, ?, ?, 'candidate', 'Backend', 'Fresher', 1, ?)
                """,
                (
                    WORKSPACE_USER_ID,
                    "workspace@devordead.local",
                    hash_password(os.urandom(16).hex()),
                    "Ứng viên DevOrDead",
                    "UV",
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
            row = conn.execute("SELECT * FROM users WHERE id = ?", (WORKSPACE_USER_ID,)).fetchone()
        if row:
            return dict(row)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Phiên đăng nhập chưa được khởi tạo. Vui lòng đăng ký hoặc đăng nhập.",
    )
