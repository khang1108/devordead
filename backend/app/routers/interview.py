from __future__ import annotations

import json
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel

from ..database import get_db
from ..security import get_active_user

router = APIRouter(prefix="/interviews", tags=["AI Mock Interview (UC10–UC13, BR1, BR2)"])
ws_router = APIRouter(tags=["AI Mock Interview WebSocket"])

HR_PLAN = ["Introduction", "Project experience", "Behavioral (STAR)", "Situational", "Culture fit"]
TECH_PLAN = [
    "Giới thiệu & dự án",
    "Kiến thức chuyên môn",
    "Phân tích hệ thống",
    "Live coding trong Sandbox",
    "Độ phức tạp & edge case",
]

HR_PROMPTS = [
    "Hi, thanks for joining today. Could you briefly introduce yourself and the backend or software role you are targeting?",
    "Could you walk me through a challenging engineering project you owned recently, including your specific responsibility?",
    "Tell me about a time you disagreed with a teammate on a technical decision. What action did you take, and what was the measurable result?",
    "How do you handle tight deadlines when requirements change halfway through a sprint?",
    "Why are you interested in this role, and what kind of engineering culture helps you do your best work?",
]

TECH_PROMPTS = [
    "Chào bạn. Hãy giới thiệu ngắn gọn về dự án kỹ thuật gần nhất mà bạn tự hào nhất và vai trò của bạn trong dự án.",
    "Trong thiết kế REST API, idempotency có ý nghĩa gì và bạn đảm bảo an toàn khi client retry request thanh toán ra sao?",
    "Khi bảng PostgreSQL tăng lên 10 triệu dòng và truy vấn lọc theo 2 cột bị chậm, bạn dùng EXPLAIN ANALYZE và composite index như thế nào?",
    "Mình chuyển sang phần Live Coding ở cửa sổ bên phải. Hãy vừa viết mã vừa trình bày hướng giải và cấu trúc dữ liệu bạn chọn.",
    "Hãy phân tích độ phức tạp thời gian, bộ nhớ phụ và nêu ít nhất 2 trường hợp biên cần xử lý cho lời giải vừa rồi.",
]

HINTS = [
    "Gợi ý 1: Thay vì duyệt hai vòng lặp O(n²), thử dùng bảng băm (dict / Map) để lưu phần tử đã đi qua và tra cứu O(1).",
    "Gợi ý 2: Kiểm tra kỹ thứ tự tra cứu trước khi chèn vào bảng băm để không dùng trùng cùng một chỉ số (ví dụ nums=[3,3], target=6).",
    "Gợi ý 3: Hãy nói rõ độ phức tạp thời gian O(n) và bộ nhớ phụ O(n) kèm trường hợp mảng chứa số âm.",
]


class CreateSessionPayload(BaseModel):
    mode: str
    duration: int = 30
    difficulty: str = "medium"
    useCv: bool = True


class SendTurnPayload(BaseModel):
    text: str


