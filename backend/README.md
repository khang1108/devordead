# DevOrDead — Backend

> Nhánh làm việc riêng của đội **Backend** (`backend` → PR → `main`).
> Quy ước repo: trên nhánh `backend` chỉ chỉnh sửa các file nằm bên trong thư mục `backend/` để tránh xung đột với nhánh `frontend` khi merge lên `main`.

## Kiến trúc 6 phân hệ (`NFR06`)

Đối xứng 1–1 với `frontend/src/features/*` và tài liệu phân tích yêu cầu (`UC01–UC18`, `BR1–BR4`, `NFR01–NFR10`):

1. **Identity & Profile (`UC01–UC03`)**
   - `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `POST /api/v1/auth/oauth/:provider`, `GET /api/v1/auth/me`
   - `GET/PUT /api/v1/profile/target`, `POST /api/v1/profile/cv-jd/analyze` (`NFR04`: mã hóa lưu trữ)
2. **Knowledge & Voice Practice (`UC04–UC06`)**
   - `GET /api/v1/knowledge/tree` (`BR4`: chỉ trả về nội dung đã duyệt)
   - `GET /api/v1/knowledge/topics/:topicId/voice-session`, `POST /api/v1/knowledge/voice/evaluate` (`NFR01`: ≤ 2.5s)
3. **Coding Practice & Zero-Trust Sandbox (`UC07–UC09`, `BR3`, `NFR02`)**
   - `GET /api/v1/problems`, `GET /api/v1/problems/:id`
   - `POST /api/v1/problems/:id/run`, `POST /api/v1/problems/:id/submit` (Docker cgroups v2: `1 vCPU`, `256 MB RAM`, `50 MB /tmp`, `network=none`, `ro-rootfs`, `timeout 3–5s`)
4. **AI Mock Interview Orchestrator (`UC10–UC13`, `BR1`, `BR2`)**
   - `POST /api/v1/interviews/sessions`, `POST /api/v1/interviews/sessions/:id/turns`, `POST /api/v1/interviews/sessions/:id/hint`, `POST /api/v1/interviews/sessions/:id/finalize` (`BR1` hard-stop snapshot)
   - `WS /ws/interviews/:sessionId` (stream audio & đồng bộ Live Coding)
5. **Assessment & Adaptive Roadmap (`UC14–UC16`, `BR2`)**
   - `GET /api/v1/dashboard`
   - `GET /api/v1/reports`, `GET /api/v1/reports/:id`, `POST /api/v1/reports/:id/reevaluations` (`UC16`)
   - `GET /api/v1/roadmap`
6. **Admin & Content Curation (`UC17–UC18`, `BR4`)**
   - `GET/POST/PATCH/DELETE /api/v1/admin/taxonomy/*`, `GET /api/v1/admin/taxonomy/logs`
   - `GET /api/v1/admin/moderation/queue`, `POST /api/v1/admin/moderation/:id/{approve,reject,regenerate}`

## Hợp đồng kiểu dữ liệu (DTO)

Mọi cấu trúc JSON request/response được định nghĩa bằng TypeScript trong `frontend/src/shared/types/*` trên nhánh `frontend` (sau khi merge lên `main`).
