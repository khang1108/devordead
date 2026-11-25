# DevOrDead Web App — spec giao diện (15 màn hình)

Nguồn yêu cầu: Analysis Report (UC01–UC18, BR1–BR4, NFR01–NFR10). Chỉ làm **giao diện + tương tác phía client** với dữ liệu minh họa; chưa có backend.

## Stack & cấu trúc
- React 19 (function component + hooks), React Router 7 (hash router), Vite 8. **JavaScript (JSX), không TypeScript. Không cài thêm thư viện.**
- App ở `app/` (URL `/app/#/…`). Landing page ở thư mục gốc — không đụng tới.

```
app/src/
  main.jsx                 router (Claude)
  styles/tokens.css        biến màu Sky (Claude) — KHÔNG sửa
  styles/app.css           CSS dùng chung + class tiện ích (Claude) — KHÔNG sửa
  components/ui.jsx        Button, Badge, Card, CardHead, Eyebrow, PageHeader, StatCard, Field,
                           Segmented, Chip, Toggle, Tabs, ProgressBar, Callout, RuleTag (Claude) — KHÔNG sửa
  components/Logo.jsx      Logo, LogoMark (prop onDark)
  components/AppShell.jsx  sidebar ứng viên / quản trị
  data/mock.js             dữ liệu minh họa dùng chung — KHÔNG sửa (cần thêm thì khai báo cục bộ trong file màn hình)
  screens/<Tên>Screen.jsx  mỗi màn một file (+ tùy chọn <Tên>Screen.css cùng thư mục)
```

## Phạm vi: CHỈ UI
Không gọi API thiết bị hay dịch vụ (micro, loa, Web Audio, Speech, fetch). Mọi thao tác “gọi server/AI/thiết bị” chỉ **đổi trạng thái hiển thị** bằng dữ liệu minh họa (có thể kèm trạng thái loading ngắn) để thấy đủ các trạng thái của màn hình.

## Quy tắc chung (bắt buộc)
1. Chỉ sửa/tạo file màn hình được giao và file CSS riêng của nó. CSS riêng: mọi class có **tiền tố theo màn** (vd. `.dash-…`, `.kb-…`) để không đụng màn khác; import CSS trong file màn hình.
2. Dùng component trong `components/ui.jsx` và class tiện ích trong `app.css` (`row`, `col`, `grid`, `grow`, `between`, `t-display-l`, `t-heading-m`, `t-mono`, `t-body-s`, `t-number`, `c-ink2`, `c-brand`, `card`, `table`, `kv`, `code-block`, `empty`, `spinner`…) trước khi viết CSS mới. Màu chỉ dùng biến CSS (`var(--ink)`, `var(--brand)`…), **không hard-code hex**.
3. Phong cách (giống landing page & Figma): nền `--bg`, card trắng viền 1px `--line` bo 16px; tiêu đề section là nhãn mono viết hoa nhỏ (`t-mono`); tiêu đề trang dùng `PageHeader` (eyebrow dạng `"02 — KHO TRI THỨC"`); màu nhấn đỏ `--accent` chỉ cho CTA chính (Button variant `accent`); xanh `--brand` cho tiến độ/đã chọn.
4. Nội dung **tiếng Việt** (riêng phiên HR là tiếng Anh). Số liệu là minh họa.
5. Điều hướng bằng `Link` / `useNavigate` của `react-router-dom`. Các route: `/login`, `/profile`, `/dashboard`, `/knowledge`, `/practice/voice`, `/problems`, `/problems/:id`, `/interview/setup`, `/interview/hr`, `/interview/technical`, `/interview/ended`, `/reports`, `/reports/:id`, `/roadmap`, `/admin/taxonomy`, `/admin/moderation`.
6. Accessibility: nút là `<button>`/`Button`, link là `<Link>`; input có label (`Field`); trạng thái không chỉ dựa vào màu (luôn có chữ); vùng bấm ≥ 44px; `aria-expanded`/`aria-selected` cho cây, danh sách chọn.
7. Bố cục: tối ưu 1280–1440px; ở 768–1024px các cột xếp chồng; không có thanh cuộn ngang trang.
8. Hiển thị nhãn quy định ngay tại chỗ áp dụng bằng `RuleTag` (vd. `<RuleTag code="BR4">Chỉ bài đã duyệt</RuleTag>`).
9. Mọi tương tác là state phía client; thao tác “gọi server/AI” thì giả lập bằng `setTimeout` (~800–1500ms) có trạng thái loading (`spinner`) và trạng thái lỗi khi phù hợp.

