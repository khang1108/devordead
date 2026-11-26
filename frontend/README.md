# DevOrDead — Frontend (TypeScript + Vite + Three.js + React 19)

> Nhánh làm việc riêng của đội **Frontend** (`frontend` → PR → `main`).
> Quy ước repo: trên nhánh `frontend` chỉ chỉnh sửa các file nằm bên trong thư mục `frontend/` để không xung đột với nhánh `backend` khi merge lên `main`.

Một dự án Vite MPA gồm 2 trang chạy chung bộ TypeScript `strict: true`:

| Trang | URL khi chạy dev | Nội dung |
|---|---|---|
| Landing page 3D | `http://localhost:5173/` | Scrollytelling 3D (Three.js + GSAP ScrollTrigger + Lenis): CV gấp thành máy bay giấy → bản đồ bay lộ trình → tấm Sandbox → quả cầu AI → Offer Letter |
| Web app SPA | `http://localhost:5173/app/` | 15 màn hình nghiệp vụ (`UC01–UC18`, `BR1–BR4`, `NFR01–NFR10`), React 19 + React Router 7 (Hash Router) + Monaco Editor + Web Audio API + Three.js 3D |

## Chạy cục bộ

```bash
cd frontend
cp .env.example .env      # cấu hình VITE_API_BASE_URL và VITE_WS_BASE_URL
npm install
npm run dev               # http://localhost:5173  (app: /app/)
npm run typecheck         # tsc --noEmit (strict)
npm run build             # tsc --noEmit && vite build → frontend/dist
```

Yêu cầu Node.js 20+.

## Kiến trúc mã nguồn (Feature-Based theo `NFR06`)

```text
frontend/
├── index.html                  # Entry 1: Landing Page 3D (/src/landing/main.ts)
├── app/index.html              # Entry 2: Web App SPA (/src/app/main.tsx)
├── tsconfig.json               # strict, noUncheckedIndexedAccess, path aliases
├── vite.config.ts              # MPA build + alias (@landing, @app, @shared, @features)
├── .env.example                # VITE_API_BASE_URL, VITE_WS_BASE_URL
└── src/
    ├── landing/                # Landing Page 3D (tách độc lập với React)
    │   ├── main.ts, types.ts
    │   ├── story/              # director.ts, timeline.ts
    │   ├── three/              # world.ts, orb.ts, paperPlane.ts, flightMap.ts...
    │   ├── scenes/             # 8 cảnh DOM (pure-t)
    │   ├── fx/                 # text.ts, cursor.ts
    │   └── styles/             # base.css, scenes.css
    ├── app/                    # Khởi tạo SPA, router & layout
    │   ├── main.tsx, router.tsx
    │   └── layouts/AppShell.tsx
    ├── shared/                 # Tầng dùng chung toàn ứng dụng
    │   ├── styles/             # tokens.css, app.css
    │   ├── ui/index.tsx        # Primitives + Skeleton, EmptyState, ErrorBanner
    │   ├── components/         # Logo, CodeEditor (Monaco), Waveform (Web Audio FFT)
    │   ├── constants/          # Hằng số tĩnh (roles, levels, languages, BR3 limits)
    │   ├── types/              # Domain Models chuẩn cho UC01–UC18, BR1–BR4
    │   └── services/           # apiClient.ts (HTTP/WS + JWT), localStore.ts, audioEngine.ts
    └── features/               # 7 phân hệ nghiệp vụ tách độc lập (gọi REST/WS thật)
        ├── auth/               # UC01: LoginScreen, ThreeHeroScene, auth.service.ts
        ├── profile/            # UC02–03: ProfileScreen, profile.service.ts
        ├── knowledge/          # UC04–06: KnowledgeScreen, VoicePracticeScreen, knowledge.service.ts
        ├── coding/             # UC07–09: ProblemsScreen, ProblemEditorScreen, coding.service.ts
        ├── interview/          # UC10–13: Room (3D AI Orb), Setup, HR, Tech, Ended, interview.service.ts
        ├── assessment/         # UC02, UC14–16: Dashboard, Report (BR2/UC16), Roadmap, assessment.service.ts
        └── admin/              # UC17–18: AdminTaxonomy, AdminModeration, admin.service.ts
```

## Tiện ích Landing Page

- `?p=0.58&freeze` — nhảy thẳng và giữ tại tiến độ cuộn `p ∈ [0, 1]`.
- `?palette=sky|mono|blueprint|terminal|coral|forest` — chuyển bảng màu (mặc định: `sky`).
