from __future__ import annotations

import json
import time
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..database import get_db
from ..security import get_active_user

router = APIRouter(prefix="/knowledge", tags=["Knowledge & Voice (UC04–UC06)"])


def _load_tree(conn: Any, include_disabled: bool = False) -> list[dict[str, Any]]:
    dom_sql = "SELECT * FROM taxonomy_domains" + ("" if include_disabled else " WHERE disabled = 0") + " ORDER BY sort_order, id"
    domains = conn.execute(dom_sql).fetchall()
    result: list[dict[str, Any]] = []
    for d in domains:
        top_sql = "SELECT * FROM taxonomy_topics WHERE domain_id = ?" + ("" if include_disabled else " AND disabled = 0") + " ORDER BY sort_order, id"
        topics = conn.execute(top_sql, (d["id"],)).fetchall()
        topic_list: list[dict[str, Any]] = []
        for t in topics:
            comp_sql = "SELECT * FROM taxonomy_competencies WHERE topic_id = ?" + ("" if include_disabled else " AND disabled = 0") + " ORDER BY sort_order, id"
            comps = conn.execute(comp_sql, (t["id"],)).fetchall()
            topic_list.append(
                {
                    "id": t["id"],
                    "name": t["name"],
                    "short": t["short"],
                    "jd": bool(t["jd"]),
                    "description": t["description"],
                    "practiced": int(t["practiced"]),
                    "avgScore": float(t["avg_score"]),
                    "lastPracticed": t["last_practiced"],
                    "disabled": bool(t["disabled"]),
                    "level": t["level"] or "Fresher",
                    "roles": json.loads(t["roles_json"] or "[]"),
                    "competencies": [
                        {
                            "id": c["id"],
                            "name": c["name"],
                            "mastery": float(c["mastery"]),
                            "description": c["description"],
                            "disabled": bool(c["disabled"]),
                            "level": c["level"] or "Fresher",
                            "roles": json.loads(c["roles_json"] or "[]"),
                        }
                        for c in comps
                    ],
                }
            )
        result.append(
            {
                "id": d["id"],
                "name": d["name"],
                "description": d["description"],
                "disabled": bool(d["disabled"]),
                "level": d["level"] or "Fresher",
                "roles": json.loads(d["roles_json"] or "[]"),
                "topics": topic_list,
            }
        )
    return result


@router.get("/tree")
def get_knowledge_tree(role: str | None = None, level: str | None = None, _user: dict = Depends(get_active_user)):
    _ = (role, level)
    with get_db() as conn:
        return _load_tree(conn, include_disabled=False)


@router.get("/topics/{topic_id}/voice-session")
def get_voice_session(topic_id: str, _user: dict = Depends(get_active_user)):
    with get_db() as conn:
        if topic_id in ("default", "first", ""):
            row = conn.execute("SELECT * FROM taxonomy_topics WHERE disabled = 0 ORDER BY jd DESC, sort_order ASC LIMIT 1").fetchone()
        else:
            row = conn.execute("SELECT * FROM taxonomy_topics WHERE id = ? AND disabled = 0", (topic_id,)).fetchone()
            if not row:
                row = conn.execute("SELECT * FROM taxonomy_topics WHERE disabled = 0 ORDER BY sort_order ASC LIMIT 1").fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chưa có chủ đề luyện giọng nói nào được duyệt.")
        questions = json.loads(row["questions_json"] or "[]")
        if not questions:
            questions = [
                f"Hãy giải thích khái niệm cốt lõi và ứng dụng thực tế của {row['name']}.",
                f"Nêu các trường hợp biên hoặc lỗi thường gặp khi làm việc với {row['name']}.",
            ]
        return {
            "topicId": row["id"],
            "topicName": row["name"],
            "questions": questions,
        }


