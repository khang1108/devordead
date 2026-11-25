# DevOrDead — Landing page spec (bản xem trước)

Landing page kiểu **scrollytelling**: một tờ CV gấp thành máy bay giấy, bay qua các chặng luyện tập, cuối cùng mở ra thành Offer Letter.
Ngôn ngữ nội dung: **tiếng Việt**. Tên sản phẩm: **DevOrDead**.

## Stack
- Vite 8 (vanilla JS, ES modules), `three@0.186.0` (WebGLRenderer), `gsap@3.15.1` (ScrollTrigger), `lenis@1.3.27`.
- Không dùng React, không dùng TypeScript.

## Cấu trúc thư mục & quyền sở hữu file

| File | Ai viết | Nội dung |
|---|---|---|
| `package.json`, `vite.config.js`, `.gitignore`, `index.html` | agy | Scaffold, khung HTML |
| `src/styles/base.css` | agy | Design tokens, reset, header, layout story/stage/overlay, pricing/FAQ/footer |
| `src/fx/text.js`, `src/fx/cursor.js` | Codex | Hiệu ứng chữ, con trỏ tùy biến |
| `src/scenes/*.js`, `src/styles/scenes.css` | Codex | Lớp DOM của 8 cảnh |
| `src/main.js`, `src/story/*`, `src/three/*` | Claude | Lenis + ScrollTrigger, director, toàn bộ thế giới 3D (máy bay giấy, đường băng + bản đồ bay `src/three/flightMap.js`, tường code, quả cầu AI, mây, pháo giấy) |

**Không sửa file không thuộc phần của mình.**

## Khung HTML (bắt buộc giữ đúng id/class)

```html
<header class="site-header">…logo DevOrDead, nav (Tính năng, Bảng giá, FAQ), nút "Bắt đầu miễn phí"…</header>
<main>
  <section id="story" class="story">            <!-- cao 1350vh -->
    <div class="stage">                         <!-- position: sticky; top:0; height:100vh -->
      <canvas id="webgl"></canvas>              <!-- absolute, inset 0, z-index 0 -->
      <div class="overlay" id="overlay">        <!-- absolute, inset 0, z-index 1, pointer-events none -->
        <div class="scene" data-scene="hero"></div>
        <div class="scene" data-scene="fold"></div>
        <div class="scene" data-scene="roadmap"></div>
        <div class="scene" data-scene="code"></div>
        <div class="scene" data-scene="ai"></div>
        <div class="scene" data-scene="hr"></div>
        <div class="scene" data-scene="clouds"></div>
        <div class="scene" data-scene="offer"></div>
      </div>
    </div>
  </section>
  <section id="pricing" class="after">…</section>
  <section id="faq" class="after">…</section>
</main>
<footer class="site-footer">…</footer>
<script type="module" src="/src/main.js"></script>
```

`.scene`: `position:absolute; inset:0; opacity:0; visibility:hidden; pointer-events:none`.
`.scene.is-active`: `visibility:visible; opacity:1` (độ mờ chi tiết do module cảnh tự điều khiển).
Các phần tử con có thể bấm được (nút CTA) thì tự đặt `pointer-events:auto`.

## Design tokens (`:root` trong base.css)

```css
--bg: #F3F3F1;        /* nền trắng ngà */
--bg-dark: #0A0B0D;   /* nền tối cảnh AI */
--ink: #0B0B0C;       /* chữ chính */
--ink-2: #5B5D63;     /* chữ phụ */
--ink-3: #A3A5AB;     /* chữ mờ */
--line: #DCDCD8;
--accent: #22C55E;    /* xanh "Accepted" — màu nhấn duy nhất */
--accent-ink: #052E14;
--font-display: "Unbounded", system-ui, sans-serif;   /* tiêu đề: viết hoa, đậm, bản rộng */
--font-body: "Be Vietnam Pro", system-ui, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, monospace;
```
Google Fonts (có subset vietnamese): Unbounded 400/700/900, Be Vietnam Pro 400/500/700, JetBrains Mono 400/700.