## Yêu cầu từng màn

### 01 · Đăng nhập / Đăng ký — `LoginScreen` (UC01) — **agy**
Không sidebar. Hai cột: trái nền `--bg-dark` (Logo onDark; tiêu đề `t-display-xl` 3 dòng “TỐT NGHIỆP RỒI.” / “GIỜ LÀ” / “PHỎNG VẤN.” — dòng cuối màu `--brand`; đoạn mô tả; 3 nhãn mono: “01 — Luyện kiến thức bằng giọng nói”, “02 — Live coding, chấm trong sandbox”, “03 — Phỏng vấn mô phỏng với AI”). Phải: card form rộng ~440px, `Tabs` Đăng nhập / Đăng ký.
- Đăng nhập: Email, Mật khẩu, link “Quên mật khẩu?”, nút Primary “Đăng nhập” full width, đường chia “HOẶC”, nút Secondary “Tiếp tục với Google”, “Tiếp tục với GitHub”.
- Đăng ký: Email, Mật khẩu, Xác nhận mật khẩu, nút “Tạo tài khoản”.
- Kiểm tra phía client: email hợp lệ, mật khẩu ≥ 8 ký tự, xác nhận khớp → lỗi inline (`Field error`).
- Demo kịch bản: đăng nhập với mật khẩu `wrongpass` → banner lỗi chung “Email hoặc mật khẩu không đúng.” (E2, không nói rõ sai email hay mật khẩu); đăng ký với `taken@email.com` → “Email này đã được đăng ký.” kèm nút chuyển sang tab Đăng nhập (E1); thành công: đăng nhập → `/dashboard`, đăng ký hoặc OAuth → `/profile`. Nút đang gửi có spinner ~800ms.
- Chân card: nhãn mono “HTTPS · JWT · OAUTH2”. Một link nhỏ “Vào trang quản trị (demo)” → `/admin/taxonomy`.

### 02 · Hồ sơ mục tiêu & CV/JD — `ProfileScreen` (UC02, UC03) — **agy**
`PageHeader` eyebrow “08 — HỒ SƠ MỤC TIÊU”, title “Bạn đang nhắm tới đâu?”. Hai cột:
- Trái “Vị trí & cấp độ”: Role chọn bằng `Chip` theo nhóm `ROLE_FAMILIES` (mặc định Backend), Level bằng `Segmented` (`LEVELS`, mặc định Fresher), callout “Lộ trình sẽ được khởi tạo…”, nút “Lưu hồ sơ mục tiêu” → callout success “Đã lưu. Lộ trình đã được cập nhật.”, nút Ghost “Để sau” → `/dashboard`.
- Phải “CV & JD”: `RuleTag code="NFR04"` “Mã hóa khi lưu”; chọn tệp CV (`input type=file`, chỉ .pdf/.docx, ≤ 5MB, sai → lỗi E1); hiển thị tên + dung lượng tệp; `Field multiline` dán JD; nút “Phân tích CV/JD” → loading → danh sách kỹ năng trích xuất (Node.js, PostgreSQL, REST API = “KHỚP CV” success; Docker, Redis, System Design cơ bản = “THIẾU TRONG CV” warning), mỗi dòng có mức JD (“Bắt buộc”/“Ưu tiên”) và nút xóa (×, có aria-label); ô thêm kỹ năng thủ công (A1); nút “Xác nhận & lưu” → callout success. Nếu JD trống khi bấm phân tích → lỗi “Dán nội dung JD hoặc tải CV trước.”

### 03 · Tổng quan — `DashboardScreen` (UC02, UC15) — **Codex A**
`PageHeader` eyebrow “01 — TỔNG QUAN”, title “Chào {tên}”, subtitle mục tiêu + số ngày tới phỏng vấn (`currentUser`), action Button accent “Bắt đầu phỏng vấn” → `/interview/setup`. Hàng 4 `StatCard` (`dashboardStats`). Hàng giữa: card “Mức nắm competency” (`competencySummary`, ProgressBar; < 40% dùng tone warning + chữ %) + link “Xem kho tri thức →”; card “Luyện tiếp” 3 ô bấm được (giọng nói → `/practice/voice`, Two Sum → `/problems/001`, phỏng vấn → `/interview/setup`). Hàng dưới: “Lộ trình tuần này” (3 mục ưu tiên cao nhất của `roadmapItems`, badge ưu tiên) + link `/roadmap`; “Báo cáo gần đây” (`reports`, điểm; trạng thái `interrupted` → badge “GIÁN ĐOẠN” thay cho điểm) mỗi dòng link `/reports/:id`.

