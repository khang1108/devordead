from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ..database import get_db
from ..sandbox import execute_sandbox
from ..security import get_active_user

router = APIRouter(prefix="/problems", tags=["Coding & Sandbox (UC07–UC09, BR3)"])


class ExecuteCodePayload(BaseModel):
    language: str
    code: str


def _problem_status_map(conn: Any, user_id: str) -> dict[str, str]:
    rows = conn.execute(
        "SELECT problem_id, verdict FROM submissions WHERE user_id = ? AND mode = 'submit' ORDER BY created_at ASC",
        (user_id,),
    ).fetchall()
    status_map: dict[str, str] = {}
    for r in rows:
        pid = r["problem_id"]
        if r["verdict"] == "Accepted":
            status_map[pid] = "solved"
        elif status_map.get(pid) != "solved":
            status_map[pid] = "attempted"
    return status_map


def _serialize_problem(row: Any, status_value: str) -> dict[str, Any]:
    return {
        "id": row["id"],
        "slug": row["slug"],
        "title": row["title"],
        "topic": row["topic"],
        "difficulty": row["difficulty"],
        "role": row["role"],
        "status": status_value,
        "description": row["description"],
        "constraints": json.loads(row["constraints_json"] or "[]"),
        "examples": json.loads(row["examples_json"] or "[]"),
        "tests": int(row["tests_count"]),
        "approvedAt": row["approved_at"],
        "starter": json.loads(row["starter_json"] or "{}"),
    }


@router.get("")
def list_problems(user: dict = Depends(get_active_user)):
    with get_db() as conn:
        status_map = _problem_status_map(conn, user["id"])
        rows = conn.execute("SELECT * FROM problems ORDER BY id ASC").fetchall()
        return [_serialize_problem(r, status_map.get(r["id"], "todo")) for r in rows]


@router.get("/{problem_id}")
def get_problem(problem_id: str, user: dict = Depends(get_active_user)):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM problems WHERE id = ? OR slug = ?", (problem_id, problem_id)).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Không tìm thấy bài tập #{problem_id}.")
        status_map = _problem_status_map(conn, user["id"])
        return _serialize_problem(row, status_map.get(row["id"], "todo"))


def _resolve_problem_id(problem_id: str) -> str:
    with get_db() as conn:
        row = conn.execute("SELECT id FROM problems WHERE id = ? OR slug = ?", (problem_id, problem_id)).fetchone()
        return row["id"] if row else problem_id


@router.post("/{problem_id}/run")
def run_sample_tests(problem_id: str, payload: ExecuteCodePayload, _user: dict = Depends(get_active_user)):
    if not payload.code.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mã nguồn không được để trống.")
    canonical_id = _resolve_problem_id(problem_id)
    return execute_sandbox(canonical_id, payload.language, payload.code, mode="run")


@router.post("/{problem_id}/submit")
def submit_solution(problem_id: str, payload: ExecuteCodePayload, user: dict = Depends(get_active_user)):
    if not payload.code.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mã nguồn không được để trống.")
    canonical_id = _resolve_problem_id(problem_id)
    result = execute_sandbox(canonical_id, payload.language, payload.code, mode="submit")

    tests = result.get("tests", [])
    passed = sum(1 for t in tests if t.get("status") == "passed")
    total = len(tests)
    verdict = "Accepted" if (total > 0 and passed == total) else result.get("summary", "Failed")
    time_ms = int("".join(ch for ch in str(result.get("totalTime", "0")) if ch.isdigit()) or "0")
    try:
        mem_mb = float(str(result.get("peakMem", "0")).replace("MB", "").strip())
    except ValueError:
        mem_mb = 0.0

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO submissions
            (id, user_id, problem_id, language, code, mode, verdict, passed, total, time_ms, mem_mb, result_json, created_at)
            VALUES (?, ?, ?, ?, ?, 'submit', ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                f"sub-{uuid.uuid4().hex[:10]}",
                user["id"],
                canonical_id,
                payload.language,
                payload.code,
                verdict,
                passed,
                total,
                time_ms,
                mem_mb,
                json.dumps(result, ensure_ascii=False),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
    return result
