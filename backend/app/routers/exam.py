"""Chế độ thi (Exam mode) cho trang luyện tập coding.

Trình duyệt chỉ *báo cáo* dấu hiệu (thoát toàn màn hình, rời tab, dán mã từ ngoài…);
mọi kết luận về tính trung thực đều được tính lại ở đây từ bảng exam_events, không tin
con số tổng do client gửi lên.
"""

from __future__ import annotations

import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ..database import get_db
from ..security import get_active_user

router = APIRouter(prefix="/exam-sessions", tags=["Exam mode (chế độ thi)"])

ALLOWED_DURATIONS_MIN = (15, 30, 45, 60)
# Cho phép nộp trễ một chút so với hạn để bù độ trễ mạng khi client tự nộp lúc hết giờ.
SUBMIT_GRACE_SEC = 20
MAX_EVENTS_PER_BATCH = 100
MAX_EVENTS_PER_SESSION = 2000

EventType = Literal[
    "fullscreen_exit",  # thoát chế độ toàn màn hình
    "tab_hidden",  # chuyển tab / thu nhỏ cửa sổ (kèm thời lượng)
    "window_blur",  # cửa sổ mất focus nhưng vẫn hiển thị (alt-tab sang app khác, màn hình 2)
    "paste_blocked",  # dán nội dung không được copy từ trong trang
    "drop_blocked",  # kéo-thả văn bản từ ngoài vào trình soạn thảo
    "large_insert",  # một lần chèn lớn bất thường không đến từ thao tác dán nội bộ
    "resumed",  # tải lại trang giữa chừng rồi tiếp tục
]

# Trọng số điểm nghi vấn cho mỗi loại sự kiện.
EVENT_WEIGHTS: dict[str, int] = {
    "fullscreen_exit": 2,
    "tab_hidden": 2,
    "window_blur": 1,
    "paste_blocked": 1,
    "drop_blocked": 1,
    "large_insert": 3,
    "resumed": 1,
}
# Cộng thêm 1 điểm cho mỗi 10 giây ở ngoài trang (tab ẩn hoặc cửa sổ mất focus).
AWAY_MS_PER_POINT = 10_000
LEVEL_WARNING_MIN = 1
LEVEL_SUSPICIOUS_MIN = 6


class StartExamPayload(BaseModel):
    problemId: str
    durationMinutes: int


class ExamEventIn(BaseModel):
    type: EventType
    at: str | None = None
    durationMs: int = Field(default=0, ge=0, le=24 * 3600 * 1000)
    chars: int = Field(default=0, ge=0, le=1_000_000)


class ExamEventsPayload(BaseModel):
    events: list[ExamEventIn] = Field(default_factory=list, max_length=MAX_EVENTS_PER_BATCH)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse(ts: str) -> datetime:
    dt = datetime.fromisoformat(ts)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _deadline(row: sqlite3.Row) -> datetime:
    return _parse(row["started_at"]) + timedelta(seconds=int(row["duration_sec"]))


def _resolve_problem_id(conn: sqlite3.Connection, problem_id: str) -> str | None:
    row = conn.execute("SELECT id FROM problems WHERE id = ? OR slug = ?", (problem_id, problem_id)).fetchone()
    return row["id"] if row else None


def _expire_if_overdue(conn: sqlite3.Connection, row: sqlite3.Row) -> sqlite3.Row:
    if row["status"] == "active" and _now() > _deadline(row) + timedelta(seconds=SUBMIT_GRACE_SEC):
        conn.execute(
            "UPDATE exam_sessions SET status = 'expired', ended_at = ? WHERE id = ?",
            (_deadline(row).isoformat(), row["id"]),
        )
        row = conn.execute("SELECT * FROM exam_sessions WHERE id = ?", (row["id"],)).fetchone()
    return row


