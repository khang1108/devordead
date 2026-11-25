import { createReveal, easeOutCubic, mapRange } from '../fx/text.js';

export default function createScene(root) {
  root.innerHTML = `
    <p class="scene-index">06 — HR</p>
    <h2 class="scene-title">TRẢ LỜI HR<br>KHÔNG CÒN RUN</h2>
    <div class="star-framework">
      <article class="star-card"><span class="star-letter" aria-hidden="true">S</span><div><h3><span class="star-step">01 / </span>Situation</h3><p>Bối cảnh của câu chuyện là gì?</p></div></article>
      <article class="star-card"><span class="star-letter" aria-hidden="true">T</span><div><h3><span class="star-step">02 / </span>Task</h3><p>Bạn cần giải quyết nhiệm vụ nào?</p></div></article>
      <article class="star-card"><span class="star-letter" aria-hidden="true">A</span><div><h3><span class="star-step">03 / </span>Action</h3><p>Bạn đã thực hiện những hành động gì?</p></div></article>
      <article class="star-card"><span class="star-letter" aria-hidden="true">R</span><div><h3><span class="star-step">04 / </span>Result</h3><p>Kết quả và bài học bạn nhận được.</p></div></article>
    </div>
    <div class="hr-ticker"><div class="hr-ticker-track">
      <p><span aria-hidden="true">↗</span>Kể về một lần bạn thất bại…</p>
      <p><span aria-hidden="true">↗</span>Điểm yếu lớn nhất của bạn là gì?</p>
      <p><span aria-hidden="true">↗</span>Vì sao bạn chọn công ty chúng tôi?</p>
      <p><span aria-hidden="true">↗</span>Bạn xử lý mâu thuẫn trong nhóm thế nào?</p>
    </div></div>`;

  const title = createReveal(root.querySelector('.scene-title'), { type: 'chars' });
  const cards = [...root.querySelectorAll('.star-card')];
  const ticker = root.querySelector('.hr-ticker-track');

  function update(t) {
    root.style.opacity = String(mapRange(t, 0, 0.1) * (1 - mapRange(t, 0.9, 1)));
    title.set(mapRange(t, 0.02, 0.29));
    cards.forEach((el, i) => {
      const p = easeOutCubic(mapRange(t, 0.15 + i * 0.14, 0.31 + i * 0.14));
      el.style.opacity = String(p);
      el.style.transform = `translate3d(0, ${24 * (1 - p)}px, 0)`;
    });
    // Percentages are relative to the track, so no per-frame measurement is needed.
    ticker.style.transform = `translate3d(${-76 * mapRange(t, 0.08, 0.94)}%, 0, 0)`;
  }
  update(0);
  return { update };
}
