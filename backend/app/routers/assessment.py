from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ..database import get_db
from ..security import get_active_user

router = APIRouter(tags=["Dashboard, Reports & Roadmap (UC14–UC16)"])


class ReevaluationPayload(BaseModel):
    competencyId: str
    reason: str


def _serialize_report(row: Any, reeval_map: dict[str, str]) -> dict[str, Any]:
    competencies = json.loads(row["competencies_json"]) if row["competencies_json"] else None
    if isinstance(competencies, list):
        for comp in competencies:
            cid = comp.get("id")
            if cid and cid in reeval_map:
                comp["reevaluationStatus"] = reeval_map[cid]

    return {
        "id": row["id"],
        "type": row["type"],
        "duration": int(row["duration"]),
        "date": row["date"],
        "status": row["status"],
        "overall": float(row["overall"]) if row["overall"] is not None else None,
        "correctness": json.loads(row["correctness_json"]) if row["correctness_json"] else None,
        "reasoning": json.loads(row["reasoning_json"]) if row["reasoning_json"] else None,
        "competencies": competencies,
        "strengths": json.loads(row["strengths_json"]) if row["strengths_json"] else None,
        "weaknesses": json.loads(row["weaknesses_json"]) if row["weaknesses_json"] else None,
        "suggestions": json.loads(row["suggestions_json"]) if row["suggestions_json"] else None,
        "transcript": json.loads(row["transcript_json"]) if row["transcript_json"] else None,
        "codeSnapshot": row["code_snapshot"],
        "testResults": json.loads(row["test_results_json"]) if row["test_results_json"] else None,
    }


def _build_roadmap(conn: Any, user_id: str) -> dict[str, Any]:
    domains = conn.execute("SELECT id, name FROM taxonomy_domains WHERE disabled = 0 ORDER BY sort_order").fetchall()
    solved_ids = {
        r["problem_id"]
        for r in conn.execute(
            "SELECT DISTINCT problem_id FROM submissions WHERE user_id = ? AND mode = 'submit' AND verdict = 'Accepted'",
            (user_id,),
        ).fetchall()
    }
    unsolved_problems = conn.execute("SELECT id, title, topic, difficulty FROM problems ORDER BY id ASC").fetchall()
    topics = conn.execute(
        "SELECT id, name, jd, practiced, avg_score FROM taxonomy_topics WHERE disabled = 0 ORDER BY jd DESC, practiced ASC"
    ).fetchall()

    items: list[dict[str, Any]] = []
    for t in topics[:3]:
        priority = "high" if (t["jd"] and t["practiced"] == 0) else ("medium" if t["avg_score"] < 7.0 else "low")
        items.append(
            {
                "id": f"rm-topic-{t['id']}",
                "type": "voice" if t["practiced"] == 0 else "topic",
                "title": f"Luyện giọng nói: {t['name']}" if t["practiced"] == 0 else f"Ôn tập chủ đề: {t['name']}",
                "priority": priority,
                "difficulty": "medium",
                "reason": (
                    "Chủ đề ưu tiên từ JD, chưa có bằng chứng luyện tập."
                    if t["practiced"] == 0
                    else f"Điểm trung bình hiện tại {t['avg_score']:.1f}/10 qua {t['practiced']} lượt luyện."
                ),
                "to": f"/practice/voice?topic={t['id']}" if t["practiced"] == 0 else "/knowledge",
            }
        )

    for p in unsolved_problems:
        if p["id"] in solved_ids:
            continue
        items.append(
            {
                "id": f"rm-prob-{p['id']}",
                "type": "problem",
                "title": p["title"],
                "priority": "high" if p["difficulty"] == "easy" else "medium",
                "difficulty": p["difficulty"],
                "reason": f"Chưa đạt Accepted trong Sandbox · Chủ đề {p['topic']}.",
                "to": f"/problems/{p['id']}",
            }
        )
        if len(items) >= 6:
            break

    items.append(
        {
            "id": "rm-interview-1",
            "type": "interview",
            "title": "Phỏng vấn mô phỏng Technical & Live Coding (30 phút)",
            "priority": "medium",
            "difficulty": "medium",
            "reason": "Kiểm chứng đồng thời kỹ năng viết mã và lập luận bằng giọng nói (BR2).",
            "to": "/interview/setup",
        }
    )

    hub_names = ["Nền tảng", "Cấu trúc dữ liệu", "Thuật toán", "System Design"]
    solved_count = len(solved_ids)
    hubs = [
        {"name": hub_names[0], "state": "done" if solved_count >= 1 else "current"},
        {"name": hub_names[1], "state": "done" if solved_count >= 2 else ("current" if solved_count == 1 else "todo")},
        {"name": hub_names[2], "state": "current" if solved_count >= 2 else "todo"},
        {"name": hub_names[3], "state": "done" if solved_count >= 5 else "todo"},
    ]
    _ = domains

    return {
        "updatedAt": datetime.now().strftime("%d/%m/%Y"),
        "hubs": hubs,
        "items": items,
    }