Tông màu: trắng/xám/đen + **chỉ một màu nhấn xanh lá**. Nhiều màu chỉ xuất hiện ở cảnh Offer (pháo giấy).

## Timeline cuộn

Toàn bộ `#story` cao 1350vh. Tiến độ toàn cục `p ∈ [0,1]`. Mỗi cảnh có khoảng `[start, end]` theo `p`:

| Cảnh | key | p start → end | Nền | Chữ |
|---|---|---|---|---|
| 0 Hero | `hero` | 0.000 → 0.074 | sáng | tối |
| 1 Gấp máy bay | `fold` | 0.074 → 0.185 | sáng → đường băng đen ở nửa dưới | tối |
| 2 Lộ trình | `roadmap` | 0.185 → 0.333 | sáng (bản đồ bay, lưới chấm) | tối |
| 3 Luyện code | `code` | 0.333 → 0.481 | sáng | tối |
| 4 Phỏng vấn AI | `ai` | 0.481 → 0.667 | **tối** | **sáng** |
| 5 Phỏng vấn HR | `hr` | 0.667 → 0.778 | sáng | tối |
| 6 Qua mây | `clouds` | 0.778 → 0.889 | trời xanh nhạt/mây trắng | tối |
| 7 Offer | `offer` | 0.889 → 1.000 | sáng | tối |

## Hợp đồng module cảnh DOM (`src/scenes/<key>.js`)

```js
// root = <div class="scene" data-scene="<key>">
export default function createScene(root) {
  root.innerHTML = `...`;          // tự dựng DOM của cảnh
  return {
    update(t) { /* t ∈ [0,1]: tiến độ cục bộ trong cảnh, đã clamp */ },
    resize() { /* tùy chọn */ },
  };
}
```
- `src/scenes/index.js` export `{ hero, fold, roadmap, code, ai, hr, clouds, offer }` (các factory).
- Director (Claude) gọi `update(t)` mỗi frame khi cảnh active, và bật/tắt class `is-active`.
- **Mọi hoạt cảnh phải là hàm thuần của `t`** (không dùng tween theo thời gian), để cuộn ngược lại vẫn đúng.
- Mỗi cảnh tự fade in ở `t ∈ [0, 0.1]` và fade out ở `t ∈ [0.9, 1]`. Ngoại lệ: `hero` hiện sẵn ở t=0; `offer` không fade out.
- Máy bay giấy & vật thể 3D nằm ở canvas phía sau; lớp DOM chừa chỗ trống ở **giữa màn hình** cho vật thể 3D, chữ đặt lệch trái/phải.

## Nội dung từng cảnh (DOM)

**hero** — Tiêu đề lớn trái: "TỐT NGHIỆP RỒI. / GIỜ LÀ PHỎNG VẤN." · phụ đề: "Luyện phỏng vấn IT với AI — từ lộ trình học đến offer đầu tiên." · nút "Bắt đầu miễn phí" (accent) + nút viền "Xem cách hoạt động" · gợi ý cuộn ở dưới. Khi t tăng: chữ trượt lên + mờ dần.

**fold** — Chữ mờ khổng lồ "SẴN SÀNG?" phía sau (opacity ~0.06, ký tự lộ dần theo t). Dòng nhỏ: "Biết code là một chuyện. Vượt qua phỏng vấn là chuyện khác." (hiện bằng blur-reveal). Nửa sau cảnh: đường băng đen quét ngang nửa dưới màn hình, máy bay cất cánh (do 3D lo) — chữ ở nửa dưới phải màu sáng.

