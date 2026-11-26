import { createReveal, easeOutCubic, mapRange, queryEl } from "../fx/text";
import type { SceneModule } from "../types";

export default function createScene(root: HTMLElement): SceneModule {
  root.innerHTML = `
    <div class="ai-topbar">
      <p class="scene-index">05 · Phỏng vấn AI</p>
      <span class="ai-latency-pill">Độ trễ giọng nói ≤ 2,5s · NFR01</span>
    </div>

    <div class="ai-center-stack">
      <h2 class="scene-title">Phỏng vấn kỹ thuật với AI.<br><span class="accent-text">Bất cứ lúc nào.</span></h2>
    </div>

    <div class="ai-features">
      <article class="ai-card">
        <div class="ai-card-top">
          <span class="ai-card-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="6.5" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="10" r="2" fill="currentColor"/></svg>
          </span>
          <span class="ai-card-number" aria-hidden="true">01</span>
        </div>
        <h3>Câu hỏi đúng vị trí ứng tuyển</h3>
        <p>Tùy biến kịch bản theo Role, Level và kỹ năng trong CV/JD.</p>
      </article>

      <article class="ai-card">
        <div class="ai-card-top">
          <span class="ai-card-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none"><path d="M4 6h8a4 4 0 0 1 4 4v5m0 0-3-3m3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <span class="ai-card-number" aria-hidden="true">02</span>
        </div>
        <h3>Hỏi vặn như người phỏng vấn thật</h3>
        <p>Đào sâu cơ chế hệ thống, trường hợp biên và đánh đổi thiết kế.</p>
      </article>

      <article class="ai-card">
        <div class="ai-card-top">
          <span class="ai-card-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none"><path d="M3 6h14M3 10h9M3 14h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          </span>
          <span class="ai-card-number" aria-hidden="true">03</span>
        </div>
        <h3>Chấm độc lập từng tiêu chí (BR2)</h3>
        <p>Tách riêng độ đúng của mã và khả năng lập luận thuật toán.</p>
      </article>

      <article class="ai-card">
        <div class="ai-card-top">
          <span class="ai-card-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none"><path d="M5 15 15 5m0 0H8m7 0v7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <span class="ai-card-number" aria-hidden="true">04</span>
        </div>
        <h3>Gợi ý cách trả lời tốt hơn</h3>
        <p>Lưu bản gỡ băng kèm dẫn chứng để cập nhật lộ trình học tập.</p>
      </article>
    </div>`;

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const title = createReveal(queryEl(root, ".scene-title"), { type: "chars" });
  const cards = [...root.querySelectorAll<HTMLElement>(".ai-card")];

  function update(t: number): void {
    root.style.opacity = String(mapRange(t, 0, 0.1) * (1 - mapRange(t, 0.9, 1)));
    title.set(mapRange(t, 0.02, 0.24));

    cards.forEach((el, i) => {
      const p = easeOutCubic(mapRange(t, 0.16 + i * 0.06, 0.32 + i * 0.06));
      el.style.opacity = String(p);
      el.style.transform =
        reducedMotion || p > 0.995
          ? "none"
          : `translate3d(0, ${10 * (1 - p)}px, 0)`;
    });
  }

  update(0);
  return { update };
}
