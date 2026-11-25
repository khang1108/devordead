import { createReveal, easeOutCubic, mapRange } from '../fx/text.js';

export default function createScene(root) {
  root.innerHTML = `
    <div class="roadmap-header">
      <p class="scene-index">03 · Lộ trình</p>
      <h2 class="scene-title">Lộ trình học<br><span class="accent-text">của riêng bạn.</span></h2>
    </div>

    <div class="roadmap-waypoints" aria-hidden="true">
      <span>Nền tảng</span><i>→</i><span>Cấu trúc dữ liệu</span><i>→</i><span>Thuật toán</span><i>→</i><span class="is-dest">System Design</span>
    </div>

    <ol class="roadmap-features">
      <li>
        <span class="feature-number" aria-hidden="true">01</span>
        <div class="feature-copy">
          <h3>Chọn vị trí mục tiêu</h3>
          <p>Frontend, Backend, Data hoặc Mobile từ Intern đến Junior.</p>
        </div>
      </li>
      <li>
        <span class="feature-number" aria-hidden="true">02</span>
        <div class="feature-copy">
          <h3>Cá nhân hóa theo CV &amp; JD</h3>
          <p>Trích xuất kỹ năng trọng tâm trực tiếp từ hồ sơ và tin tuyển dụng.</p>
        </div>
      </li>
      <li>
        <span class="feature-number" aria-hidden="true">03</span>
        <div class="feature-copy">
          <h3>Điều chỉnh ưu tiên mỗi ngày</h3>
          <p>Cập nhật bài học tiếp theo dựa trên bằng chứng kết quả làm bài.</p>
        </div>
      </li>
    </ol>`;

  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const title = createReveal(root.querySelector('.scene-title'), { type: 'scramble' });
  const waypoints = root.querySelector('.roadmap-waypoints');
  const features = [...root.querySelectorAll('.roadmap-features li')];

  function update(t) {
    root.style.opacity = String(mapRange(t, 0, 0.1) * (1 - mapRange(t, 0.9, 1)));
    title.set(mapRange(t, 0.03, 0.4));
    waypoints.style.opacity = String(easeOutCubic(mapRange(t, 0.12, 0.35)));

    features.forEach((el, i) => {
      const p = easeOutCubic(mapRange(t, 0.16 + i * 0.15, 0.35 + i * 0.15));
      el.style.opacity = String(p);
      el.style.transform = reducedMotion || p > 0.995
        ? 'none'
        : `translate3d(${-12 * (1 - p)}px, 0, 0)`;
      const active = t >= 0.24 + i * 0.18 && t < 0.24 + (i + 1) * 0.22;
      el.classList.toggle('is-current', active || (i === 2 && t >= 0.6));
    });
  }

  update(0);
  return { update };
}
