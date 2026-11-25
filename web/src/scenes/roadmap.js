import { createReveal, easeOutCubic, mapRange } from '../fx/text.js';

export default function createScene(root) {
  root.innerHTML = `
    <p class="scene-index">03 — LỘ TRÌNH</p>
    <h2 class="scene-title">LỘ TRÌNH<br>CỦA RIÊNG BẠN</h2>
    <ol class="roadmap-features">
      <li><span class="feature-number" aria-hidden="true">01</span><div><h3>Chọn vị trí mục tiêu</h3><p>Frontend, Backend, Data, Mobile</p></div><span class="feature-arrow" aria-hidden="true">↗</span></li>
      <li><span class="feature-number" aria-hidden="true">02</span><div><h3>AI cá nhân hóa</h3><p>theo trình độ của bạn</p></div><span class="feature-arrow" aria-hidden="true">↗</span></li>
      <li><span class="feature-number" aria-hidden="true">03</span><div><h3>Theo dõi tiến độ</h3><p>mỗi ngày</p></div><span class="feature-arrow" aria-hidden="true">↗</span></li>
    </ol>`;

  const title = createReveal(root.querySelector('.scene-title'), { type: 'scramble' });
  const features = [...root.querySelectorAll('.roadmap-features li')];

  function update(t) {
    root.style.opacity = String(mapRange(t, 0, 0.1) * (1 - mapRange(t, 0.9, 1)));
    title.set(mapRange(t, 0.04, 0.42));
    features.forEach((el, i) => {
      const p = easeOutCubic(mapRange(t, 0.18 + i * 0.16, 0.36 + i * 0.16));
      el.style.opacity = String(p);
      el.style.transform = `translate3d(${-20 * (1 - p)}px, 0, 0)`;
    });
  }
  update(0);
  return { update };
}