def _load_owned_session(conn: sqlite3.Connection, session_id: str, user_id: str) -> sqlite3.Row:
    row = conn.execute(
        "SELECT * FROM exam_sessions WHERE id = ? AND user_id = ?", (session_id, user_id)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên thi.")
    return _expire_if_overdue(conn, row)


def compute_integrity(conn: sqlite3.Connection, session_id: str) -> dict[str, Any]:
    rows = conn.execute(
        "SELECT type, client_at, received_at, duration_ms, chars FROM exam_events WHERE session_id = ? ORDER BY id ASC",
        (session_id,),
    ).fetchall()
    counts: dict[str, int] = {t: 0 for t in EVENT_WEIGHTS}
    away_ms = 0
    score = 0
    for r in rows:
        counts[r["type"]] = counts.get(r["type"], 0) + 1
        score += EVENT_WEIGHTS.get(r["type"], 0)
        if r["type"] in ("tab_hidden", "window_blur"):
            away_ms += int(r["duration_ms"])
    score += away_ms // AWAY_MS_PER_POINT

    if score >= LEVEL_SUSPICIOUS_MIN:
        level = "suspicious"
    elif score >= LEVEL_WARNING_MIN:
        level = "warning"
    else:
        level = "clean"

    return {
        "level": level,
        "score": score,
        "counts": counts,
        "awayMs": away_ms,
        "events": [
            {
                "type": r["type"],
                "at": r["client_at"] or r["received_at"],
                "durationMs": int(r["duration_ms"]),
                "chars": int(r["chars"]),
            }
            for r in rows[-200:]
        ],
    }


def serialize_session(conn: sqlite3.Connection, row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "problemId": row["problem_id"],
        "status": row["status"],
        "durationSec": int(row["duration_sec"]),
        "startedAt": row["started_at"],
        "endsAt": _deadline(row).isoformat(),
        "endedAt": row["ended_at"],
        "submissionId": row["submission_id"],
        "serverNow": _now().isoformat(),
        "integrity": compute_integrity(conn, row["id"]),
    }


def require_active_session(conn: sqlite3.Connection, session_id: str, user_id: str, problem_id: str) -> sqlite3.Row:
    """Dùng bởi /problems/{id}/submit: chỉ nhận bài thi khi phiên còn hiệu lực và đúng bài."""
    row = _load_owned_session(conn, session_id, user_id)
    if row["problem_id"] != problem_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phiên thi không thuộc bài tập này.")
    if row["status"] == "expired":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Đã hết giờ làm bài — phiên thi đã đóng.")
    if row["status"] != "active":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phiên thi đã kết thúc, không thể nộp thêm.")
    return row


def finalize_session(conn: sqlite3.Connection, session_id: str, submission_id: str) -> dict[str, Any]:
    conn.execute(
        "UPDATE exam_sessions SET status = 'submitted', ended_at = ?, submission_id = ? WHERE id = ?",
        (_now().isoformat(), submission_id, session_id),
    )
    row = conn.execute("SELECT * FROM exam_sessions WHERE id = ?", (session_id,)).fetchone()
    return serialize_session(conn, row)


@router.post("", status_code=status.HTTP_201_CREATED)
def start_exam(payload: StartExamPayload, user: dict = Depends(get_active_user)):
    if payload.durationMinutes not in ALLOWED_DURATIONS_MIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Thời lượng thi phải là một trong {', '.join(map(str, ALLOWED_DURATIONS_MIN))} phút.",
        )
    with get_db() as conn:
        problem_id = _resolve_problem_id(conn, payload.problemId)
        if not problem_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Không tìm thấy bài tập #{payload.problemId}.")

        # Mỗi người chỉ có một phiên thi đang mở: phiên cũ bị coi là bỏ dở.
        conn.execute(
            "UPDATE exam_sessions SET status = 'abandoned', ended_at = ? WHERE user_id = ? AND status = 'active'",
            (_now().isoformat(), user["id"]),
        )
        session_id = f"exam-{uuid.uuid4().hex[:12]}"
        conn.execute(
            """
            INSERT INTO exam_sessions (id, user_id, problem_id, status, duration_sec, started_at)
            VALUES (?, ?, ?, 'active', ?, ?)
            """,
            (session_id, user["id"], problem_id, payload.durationMinutes * 60, _now().isoformat()),
        )
        row = conn.execute("SELECT * FROM exam_sessions WHERE id = ?", (session_id,)).fetchone()
        return serialize_session(conn, row)


@router.get("/{session_id}")
def get_exam(session_id: str, user: dict = Depends(get_active_user)):
    with get_db() as conn:
        row = _load_owned_session(conn, session_id, user["id"])
        return serialize_session(conn, row)


@router.post("/{session_id}/events")
def record_events(session_id: str, payload: ExamEventsPayload, user: dict = Depends(get_active_user)):
    with get_db() as conn:
        row = _load_owned_session(conn, session_id, user["id"])
        if row["status"] != "active":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phiên thi đã kết thúc.")
        existing = conn.execute(
            "SELECT COUNT(*) AS n FROM exam_events WHERE session_id = ?", (session_id,)
        ).fetchone()["n"]
        room = max(0, MAX_EVENTS_PER_SESSION - int(existing))
        received_at = _now().isoformat()
        accepted = payload.events[:room]
        conn.executemany(
            """
            INSERT INTO exam_events (session_id, type, client_at, received_at, duration_ms, chars)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [(session_id, e.type, e.at, received_at, e.durationMs, e.chars) for e in accepted],
        )
        return {"accepted": len(accepted), "integrity": compute_integrity(conn, session_id)}


@router.post("/{session_id}/abandon")
def abandon_exam(session_id: str, user: dict = Depends(get_active_user)):
    with get_db() as conn:
        row = _load_owned_session(conn, session_id, user["id"])
        if row["status"] == "active":
            conn.execute(
                "UPDATE exam_sessions SET status = 'abandoned', ended_at = ? WHERE id = ?",
                (_now().isoformat(), session_id),
            )
            row = conn.execute("SELECT * FROM exam_sessions WHERE id = ?", (session_id,)).fetchone()
        return serialize_session(conn, row)