@router.get("/dashboard")
def get_dashboard(user: dict = Depends(get_active_user)):
    with get_db() as conn:
        uid = user["id"]
        sub_total = conn.execute("SELECT COUNT(*) FROM submissions WHERE user_id = ? AND mode = 'submit'", (uid,)).fetchone()[0]
        sub_passed = conn.execute(
            "SELECT COUNT(DISTINCT problem_id) FROM submissions WHERE user_id = ? AND mode = 'submit' AND verdict = 'Accepted'",
            (uid,),
        ).fetchone()[0]
        rep_rows = conn.execute("SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 5", (uid,)).fetchall()
        rep_count = conn.execute("SELECT COUNT(*) FROM reports WHERE user_id = ?", (uid,)).fetchone()[0]

        reasoning_scores = []
        for r in rep_rows:
            if r["reasoning_json"]:
                obj = json.loads(r["reasoning_json"])
                if isinstance(obj, dict) and obj.get("score") is not None:
                    reasoning_scores.append(float(obj["score"]))
        avg_reasoning = round(sum(reasoning_scores) / len(reasoning_scores), 1) if reasoning_scores else 0.0

        dom_rows = conn.execute(
            """
            SELECT d.name, COALESCE(AVG(c.mastery), 0) as avg_mastery
            FROM taxonomy_domains d
            LEFT JOIN taxonomy_topics t ON t.domain_id = d.id AND t.disabled = 0
            LEFT JOIN taxonomy_competencies c ON c.topic_id = t.id AND c.disabled = 0
            WHERE d.disabled = 0
            GROUP BY d.id
            ORDER BY d.sort_order
            """
        ).fetchall()

        competencies = [
            {"name": r["name"], "mastery": round(float(r["avg_mastery"] or 0), 2)}
            for r in dom_rows
        ]
        roadmap = _build_roadmap(conn, uid)

        recent_reports = []
        for r in rep_rows:
            reevals = {
                rv["competency_id"]: rv["status"]
                for rv in conn.execute("SELECT competency_id, status FROM reevaluations WHERE report_id = ?", (r["id"],)).fetchall()
            }
            recent_reports.append(_serialize_report(r, reevals))

    return {
        "stats": [
            {"label": "Phiên đã luyện", "value": str(rep_count), "delta": "Ghi nhận từ CSDL", "deltaTone": "ink2"},
            {"label": "Bài code đã nộp", "value": str(sub_total), "delta": f"{sub_passed} bài Accepted", "deltaTone": "success"},
            {
                "label": "Điểm lập luận TB",
                "value": f"{avg_reasoning:.1f}" if avg_reasoning > 0 else "—",
                "delta": "Thang điểm / 10 (BR2)",
                "deltaTone": "ink2",
            },
            {"label": "Chuỗi ngày luyện", "value": f"{int(user.get('streak_days') or 1)} ngày", "delta": "Đang hoạt động", "deltaTone": "success"},
        ],
        "competencies": competencies,
        "roadmapHighlights": roadmap["items"][:3],
        "recentReports": recent_reports,
    }


@router.get("/reports")
def list_reports(user: dict = Depends(get_active_user)):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC", (user["id"],)).fetchall()
        out = []
        for r in rows:
            reevals = {
                rv["competency_id"]: rv["status"]
                for rv in conn.execute("SELECT competency_id, status FROM reevaluations WHERE report_id = ?", (r["id"],)).fetchall()
            }
            out.append(_serialize_report(r, reevals))
        return out


@router.get("/reports/{report_id}")
def get_report(report_id: str, user: dict = Depends(get_active_user)):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM reports WHERE id = ? AND user_id = ?", (report_id, user["id"])).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy báo cáo đánh giá.")
        reevals = {
            rv["competency_id"]: rv["status"]
            for rv in conn.execute("SELECT competency_id, status FROM reevaluations WHERE report_id = ?", (row["id"],)).fetchall()
        }
        return _serialize_report(row, reevals)


@router.post("/reports/{report_id}/reevaluations", status_code=status.HTTP_201_CREATED)
def request_reevaluation(report_id: str, payload: ReevaluationPayload, user: dict = Depends(get_active_user)):
    reason = payload.reason.strip()
    if not reason:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Vui lòng nhập lý do yêu cầu đánh giá lại (UC16 · E1).")

    with get_db() as conn:
        row = conn.execute("SELECT id FROM reports WHERE id = ? AND user_id = ?", (report_id, user["id"])).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy báo cáo.")
        existing = conn.execute(
            "SELECT id FROM reevaluations WHERE report_id = ? AND competency_id = ?",
            (report_id, payload.competencyId),
        ).fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Mục năng lực này đã có yêu cầu đánh giá lại đang xử lý (UC16 · E2).",
            )
        req_id = f"rev-{uuid.uuid4().hex[:8]}"
        submitted_at = datetime.now(timezone.utc).isoformat()
        conn.execute(
            """
            INSERT INTO reevaluations (id, report_id, user_id, competency_id, reason, status, submitted_at)
            VALUES (?, ?, ?, ?, ?, 'pending', ?)
            """,
            (req_id, report_id, user["id"], payload.competencyId, reason, submitted_at),
        )

    return {
        "requestId": req_id,
        "competencyId": payload.competencyId,
        "status": "pending",
        "submittedAt": submitted_at,
    }


@router.get("/roadmap")
def get_roadmap(user: dict = Depends(get_active_user)):
    with get_db() as conn:
        return _build_roadmap(conn, user["id"])