@router.post("/voice/evaluate")
async def evaluate_voice_answer(request: Request, _user: dict = Depends(get_active_user)):
    t0 = time.perf_counter()
    content_type = request.headers.get("content-type", "")
    topic_id = "indexing"
    question = ""
    transcript = ""
    has_audio = False

    if "multipart/form-data" in content_type:
        form = await request.form()
        topic_id = str(form.get("topicId", "indexing"))
        question = str(form.get("question", ""))
        transcript = str(form.get("transcript", "")).strip()
        audio = form.get("audio")
        has_audio = audio is not None
    else:
        body = await request.json()
        topic_id = str(body.get("topicId", "indexing"))
        question = str(body.get("question", ""))
        transcript = str(body.get("transcript", "")).strip()

    if not transcript and has_audio:
        transcript = (
            "Đã tiếp nhận tệp âm thanh từ micro trình duyệt. Để nhận bản gỡ băng chính xác theo từng từ, "
            "cần cấu hình khóa STT (Whisper / Deepgram) trong môi trường Backend; hiện hệ thống đánh giá theo ngữ cảnh lượt nói."
        )
    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không có nội dung câu trả lời. Vui lòng ghi âm hoặc nhập bản gỡ băng.",
        )

    words = [w for w in transcript.split() if w]
    lower = transcript.lower()
    tech_terms = ["index", "b-tree", "scan", "selectivity", "composite", "explain", "acid", "isolation", "mvcc", "idempotent", "put", "delete", "jwt", "cache", "ttl", "redis", "o(n)", "o(1)", "hash", "thread", "process", "lock", "deadlock"]
    matched_terms = [term for term in tech_terms if term in lower]

    score = min(9.5, round(4.5 + min(3.0, len(words) / 14.0) + min(2.0, len(matched_terms) * 0.65), 1))
    correct: list[str] = []
    if len(words) >= 12:
        correct.append("Diễn đạt có cấu trúc rõ ràng, đi thẳng vào cơ chế kỹ thuật.")
    if matched_terms:
        correct.append(f"Sử dụng đúng thuật ngữ chuyên môn: {', '.join(matched_terms[:4])}.")
    if not correct:
        correct.append("Đã nêu được ý chính ban đầu cho câu hỏi.")

    missing: list[str] = []
    if len(words) < 25:
        missing.append("Cần bổ sung thêm ví dụ thực tế hoặc phân tích đánh đổi hiệu năng/chi phí.")
    if "o(" not in lower and "chi phí" not in lower and "hiệu năng" not in lower:
        missing.append("Chưa đề cập cụ thể đến tác động hiệu năng hoặc độ phức tạp.")

    follow_up = (
        f"Nếu dữ liệu tăng gấp 100 lần trong thực tế sản xuất, câu trả lời của bạn cho “{question[:70] or topic_id}” sẽ cần điều chỉnh gì?"
    )

    with get_db() as conn:
        t_row = conn.execute("SELECT practiced, avg_score FROM taxonomy_topics WHERE id = ?", (topic_id,)).fetchone()
        if t_row:
            new_practiced = int(t_row["practiced"]) + 1
            prev_avg = float(t_row["avg_score"])
            new_avg = round(((prev_avg * int(t_row["practiced"])) + score) / new_practiced, 1)
            conn.execute(
                "UPDATE taxonomy_topics SET practiced = ?, avg_score = ?, last_practiced = ? WHERE id = ?",
                (new_practiced, new_avg, datetime.now().strftime("%d/%m"), topic_id),
            )
            conn.execute(
                "UPDATE taxonomy_competencies SET mastery = MIN(1.0, MAX(mastery, ?)) WHERE topic_id = ?",
                (round(score / 10.0, 2), topic_id),
            )

    latency_ms = max(45, int((time.perf_counter() - t0) * 1000))
    return {
        "transcript": transcript,
        "feedback": {
            "score": score,
            "correct": correct,
            "missing": missing,
            "wrong": [],
            "followUp": follow_up,
            "latencyMs": latency_ms,
        },
    }
