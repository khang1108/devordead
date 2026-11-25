import { createReveal, easeOutCubic, mapRange } from '../fx/text.js';

export default function createScene(root) {
  root.innerHTML = `
    <div class="offer-layout">
      <div class="offer-top">
        <p class="scene-index">08 · Chạm đích</p>
        <div class="offer-heading">
          <p class="offer-eyebrow">Chương mới của bạn</p>
          <h2 class="scene-title">Offer đầu tiên<br><span class="accent-text">đang chờ bạn.</span></h2>
        </div>
      </div>

      <div class="offer-action">
        <div class="offer-cta-group">
          <a class="scene-button scene-button--primary" href="/app/#/login">
            <span>Bắt đầu luyện ngay</span>
          </a>
          <a class="scene-button scene-button--outline" href="/app/#/interview/setup">
            <span>Thử phòng phỏng vấn AI</span>
            <span class="btn-glyph" aria-hidden="true">→</span>
          </a>
        </div>
        <p class="scene-body">Miễn phí. Không cần thẻ. Thiết lập vị trí mục tiêu và CV trong 2 phút.</p>
      </div>
    </div>
    <p class="offer-signoff" aria-hidden="true">Từ dòng code đầu tiên đến offer đầu tiên.</p>`;

  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const title = createReveal(root.querySelector('.scene-title'), { type: 'chars' });
  const heading = root.querySelector('.offer-heading');
  const indexEl = root.querySelector('.scene-index');
  const action = root.querySelector('.offer-action');
  const links = [...root.querySelectorAll('.scene-button')];
  const signoff = root.querySelector('.offer-signoff');

  function update(t) {
    root.style.opacity = String(mapRange(t, 0, 0.1));
    const p = easeOutCubic(mapRange(t, 0.26, 0.46));
    indexEl.style.opacity = String(p);
    heading.style.opacity = String(p);
    title.set(mapRange(t, 0.28, 0.5));

    const cta = easeOutCubic(mapRange(t, 0.36, 0.52));
    action.style.opacity = String(cta);
    action.style.transform = reducedMotion || cta > 0.995
      ? 'none'
      : `translate3d(0, ${14 * (1 - cta)}px, 0)`;
    const active = t > 0.34;
    action.style.visibility = active ? 'inherit' : 'hidden';
    links.forEach((link) => {
      link.style.pointerEvents = active ? 'auto' : 'none';
    });
    signoff.style.opacity = String(mapRange(t, 0.42, 0.54));
  }

  update(0);
  return { update };
}