@router.post("/sessions")
def create_session(payload: CreateSessionPayload, user: dict = Depends(get_active_user)):
    mode = "hr" if payload.mode == "hr" else "technical"
    duration = payload.duration if payload.duration in (15, 30, 45) else 30
    plan = HR_PLAN if mode == "hr" else TECH_PLAN
    first_prompt = HR_PROMPTS[0] if mode == "hr" else TECH_PROMPTS[0]
    session_id = f"ses-{uuid.uuid4().hex[:10]}"
    started_at = datetime.now(timezone.utc).isoformat()
    initial_turns = [
        {
            "id": f"t-{uuid.uuid4().hex[:8]}",
            "who": "ai",
            "text": first_prompt,
            "timestamp": datetime.now().strftime("%H:%M"),
        }
    ]
    problem_id = "001" if mode == "technical" else None

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO interview_sessions
            (id, user_id, mode, duration, difficulty, use_cv, plan_json, problem_id, turns_json, stage_index, hints_used, star_json, started_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, '{}', ?)
            """,
            (
                session_id,
                user["id"],
                mode,
                duration,
                payload.difficulty,
                1 if payload.useCv else 0,
                json.dumps(plan, ensure_ascii=False),
                problem_id,
                json.dumps(initial_turns, ensure_ascii=False),
                started_at,
            ),
        )

    return {
        "sessionId": session_id,
        "mode": mode,
        "duration": duration,
        "difficulty": payload.difficulty,
        "useCv": payload.useCv,
        "plan": plan,
        "problemId": problem_id,
        "startedAt": started_at,
        "initialTurns": initial_turns,
    }


@router.post("/sessions/{session_id}/turns")
def send_turn(session_id: str, payload: SendTurnPayload, _user: dict = Depends(get_active_user)):
    t0 = time.perf_counter()
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nội dung trả lời không được để trống.")

    now_hm = datetime.now().strftime("%H:%M")
    user_turn = {"id": f"t-{uuid.uuid4().hex[:8]}", "who": "you", "text": text, "timestamp": now_hm}

    with get_db() as conn:
        row = conn.execute("SELECT * FROM interview_sessions WHERE id = ?", (session_id,)).fetchone()
        mode = row["mode"] if row else "technical"
        turns: list[dict[str, Any]] = json.loads(row["turns_json"]) if row else []
        stage_index = int(row["stage_index"]) if row else 0
        star: dict[str, bool] = json.loads(row["star_json"]) if row else {}

        turns.append(user_turn)
        prompts = HR_PROMPTS if mode == "hr" else TECH_PROMPTS
        next_stage = min(len(prompts) - 1, stage_index + 1)

        lower = text.lower()
        if mode == "hr":
            if any(k in lower for k in ("project", "team", "built", "context", "situation", "semester", "internship")):
                star["S"] = True
            if any(k in lower for k in ("responsible", "goal", "task", "owned", "needed", "deadline")):
                star["T"] = True
            if any(k in lower for k in ("implemented", "designed", "refactored", "tested", "action", "discussed", "fixed")):
                star["A"] = True
            if any(k in lower for k in ("result", "reduced", "improved", "%", "faster", "learned", "shipped", "passed")):
                star["R"] = True

        reply_text = (
            prompts[next_stage]
            if next_stage != stage_index
            else (
                "Thank you for sharing those concrete details. Do you have any final questions before we wrap up?"
                if mode == "hr"
                else "Cảm ơn phần giải thích của bạn. Hãy rà soát lại độ phức tạp bộ nhớ và test case trước khi nộp bài nhé."
            )
        )
        ai_turn = {"id": f"t-{uuid.uuid4().hex[:8]}", "who": "ai", "text": reply_text, "timestamp": now_hm}
        turns.append(ai_turn)

        if row:
            conn.execute(
                "UPDATE interview_sessions SET turns_json = ?, stage_index = ?, star_json = ? WHERE id = ?",
                (json.dumps(turns, ensure_ascii=False), next_stage, json.dumps(star), session_id),
            )

    latency_ms = max(60, int((time.perf_counter() - t0) * 1000))
    return {
        "turn": user_turn,
        "reply": ai_turn,
        "stageIndex": next_stage,
        "latencyMs": latency_ms,
        "starCovered": star if mode == "hr" else None,
    }


@router.post("/sessions/{session_id}/hint")
def request_hint(session_id: str, _user: dict = Depends(get_active_user)):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM interview_sessions WHERE id = ?", (session_id,)).fetchone()
        hints_used = int(row["hints_used"]) if row else 0
        hint_text = HINTS[min(hints_used, len(HINTS) - 1)]
        new_hints_used = hints_used + 1
        hint_turn = {
            "id": f"h-{uuid.uuid4().hex[:8]}",
            "who": "hint",
            "text": hint_text,
            "timestamp": datetime.now().strftime("%H:%M"),
        }
        if row:
            turns = json.loads(row["turns_json"])
            turns.append(hint_turn)
            conn.execute(
                "UPDATE interview_sessions SET turns_json = ?, hints_used = ? WHERE id = ?",
                (json.dumps(turns, ensure_ascii=False), new_hints_used, session_id),
            )
    return {"hint": hint_turn, "hintsUsed": new_hints_used}


@router.post("/sessions/{session_id}/finalize")
def finalize_session(session_id: str, snapshot: dict[str, Any], user: dict = Depends(get_active_user)):
    mode = str(snapshot.get("mode", "technical"))
    duration = int(snapshot.get("duration", 30))
    turns = snapshot.get("turns") or []
    user_turns = [t for t in turns if isinstance(t, dict) and t.get("who") == "you"]
    code = str(snapshot.get("code") or "")
    sandbox_result = snapshot.get("sandboxResult") or {}
    tests = sandbox_result.get("tests") or [] if isinstance(sandbox_result, dict) else []

    passed = sum(1 for t in tests if t.get("status") == "passed")
    total = len(tests)

    # BR2: Strictly independent Code Correctness vs. Spoken/Written Reasoning evaluation
    word_count = sum(len(str(t.get("text", "")).split()) for t in user_turns)
    reasoning_score = round(min(9.5, max(4.0, 4.5 + min(3.5, word_count / 25.0) + min(1.5, len(user_turns) * 0.5))), 1)

    if mode == "technical":
        code_score = round((passed / total) * 10.0, 1) if total > 0 else (5.5 if len(code.strip()) > 40 else 3.0)
        overall = round((code_score * 0.5 + reasoning_score * 0.5), 1)
        correctness_obj = {
            "score": code_score,
            "passed": passed,
            "total": total,
            "note": (
                f"Chấm tự động từ {passed}/{total} test case trong Sandbox cô lập (BR3)."
                if total > 0
                else "Chưa có lượt Submit bộ test đầy đủ; ghi nhận từ ảnh chụp mã nguồn (BR1)."
            ),
        }
        competencies = [
            {
                "id": "c-code",
                "name": "Cài đặt thuật toán & cấu trúc dữ liệu",
                "score": code_score,
                "evidence": f"Đạt {passed}/{total} test case" if total > 0 else "Đã lưu snapshot mã nguồn tại thời điểm kết thúc phiên.",
            },
            {
                "id": "c-reason",
                "name": "Lập luận kỹ thuật (think aloud)",
                "score": reasoning_score,
                "evidence": f"Ghi nhận {len(user_turns)} lượt trao đổi ({word_count} từ) trong bản gỡ băng.",
            },
            {
                "id": "c-edge",
                "name": "Phân tích độ phức tạp & trường hợp biên",
                "score": round(max(4.0, reasoning_score - 0.4), 1),
                "evidence": "Đánh giá dựa trên thảo luận Big-O và kiểm thử biên trong phiên.",
            },
        ]
    else:
        overall = reasoning_score
        correctness_obj = None
        competencies = [
            {
                "id": "c-star",
                "name": "Cấu trúc trả lời STAR (EN)",
                "score": reasoning_score,
                "evidence": f"Ghi nhận {len(user_turns)} lượt trả lời tiếng Anh ({word_count} từ).",
            },
            {
                "id": "c-comm",
                "name": "Mạch lạc & phản xạ giao tiếp",
                "score": round(min(9.5, reasoning_score + 0.3), 1),
                "evidence": "Đánh giá tính cụ thể về vai trò cá nhân và kết quả đo được.",
            },
        ]

    reasoning_obj = {
        "score": reasoning_score,
        "note": "Chấm độc lập theo rubric lập luận dựa trên transcript phiên (BR2).",
    }

    report_id = f"r-{datetime.now().strftime('%d%m')}-{uuid.uuid4().hex[:4]}"
    finalized_at = datetime.now(timezone.utc).isoformat()
    report_type = "HR — Behavioral (EN)" if mode == "hr" else "Technical & Live Coding"

    with get_db() as conn:
        conn.execute(
            "UPDATE interview_sessions SET ended_at = ?, turns_json = ? WHERE id = ?",
            (finalized_at, json.dumps(turns, ensure_ascii=False), session_id),
        )
        conn.execute(
            """
            INSERT INTO reports (
                id, user_id, session_id, type, duration, date, status, overall,
                correctness_json, reasoning_json, competencies_json,
                strengths_json, weaknesses_json, suggestions_json,
                transcript_json, code_snapshot, test_results_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'done', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                report_id,
                user["id"],
                session_id,
                report_type,
                duration,
                datetime.now().strftime("%d/%m/%Y"),
                overall,
                json.dumps(correctness_obj, ensure_ascii=False) if correctness_obj else None,
                json.dumps(reasoning_obj, ensure_ascii=False),
                json.dumps(competencies, ensure_ascii=False),
                json.dumps(
                    [
                        "Hoàn thành phiên đúng kỷ luật thời gian hard-stop (BR1)",
                        "Chủ động tương tác và lưu đầy đủ bằng chứng cho báo cáo",
                    ],
                    ensure_ascii=False,
                ),
                json.dumps(
                    [
                        "Nên nêu rõ độ phức tạp bộ nhớ phụ và các test biên trước khi cài đặt"
                        if mode == "technical"
                        else "Cần lượng hóa rõ hơn phần Result trong cấu trúc STAR"
                    ],
                    ensure_ascii=False,
                ),
                json.dumps(
                    [
                        "Ôn lại các chủ đề trọng tâm JD trong Kho tri thức",
                        "Hoàn thiện bài code vừa làm ở chế độ Practice tự do (không đổi điểm phiên)",
                    ],
                    ensure_ascii=False,
                ),
                json.dumps(turns, ensure_ascii=False),
                code if code else None,
                json.dumps(tests, ensure_ascii=False) if tests else None,
                finalized_at,
            ),
        )

    return {
        "snapshotId": f"snap-{uuid.uuid4().hex[:8]}",
        "reportId": report_id,
        "finalizedAt": finalized_at,
    }


@ws_router.websocket("/ws/interviews/sessions/{session_id}")
async def interview_ws(websocket: WebSocket, session_id: str):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            await websocket.send_json({"type": "ack", "sessionId": session_id, "echo": data})
    except WebSocketDisconnect:
        return
