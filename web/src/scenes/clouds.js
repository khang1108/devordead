import { createReveal, easeOutCubic, mapRange } from '../fx/text.js';

export default function createScene(root) {
  root.innerHTML = `
    <div class="clouds-header">
      <p class="scene-index">07 · Hành trình</p>
      <h2 class="scene-title">Họ đã<br><span class="accent-text">cất cánh.</span></h2>
    </div>

    <div class="testimonials">
      <div class="testimonial-track">
        <figure class="testimonial">
          <figcaption>
            <span class="testimonial-avatar" aria-hidden="true">MA</span>
            <span>
              <strong>Minh Anh</strong>
              <span>Backend Intern</span>
            </span>
          </figcaption>
          <blockquote>“Từ không biết bắt đầu ở đâu, cây tri thức và lộ trình theo JD giúp mình biết rõ mỗi tuần cần luyện phần nào.”</blockquote>
        </figure>

        <figure class="testimonial">
          <figcaption>
            <span class="testimonial-avatar" aria-hidden="true">QB</span>
            <span>
              <strong>Quốc Bảo</strong>
              <span>Frontend Developer</span>
            </span>
          </figcaption>
          <blockquote>“AI hỏi vặn sâu vào Event Loop và độ phức tạp thuật toán. Nhờ luyện nói trước micro nên vào vòng thật mình tự tin hẳn.”</blockquote>
        </figure>

        <figure class="testimonial">
          <figcaption>
            <span class="testimonial-avatar" aria-hidden="true">TH</span>
            <span>
              <strong>Thu Hà</strong>
              <span>Data Analyst</span>
            </span>
          </figcaption>
          <blockquote>“Báo cáo tách riêng điểm code và lập luận chỉ ra đúng chỗ mình diễn đạt vòng vo để sửa ngay sau từng buổi luyện.”</blockquote>
        </figure>
      </div>
    </div>

    <p class="scene-footnote">*Nội dung minh họa</p>`;

  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileQuery = typeof window !== 'undefined'
    ? window.matchMedia('(max-width: 768px)')
    : { matches: false };

  const title = createReveal(root.querySelector('.scene-title'), { type: 'chars' });
  const cardEls = [...root.querySelectorAll('.testimonial')];
  const cards = cardEls.map((el) => createReveal(el, { type: 'blur' }));
  let lastT = 0;

  function update(t) {
    lastT = t;
    root.style.opacity = String(mapRange(t, 0, 0.1) * (1 - mapRange(t, 0.9, 1)));
    title.set(mapRange(t, 0.02, 0.27));

    if (mobileQuery.matches) {
      // Single whole unclipped card crossfade on mobile — never slices mid-card.
      const windows = [
        mapRange(t, 0.08, 0.2) * (1 - mapRange(t, 0.35, 0.43)),
        mapRange(t, 0.41, 0.49) * (1 - mapRange(t, 0.64, 0.72)),
        mapRange(t, 0.7, 0.78),
      ];
      cardEls.forEach((el, i) => {
        const p = easeOutCubic(windows[i]);
        el.style.opacity = String(p);
        el.style.filter = 'none';
        el.style.transform = reducedMotion || p > 0.995
          ? 'none'
          : `translate3d(0, ${8 * (1 - p)}px, 0)`;
      });
    } else {
      cards.forEach((card, i) => card.set(mapRange(t, 0.15 + i * 0.17, 0.35 + i * 0.17)));
    }
  }

  function resize() {
    update(lastT);
  }

  update(0);
  return { update, resize };
}
