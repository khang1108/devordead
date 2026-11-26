# DevOrDead — Backend (FastAPI + SQLite + JWT + Sandbox Runner)

> Nhánh làm việc riêng của đội **Backend** (`backend` → PR → `main`).
> Quy ước repo: trên nhánh `backend` chỉ chỉnh sửa các file nằm bên trong thư mục `backend/` để tránh xung đột với nhánh `frontend` khi merge lên `main`.

## Chạy cục bộ

```bash
cd backend
cp .env.example .env
uv venv .venv
uv pip install --python .venv/bin/python fastapi "uvicorn[standard]" python-multipart
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- Health check: `http://127.0.0.1:8000/health`
- OpenAPI / Swagger UI: `http://127.0.0.1:8000/docs`
- REST base URL: `http://127.0.0.1:8000/api/v1` (Frontend Vite dev proxy tự chuyển `/api/*` và `/ws/*` về cổng `8000`).

## Kiến trúc 6 phân hệ (`NFR06`)

```text
backend/
├── pyproject.toml
├── .env.example
└── app/
    ├── main.py                 # FastAPI app, CORS, lifespan SQLite init, /api/v1 + /ws
    ├── config.py               # Cấu hình biến môi trường (JWT, DB, CORS)
    ├── database.py             # Lược đồ SQLite & dữ liệu danh mục chuẩn đã phê duyệt (BR4)
    ├── security.py             # PBKDF2-SHA256 password hashing + HMAC-SHA256 JWT
    ├── sandbox.py              # Trình thực thi mã cô lập (timeout 3s, Python 3 & Node.js)
    └── routers/
        ├── auth.py             # UC01: /auth/{register,login,oauth,forgot-password,me}
        ├── profile.py          # UC02–03: /profile/{target,cv-jd/analyze,skills}
        ├── knowledge.py        # UC04–06: /knowledge/{tree,topics/:id/voice-session,voice/evaluate}
        ├── coding.py           # UC07–09: /problems, /problems/:id/{run,submit}
        ├── interview.py        # UC10–13: /interviews/sessions/* + WS /ws/interviews/sessions/:id
        ├── assessment.py       # UC14–16: /dashboard, /reports, /reports/:id/reevaluations, /roadmap
        └── admin.py            # UC17–18: /admin/taxonomy/*, /admin/moderation/*
```
