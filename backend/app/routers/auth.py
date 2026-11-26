from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ..database import get_db
from ..security import (
    create_access_token,
    derive_initials,
    get_authenticated_user,
    hash_password,
    row_to_user_profile,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Auth (UC01)"])


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)
    name: str | None = None


class LoginRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=1)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=3)


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest):
    email = payload.email.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Địa chỉ email không hợp lệ.")
    if len(payload.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Mật khẩu phải có ít nhất 8 ký tự.",
        )

    with get_db() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email này đã được đăng ký.",
            )

        user_id = f"u-{uuid.uuid4().hex[:10]}"
        raw_name = (payload.name or "").strip() or email.split("@")[0].replace(".", " ").replace("_", " ").title()
        initials = derive_initials(raw_name, "UV")
        pw_hash = hash_password(payload.password)
        created_at = datetime.now(timezone.utc).isoformat()

        conn.execute(
            """
            INSERT INTO users (id, email, password_hash, name, initials, account_role, role, level, streak_days, created_at)
            VALUES (?, ?, ?, ?, ?, 'candidate', 'Backend', 'Fresher', 1, ?)
            """,
            (user_id, email, pw_hash, raw_name, initials, created_at),
        )
        row = dict(conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone())

    token = create_access_token(row["id"], row["email"], row["account_role"])
    return {
        "accessToken": token,
        "tokenType": "Bearer",
        "user": row_to_user_profile(row),
    }


@router.post("/login")
def login(payload: LoginRequest):
    email = payload.email.strip().lower()
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not row or not verify_password(payload.password, row["password_hash"]):
            # UC01 · E2: generic error without revealing whether email or password was wrong
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email hoặc mật khẩu không đúng.",
            )
        user_dict = dict(row)

    token = create_access_token(user_dict["id"], user_dict["email"], user_dict["account_role"])
    return {
        "accessToken": token,
        "tokenType": "Bearer",
        "user": row_to_user_profile(user_dict),
    }


@router.get("/oauth/{provider}")
def oauth_login(provider: str):
    prov = provider.strip().lower()
    if prov not in ("google", "github"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nhà cung cấp OAuth không được hỗ trợ.")

    email = f"{prov}.user@devordead.local"
    display_name = f"Thành viên {prov.capitalize()}"
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not row:
            user_id = f"u-{uuid.uuid4().hex[:10]}"
            conn.execute(
                """
                INSERT INTO users (id, email, password_hash, name, initials, account_role, role, level, streak_days, created_at)
                VALUES (?, ?, ?, ?, ?, 'candidate', 'Backend', 'Fresher', 1, ?)
                """,
                (
                    user_id,
                    email,
                    hash_password(uuid.uuid4().hex),
                    display_name,
                    derive_initials(display_name, "OA"),
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
            row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        user_dict = dict(row)

    token = create_access_token(user_dict["id"], user_dict["email"], user_dict["account_role"])
    return {
        "accessToken": token,
        "tokenType": "Bearer",
        "user": row_to_user_profile(user_dict),
    }


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    email = payload.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Vui lòng nhập địa chỉ email hợp lệ.")
    return {
        "message": f"Nếu tài khoản {email} tồn tại, hướng dẫn đặt lại mật khẩu đã được ghi nhận.",
    }


@router.get("/me")
def me(user: dict = Depends(get_authenticated_user)):
    return row_to_user_profile(user)
