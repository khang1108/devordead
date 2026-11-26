import { createReveal, easeOutCubic, mapRange, queryEl } from "../fx/text";
import type { SceneModule } from "../types";

export default function createScene(root: HTMLElement): SceneModule {
  root.innerHTML = `
    <div class="hr-header">
      <p class="scene-index">06 · Phỏng vấn HR</p>
      <h2 class="scene-title">Trả lời phỏng vấn HR.<br><span class="accent-text">Rõ ràng từng ý.</span></h2>
    </div>

    <div class="star-framework">
      <article class="star-card">
        <span class="star-letter" aria-hidden="true">S</span>
        <div>
          <h3><span class="star-step">01 · </span>Situation</h3>
          <p>Đặt bối cảnh dự án, quy mô nhóm và bài toán thực tế.</p>
        </div>
      </article>
      <article class="star-card">
        <span class="star-letter" aria-hidden="true">T</span>
        <div>
          <h3><span class="star-step">02 · </span>Task</h3>
          <p>Xác định mục tiêu cần đạt và trách nhiệm của riêng bạn.</p>
        </div>
      </article>
      <article class="star-card">
        <span class="star-letter" aria-hidden="true">A</span>
        <div>
          <h3><span class="star-step">03 · </span>Action</h3>
          <p>Trình bày quyết định kỹ thuật và các bước bạn trực tiếp xử lý.</p>
        </div>
      </article>
      <article class="star-card">
        <span class="star-letter" aria-hidden="true">R</span>
        <div>
          <h3><span class="star-step">04 · </span>Result</h3>
          <p>Định lượng kết quả đạt được và bài học rút ra sau dự án.</p>
        </div>
      </article>
    </div>

    <div class="hr-ticker" aria-label="Câu hỏi phỏng vấn hành vi phổ biến">
      <div class="hr-ticker-track">
        <p><span aria-hidden="true">·</span>Kể về một lần bạn thất bại…</p>
        <p><span aria-hidden="true">·</span>Điểm yếu lớn nhất của bạn là gì?</p>
        <p><span aria-hidden="true">·</span>Vì sao bạn chọn công ty chúng tôi?</p>
        <p><span aria-hidden="true">·</span>Bạn xử lý mâu thuẫn trong nhóm thế nào?</p>
        <p><span aria-hidden="true">·</span>Dự án nào trong CV khiến bạn tự hào nhất?</p>
      </div>
    </div>`;

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const title = createReveal(queryEl(root, ".scene-title"), { type: "chars" });
  const cards = [...root.querySelectorAll<HTMLElement>(".star-card")];
  const ticker = queryEl(root, ".hr-ticker-track");

  function update(t: number): void {
    root.style.opacity = String(mapRange(t, 0, 0.1) * (1 - mapRange(t, 0.9, 1)));
    title.set(mapRange(t, 0.02, 0.28));
    cards.forEach((el, i) => {
      const p = easeOutCubic(mapRange(t, 0.14 + i * 0.13, 0.3 + i * 0.13));
      el.style.opacity = String(p);
      el.style.transform =
        reducedMotion || p > 0.995
          ? "none"
          : `translate3d(0, ${14 * (1 - p)}px, 0)`;
    });
    ticker.style.transform = reducedMotion
      ? "none"
      : `translate3d(${-52 * mapRange(t, 0.06, 0.94)}%, 0, 0)`;
  }

  update(0);
  return { update };
}
