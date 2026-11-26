from __future__ import annotations

import json
import re
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ..database import get_db
from ..security import get_active_user
from .knowledge import _load_tree

router = APIRouter(prefix="/admin", tags=["Admin Taxonomy & Moderation (UC17, UC18, BR4)"])


class TaxonomyNodePayload(BaseModel):
    kind: str
    parentId: str | None = None
    name: str
    description: str | None = ""
    level: str | None = ""
    roles: list[str] | None = None
    disabled: bool | None = None


class TaxonomyUpdatePayload(BaseModel):
    kind: str | None = None
    name: str | None = None
    description: str | None = None
    level: str | None = None
    roles: list[str] | None = None
    disabled: bool | None = None


class ReorderPayload(BaseModel):
    parentId: str | None = None
    orderedIds: list[str]


class ModerationDecisionPayload(BaseModel):
    title: str
    content: str | None = ""
    reference: str
    criteria: list[str]
    topic: str
    competency: str
    difficulty: str


class RejectPayload(BaseModel):
    reason: str


def _append_log(conn: Any, who: str, what: str) -> None:
    conn.execute(
        "INSERT INTO taxonomy_logs (id, at, who, what) VALUES (?, ?, ?, ?)",
        (f"log-{uuid.uuid4().hex[:8]}", datetime.now().strftime("%d/%m %H:%M"), who, what),
    )


@router.get("/taxonomy")
def get_admin_taxonomy(_user: dict = Depends(get_active_user)):
    with get_db() as conn:
        return _load_tree(conn, include_disabled=True)


@router.get("/taxonomy/logs")
def get_taxonomy_logs(_user: dict = Depends(get_active_user)):
    with get_db() as conn:
        rows = conn.execute("SELECT id, at, who, what FROM taxonomy_logs ORDER BY rowid DESC LIMIT 50").fetchall()
        return [dict(r) for r in rows]