### 04 · Kho tri thức — `KnowledgeScreen` (UC04) — **Codex A**
Thanh lọc: ô tìm kiếm (lọc topic theo tên, không phân biệt dấu nếu làm được), Chip “Backend · Fresher” (bật, chỉ hiển thị), Chip “Ưu tiên từ JD” (lọc topic `jd`), Chip “Chưa luyện” (practiced === 0). Hai cột: cây `knowledgeTree` (domain mở/đóng, `aria-expanded`; topic có badge “JD”; topic đang chọn nổi bật) và chi tiết topic (breadcrumb mono, title `t-display-l`, badge, mô tả, danh sách competency + ProgressBar + %, thống kê đã luyện/điểm TB/lần cuối, nút accent “Bắt đầu luyện giọng nói” → `/practice/voice`, Secondary “Xem bài tập liên quan” → `/problems`). Không có kết quả → trạng thái rỗng “Không tìm thấy topic phù hợp — thử bỏ bớt bộ lọc.” (E1). `RuleTag BR4` “Chỉ nội dung đã duyệt”.

### 06 · Ngân hàng bài tập — `ProblemsScreen` (UC07) — **Codex A**
`PageHeader` “04 — BÀI TẬP LẬP TRÌNH” + `RuleTag BR4`. Lọc: tìm theo tên, Chip độ khó (bật/tắt nhiều cái), `select` chủ đề, `select` vai trò. Bảng (`table`) cột #, Tên bài, Chủ đề, Độ khó (Badge theo `DIFFICULTY`), Vai trò, Trạng thái (Badge `PROBLEM_STATUS`); hàng chọn được bằng chuột và bàn phím (`aria-selected`). Panel xem trước: tiêu đề, badge, mô tả, ràng buộc, ví dụ trong `code-block`, nút accent “Làm bài” → `/problems/:id`, nhãn mono “ĐÃ DUYỆT · {approvedAt}”. Trạng thái rỗng khi lọc không ra kết quả.

### 08 · Cấu hình phiên phỏng vấn — `InterviewSetupScreen` (UC10) — **Codex A**
Trái: card “Loại phiên” 2 lựa chọn dạng thẻ (radio): “HR — Behavioral” (badge “TIẾNG ANH”) / “Technical & Live Coding” (badge “SANDBOX”); card “Thời lượng” `Segmented` 15/30/45 phút, “Độ khó” Dễ/Trung bình/Khó, `Toggle` “Dùng CV/JD đã tải làm ngữ cảnh”; card “Kiểm tra thiết bị”: nút “Kiểm tra micro” gọi `navigator.mediaDevices.getUserMedia({ audio: true })` → thành công: badge “HOẠT ĐỘNG” (dừng track ngay sau đó); lỗi/không có quyền: callout lỗi hướng dẫn cấp quyền (E2); nút “Phát âm thanh thử” phát tiếng bíp ngắn bằng Web Audio API. Phải: card “Tóm tắt phiên” (`kv`), callout warning `BR1 · HARD-STOP` (“Phiên tự kết thúc đúng {n}:00, không kéo dài…”), Button accent “Bắt đầu phỏng vấn” **bị khóa cho tới khi micro OK** (có dòng giải thích) → điều hướng `/interview/hr` hoặc `/interview/technical` kèm `state: { duration, difficulty, useCv }`.

### 12 · Báo cáo năng lực & yêu cầu đánh giá lại — `ReportScreen` (UC14, UC16) — **Codex B**
Route `/reports` và `/reports/:id` (mặc định báo cáo đầu tiên). Cột trái: danh sách `reports` (loại, ngày, điểm hoặc badge GIÁN ĐOẠN). Chi tiết báo cáo đầy đủ (`r-2211`): header loại/ngày/thời lượng; 3 ô điểm: Tổng quan, **Tính đúng của mã** (điểm + passed/total + ghi chú) và **Lập luận** (điểm + ghi chú) — kèm `RuleTag BR2` “Chấm độc lập”; bảng competency (tên, ProgressBar điểm/10, bằng chứng, nút “Yêu cầu đánh giá lại”); 3 cột Điểm mạnh / Cần cải thiện / Đề xuất; `Tabs` bằng chứng: Transcript (`techScript`), Snapshot mã (`code-block` lời giải Two Sum), Kết quả test (5 test, test 5 TLE). Panel đánh giá lại (UC16): mục đang chọn, `Field multiline` lý do **bắt buộc** (trống → lỗi E1), Gửi → loading → mục đó chuyển badge “ĐANG XỬ LÝ”, nút của mục đó bị khóa (E2: mỗi mục chỉ 1 yêu cầu); Hủy (A1). Báo cáo `interrupted` → callout “Phiên bị gián đoạn — kết quả không tính vào hồ sơ năng lực” (A2). Báo cáo chỉ có `overall` → hiện điểm tổng + ghi chú “Bản minh họa: chi tiết chỉ có ở báo cáo 22/11”. Link “Xem lộ trình học →” `/roadmap`.