**roadmap** — Tiêu đề trái "LỘ TRÌNH / CỦA RIÊNG BẠN" (lộ từng ký tự, kiểu scramble). 3 điểm nổi bật (hiện lần lượt): "Chọn vị trí mục tiêu — Frontend, Backend, Data, Mobile" · "AI cá nhân hóa theo trình độ của bạn" · "Theo dõi tiến độ mỗi ngày". 3D vẽ bản đồ chuyến bay nhìn từ trên: 4 sân bay trung chuyển = 4 chặng (Nền tảng → Cấu trúc dữ liệu → Thuật toán → System Design) nối bằng tuyến bay nét đứt, đoạn đã bay chuyển xanh; cuối cùng tỏa ra 4 điểm đến Frontend/Backend/Data/Mobile, máy bay hạ cánh ở Backend — DOM không cần vẽ.

**code** — Bên phải: một khung editor giả (mono) gõ dần một lời giải Two Sum bằng Python theo t; dưới đó danh sách 6 test case "Test 1…6" lần lượt chuyển ✓ xanh; cuối cùng con dấu lớn "ACCEPTED" (viền accent, xoay -8°) đập vào. Bên trái: tiêu đề "LUYỆN ĐẾN KHI / ACCEPTED" + 3 bộ đếm tăng theo t: "1.200+ bài tập", "40+ chủ đề", "300+ câu hỏi theo công ty" (ghi chú nhỏ: "*số liệu minh họa").

**ai** — Nền tối, chữ sáng. Tiêu đề giữa-trên: "PHỎNG VẤN KỸ THUẬT VỚI AI. / BẤT CỨ LÚC NÀO." Phụ đề dạng đang gõ (hai câu lần lượt, có nhãn "AI Interviewer"): "Bạn hãy phân tích độ phức tạp thời gian của lời giải này?" → "Nếu dữ liệu tăng lên 10 triệu bản ghi thì sao?". Nửa sau: 4 thẻ xếp 4 góc quanh tâm (tâm là quả cầu AI 3D): "Câu hỏi đúng vị trí ứng tuyển" · "Hỏi vặn như người phỏng vấn thật" · "Chấm điểm chi tiết từng tiêu chí" · "Gợi ý cách trả lời tốt hơn" (mỗi thẻ: icon nhỏ dạng ký tự/SVG inline, tiêu đề, 1 dòng mô tả).

**hr** — Tiêu đề "TRẢ LỜI HR / KHÔNG CÒN RUN". 4 chữ cái lớn S · T · A · R hiện lần lượt, mỗi chữ kèm tên (Situation / Task / Action / Result) và giải thích tiếng Việt 1 dòng. Một dải câu hỏi chạy ngang theo t: "Kể về một lần bạn thất bại…", "Điểm yếu lớn nhất của bạn là gì?", "Vì sao bạn chọn công ty chúng tôi?", "Bạn xử lý mâu thuẫn trong nhóm thế nào?".

**clouds** — Tiêu đề "HỌ ĐÃ / CẤT CÁNH". 3 thẻ cảm nhận (ảnh đại diện = vòng tròn chữ cái đầu, tên, vị trí, trích dẫn), hiện bằng blur-reveal, lệch so le. Ghi chú nhỏ: "*nội dung minh họa". Tên giả định: "Minh Anh — Backend Intern", "Quốc Bảo — Frontend Developer", "Thu Hà — Data Analyst".

**offer** — Khi t > 0.55: tiêu đề "OFFER ĐẦU TIÊN / ĐANG CHỜ BẠN." + nút lớn "Bắt đầu luyện ngay" (accent, pointer-events auto) + dòng nhỏ "Miễn phí. Không cần thẻ." Bức thư Offer do 3D lo.

## Sau phần story (cuộn bình thường, agy)
- `#pricing`: 3 gói — "Free" (0đ), "Pro" (99.000đ/tháng, nổi bật), "Team/Trường học" (Liên hệ). Mỗi gói 4–5 dòng tính năng.
- `#faq`: 5 câu hỏi dạng `<details>`.
- Footer: logo, 3 cột link, "© 2026 DevOrDead".