@router.post("/taxonomy/nodes", status_code=status.HTTP_201_CREATED)
def create_taxonomy_node(payload: TaxonomyNodePayload, user: dict = Depends(get_active_user)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Tên nút danh mục không được để trống.")

    node_id = f"{payload.kind[:3]}-{uuid.uuid4().hex[:8]}"
    roles_json = json.dumps(payload.roles or [], ensure_ascii=False)
    actor = user.get("name") or "Quản trị viên"

    with get_db() as conn:
        if payload.kind == "domain":
            dup = conn.execute("SELECT id FROM taxonomy_domains WHERE LOWER(name) = LOWER(?)", (name,)).fetchone()
            if dup:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tên domain đã tồn tại trong cùng cấp (UC17 · E2).")
            order = conn.execute("SELECT COUNT(*) FROM taxonomy_domains").fetchone()[0]
            conn.execute(
                "INSERT INTO taxonomy_domains (id, name, description, level, roles_json, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
                (node_id, name, payload.description or "", payload.level or "Fresher", roles_json, order),
            )
            _append_log(conn, actor, f"Thêm domain “{name}”")
        elif payload.kind == "topic":
            if not payload.parentId:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Thiếu domain cha (parentId).")
            dup = conn.execute(
                "SELECT id FROM taxonomy_topics WHERE domain_id = ? AND LOWER(name) = LOWER(?)",
                (payload.parentId, name),
            ).fetchone()
            if dup:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tên topic đã tồn tại trong cùng domain (UC17 · E2).")
            order = conn.execute("SELECT COUNT(*) FROM taxonomy_topics WHERE domain_id = ?", (payload.parentId,)).fetchone()[0]
            conn.execute(
                """
                INSERT INTO taxonomy_topics
                (id, domain_id, name, short, jd, description, level, roles_json, sort_order)
                VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)
                """,
                (node_id, payload.parentId, name, name[:24], payload.description or "", payload.level or "Fresher", roles_json, order),
            )
            _append_log(conn, actor, f"Thêm topic “{name}”")
        elif payload.kind == "competency":
            if not payload.parentId:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Thiếu topic cha (parentId).")
            dup = conn.execute(
                "SELECT id FROM taxonomy_competencies WHERE topic_id = ? AND LOWER(name) = LOWER(?)",
                (payload.parentId, name),
            ).fetchone()
            if dup:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tên competency đã tồn tại trong cùng topic (UC17 · E2).")
            order = conn.execute("SELECT COUNT(*) FROM taxonomy_competencies WHERE topic_id = ?", (payload.parentId,)).fetchone()[0]
            conn.execute(
                """
                INSERT INTO taxonomy_competencies
                (id, topic_id, name, mastery, description, level, roles_json, sort_order)
                VALUES (?, ?, ?, 0, ?, ?, ?, ?)
                """,
                (node_id, payload.parentId, name, payload.description or "", payload.level or "Fresher", roles_json, order),
            )
            _append_log(conn, actor, f"Thêm năng lực “{name}”")
        elif payload.kind in ("family", "role"):
            _append_log(conn, actor, f"Thêm {payload.kind} “{name}”")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Loại nút taxonomy không hợp lệ.")

    return {"id": node_id}


@router.patch("/taxonomy/nodes/{node_id}")
def update_taxonomy_node(node_id: str, payload: TaxonomyUpdatePayload, user: dict = Depends(get_active_user)):
    actor = user.get("name") or "Quản trị viên"
    with get_db() as conn:
        for table in ("taxonomy_domains", "taxonomy_topics", "taxonomy_competencies"):
            row = conn.execute(f"SELECT * FROM {table} WHERE id = ?", (node_id,)).fetchone()
            if not row:
                continue
            new_name = (payload.name if payload.name is not None else row["name"]).strip()
            new_desc = payload.description if payload.description is not None else row["description"]
            new_level = payload.level if payload.level is not None else row["level"]
            new_roles = json.dumps(payload.roles, ensure_ascii=False) if payload.roles is not None else row["roles_json"]
            new_disabled = int(payload.disabled) if payload.disabled is not None else int(row["disabled"])
            conn.execute(
                f"UPDATE {table} SET name = ?, description = ?, level = ?, roles_json = ?, disabled = ? WHERE id = ?",
                (new_name, new_desc, new_level, new_roles, new_disabled, node_id),
            )
            action = "Vô hiệu hóa" if payload.disabled is True else ("Kích hoạt lại" if payload.disabled is False else "Cập nhật")
            _append_log(conn, actor, f"{action} “{new_name}”")
            return {"id": node_id}

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nút danh mục.")


@router.delete("/taxonomy/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_taxonomy_node(node_id: str, user: dict = Depends(get_active_user)):
    actor = user.get("name") or "Quản trị viên"
    with get_db() as conn:
        t_row = conn.execute("SELECT name, practiced FROM taxonomy_topics WHERE id = ?", (node_id,)).fetchone()
        if t_row:
            if int(t_row["practiced"]) > 0:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Nút đang được tham chiếu bởi lịch sử luyện tập — hãy vô hiệu hóa thay vì xóa (UC17 · E1).",
                )
            conn.execute("DELETE FROM taxonomy_topics WHERE id = ?", (node_id,))
            _append_log(conn, actor, f"Xóa topic “{t_row['name']}”")
            return

        for table in ("taxonomy_domains", "taxonomy_competencies"):
            row = conn.execute(f"SELECT name FROM {table} WHERE id = ?", (node_id,)).fetchone()
            if row:
                conn.execute(f"DELETE FROM {table} WHERE id = ?", (node_id,))
                _append_log(conn, actor, f"Xóa nút “{row['name']}”")
                return

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nút để xóa.")


@router.patch("/taxonomy/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_taxonomy_nodes(payload: ReorderPayload, _user: dict = Depends(get_active_user)):
    with get_db() as conn:
        for idx, nid in enumerate(payload.orderedIds):
            for table in ("taxonomy_domains", "taxonomy_topics", "taxonomy_competencies"):
                conn.execute(f"UPDATE {table} SET sort_order = ? WHERE id = ?", (idx, nid))


@router.get("/moderation/queue")
def get_moderation_queue(_user: dict = Depends(get_active_user)):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM moderation_queue ORDER BY rowid ASC").fetchall()
        return [
            {
                "id": r["id"],
                "kind": r["kind"],
                "title": r["title"],
                "source": r["source"],
                "topic": r["topic"],
                "competency": r["competency"],
                "difficulty": r["difficulty"],
                "createdAt": r["created_at"],
                "reference": r["reference"],
                "criteria": json.loads(r["criteria_json"] or "[]"),
                "revision": int(r["revision"]),
            }
            for r in rows
        ]


@router.get("/moderation/history")
def get_moderation_history(_user: dict = Depends(get_active_user)):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM moderation_history ORDER BY rowid DESC LIMIT 50").fetchall()
        return [
            {
                "id": r["id"],
                "kind": r["kind"],
                "title": r["title"],
                "decision": r["decision"],
                "reason": r["reason"],
                "processedAt": r["processed_at"],
            }
            for r in rows
        ]


@router.post("/moderation/{item_id}/approve")
def approve_moderation_item(item_id: str, payload: ModerationDecisionPayload, _user: dict = Depends(get_active_user)):
    missing = [f for f, v in (("Tiêu đề", payload.title), ("Đáp án tham chiếu", payload.reference), ("Topic", payload.topic), ("Competency", payload.competency)) if not v.strip()]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Thiếu thông tin bắt buộc trước khi phê duyệt (UC18 · E1): {', '.join(missing)}.",
        )

    processed_at = datetime.now().strftime("%d/%m %H:%M")
    with get_db() as conn:
        row = conn.execute("SELECT * FROM moderation_queue WHERE id = ?", (item_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mục này không còn trong hàng chờ (UC18 · E2).")
        kind = row["kind"]

        # BR4: Approved coding problem actually enters the official problems bank!
        if kind == "problem":
            next_num = conn.execute("SELECT COUNT(*) FROM problems").fetchone()[0] + 1
            pid = f"{next_num:03d}"
            slug = re.sub(r"[^a-z0-9]+", "-", payload.title.lower()).strip("-") or f"problem-{pid}"
            conn.execute(
                """
                INSERT OR IGNORE INTO problems
                (id, slug, title, topic, difficulty, role, description, constraints_json, examples_json, tests_count, approved_at, starter_json)
                VALUES (?, ?, ?, ?, ?, 'Backend', ?, '["Được kiểm duyệt theo BR4"]', '[]', 5, ?, '{}')
                """,
                (pid, f"{slug}-{pid}", payload.title.strip(), payload.topic.strip(), payload.difficulty, payload.reference.strip(), datetime.now().strftime("%d/%m/%Y")),
            )

        conn.execute("DELETE FROM moderation_queue WHERE id = ?", (item_id,))
        conn.execute(
            "INSERT INTO moderation_history (id, kind, title, decision, reason, processed_at) VALUES (?, ?, ?, 'approved', ?, ?)",
            (item_id, kind, payload.title.strip(), f"Gán {payload.topic} · {payload.competency} (BR4)", processed_at),
        )

    return {
        "id": item_id,
        "kind": kind,
        "title": payload.title.strip(),
        "decision": "approved",
        "reason": f"Gán {payload.topic} · {payload.competency} (BR4)",
        "processedAt": processed_at,
    }


@router.post("/moderation/{item_id}/reject")
def reject_moderation_item(item_id: str, payload: RejectPayload, _user: dict = Depends(get_active_user)):
    reason = payload.reason.strip()
    if not reason:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Vui lòng nhập lý do từ chối (UC18 · A2).")

    processed_at = datetime.now().strftime("%d/%m %H:%M")
    with get_db() as conn:
        row = conn.execute("SELECT * FROM moderation_queue WHERE id = ?", (item_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mục này không còn trong hàng chờ.")
        conn.execute("DELETE FROM moderation_queue WHERE id = ?", (item_id,))
        conn.execute(
            "INSERT INTO moderation_history (id, kind, title, decision, reason, processed_at) VALUES (?, ?, ?, 'rejected', ?, ?)",
            (item_id, row["kind"], row["title"], reason, processed_at),
        )

    return {
        "id": item_id,
        "kind": row["kind"],
        "title": row["title"],
        "decision": "rejected",
        "reason": reason,
        "processedAt": processed_at,
    }


@router.post("/moderation/{item_id}/regenerate")
def regenerate_moderation_item(item_id: str, _user: dict = Depends(get_active_user)):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM moderation_queue WHERE id = ?", (item_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy mục trong hàng chờ.")
        next_rev = int(row["revision"]) + 1
        updated_ref = f"{row['reference']} [Bản tinh chỉnh #{next_rev}: bổ sung ví dụ thực tế và trường hợp biên.]"
        conn.execute(
            "UPDATE moderation_queue SET reference = ?, revision = ? WHERE id = ?",
            (updated_ref, next_rev, item_id),
        )
        return {
            "id": row["id"],
            "kind": row["kind"],
            "title": row["title"],
            "source": f"{row['source']} · bản #{next_rev}",
            "topic": row["topic"],
            "competency": row["competency"],
            "difficulty": row["difficulty"],
            "createdAt": row["created_at"],
            "reference": updated_ref,
            "criteria": json.loads(row["criteria_json"] or "[]"),
            "revision": next_rev,
        }