### 13 · Lộ trình học thích ứng — `RoadmapScreen` (UC15) — **Codex B**
`PageHeader` “07 — LỘ TRÌNH HỌC”, subtitle “Cập nhật 22/11 dựa trên 3 phiên gần nhất”. Dải “tuyến bay” giống landing page: `ROADMAP_HUBS` là các chấm nối bằng đường nét đứt (done = chấm `--brand` đặc, current = vòng `--accent`, todo = xám), nhãn dưới mỗi chấm. `Tabs` lọc theo loại (Tất cả / Topic / Bài tập / Giọng nói / Phỏng vấn). Danh sách `roadmapItems` sắp theo ưu tiên: badge ưu tiên (Cao=danger, TB=warning, Thấp=neutral, luôn có chữ), badge loại, độ khó, ô “Vì sao đề xuất” (reason), `Link` “Bắt đầu →” tới `item.to`. Trạng thái rỗng theo bộ lọc. Ghi chú nhỏ: “Lộ trình dựa trên bằng chứng từ kết quả làm bài, không dựa trên phán đoán cảm tính.”

### 14 · Quản lý danh mục tri thức — `AdminTaxonomyScreen` (UC17) — **Codex B**
Sidebar quản trị (đã có sẵn qua route). Ba vùng: cây “Role Family → Role” (`ROLE_FAMILIES` + `LEVELS`) và cây “Domain → Topic → Competency” (bản sao cục bộ của `knowledgeTree` trong state); chọn nút → form sửa (Tên, Mô tả, Cấp độ `select`, liên kết Role bằng Chip). Thao tác: “Thêm nút con”, “Lưu”, nút lên/xuống để sắp xếp, “Vô hiệu hóa” (A1: nút mờ đi + badge “ĐÃ ẨN”), “Xóa” (nếu là topic có `practiced > 0` → lỗi E1 “Nút đang được tham chiếu — hãy vô hiệu hóa thay vì xóa”). Kiểm tra trùng tên trong cùng cấp → lỗi E2. Mỗi thao tác thành công thêm một dòng vào “Nhật ký thay đổi” (khởi tạo từ `taxonomyLog`, mới nhất ở trên).

### 15 · Kiểm duyệt câu hỏi & bài tập — `AdminModerationScreen` (UC18) — **Codex B**
`PageHeader` “QUẢN TRỊ — KIỂM DUYỆT NỘI DUNG” + callout `BR4` (“Ngân hàng chính thức chỉ nhận nội dung đã phê duyệt; câu hỏi AI sinh trong phiên không tự vào kho”). Trái: hàng chờ (`moderationQueue` trong state) với `Tabs` Tất cả / Câu hỏi / Bài tập, mỗi mục: loại, tiêu đề, nguồn, thời gian; số lượng chờ duyệt. Phải: chi tiết mục chọn — `Field` sửa tiêu đề/nội dung, đáp án tham chiếu, tiêu chí; gán Topic, Competency, Độ khó (`select`); nút “Phê duyệt” (Primary; thiếu trường bắt buộc → lỗi E1 chỉ rõ trường), “Từ chối” (mở ô lý do bắt buộc), “Yêu cầu AI đề xuất lại” (Ghost; loading rồi thay nội dung bằng bản mới, A1). Sau phê duyệt/từ chối: mục rời hàng chờ, thêm vào danh sách “Đã xử lý” (kèm trạng thái + lý do). Hàng chờ trống → trạng thái rỗng.

### Màn do Claude làm
05 Luyện giọng nói (`VoicePracticeScreen`), 07 Trình soạn thảo & Sandbox (`ProblemEditorScreen`), 09 Phỏng vấn HR (`HrInterviewScreen`), 10 Technical & Live Coding (`TechInterviewScreen`), 11 Hết giờ & snapshot (`SessionEndedScreen`), cùng các phần dùng chung: micro + waveform, đồng hồ hard-stop, Monaco editor, mô phỏng sandbox.
