# DevOrDead — Web (landing page + giao diện app)

Một project Vite gồm hai trang:

| Trang | URL khi chạy dev | Nội dung |
|---|---|---|
| Landing page | `http://localhost:5173/` | Scrollytelling 3D (three.js r186 + GSAP ScrollTrigger + Lenis): CV gấp thành máy bay giấy → đường băng & bản đồ bay → luyện code → phỏng vấn AI → nhận offer |
| Web app (SPA) | `http://localhost:5173/app/` | 15 màn hình chức năng theo proposal (UC01–UC18), React 19 + React Router 7 (hash router) + Monaco Editor |

> **Phạm vi hiện tại: chỉ giao diện.** Mọi dữ liệu là minh họa (`app/src/data/mock.js`); chưa gọi backend, micro, loa hay dịch vụ AI. Các nút "chạy / gửi / phân tích" chỉ chuyển trạng thái hiển thị.

## Chạy

```bash
cd web
npm install
npm run dev      # http://localhost:5173  (app: /app/)
npm run build    # xuất ra web/dist
```

Yêu cầu Node.js 20+.

## Cấu trúc

```
web/
  index.html, src/          landing page (vanilla JS + three.js)
    src/three/              thế giới 3D (máy bay giấy, đường băng/bản đồ bay, quả cầu AI…)
    src/scenes/             lớp chữ DOM của 8 cảnh
    src/styles/base.css     token màu + các bảng màu (data-palette)
  app/                      web app (React)
    src/main.jsx            router — danh sách route ↔ use case
    src/components/         ui.jsx (Button, Badge, Card…), AppShell, Room, CodeEditor, Waveform, Logo
    src/screens/            mỗi màn hình một file + CSS riêng
    src/styles/tokens.css   bảng màu Sky (đồng bộ với Figma "DevOrDead — App Screens")
    src/data/mock.js        dữ liệu minh họa dùng chung
  public/                   favicon, logo SVG
  docs/                     landing-spec.md, app-spec.md (đặc tả giao diện từng màn)
```

## Màn hình web app

| # | Route | Use case |
|---|---|---|
| 01 | `/login` | UC01 Đăng ký & đăng nhập |
| 02 | `/profile` | UC02, UC03 Hồ sơ mục tiêu & CV/JD |
| 03 | `/dashboard` | UC02, UC15 Tổng quan |
| 04 | `/knowledge` | UC04 Kho tri thức |
| 05 | `/practice/voice` | UC05, UC06 Luyện giọng nói & phản hồi |
| 06 | `/problems` | UC07 Ngân hàng bài tập |
| 07 | `/problems/:id` | UC08, UC09 Trình soạn thảo & Sandbox |
| 08 | `/interview/setup` | UC10 Cấu hình phiên |
| 09 | `/interview/hr` | UC11 Phỏng vấn HR (tiếng Anh) |
| 10 | `/interview/technical` | UC12 Technical & Live Coding |
| 11 | `/interview/ended` | UC13 Hết giờ & snapshot |
| 12 | `/reports`, `/reports/:id` | UC14, UC16 Báo cáo & yêu cầu đánh giá lại |
| 13 | `/roadmap` | UC15 Lộ trình học thích ứng |
| 14 | `/admin/taxonomy` | UC17 Quản lý danh mục tri thức |
| 15 | `/admin/moderation` | UC18 Kiểm duyệt câu hỏi & bài tập |

Ví dụ: `http://localhost:5173/app/#/dashboard`.

## Tiện ích khi xem landing page

- `?p=0.55` — nhảy tới vị trí cuộn (0–1).
- `?palette=mono|blueprint|terminal|coral|forest` — thử bảng màu khác (mặc định: `sky`).
