import { createReveal, easeOutCubic, mapRange } from '../fx/text.js';

export default function createScene(root) {
  root.innerHTML = `
    <p class="scene-index">08 — OFFER</p>
    <div class="offer-heading"><p class="offer-eyebrow"><span aria-hidden="true">✓</span>CHƯƠNG MỚI CỦA BẠN</p><h2 class="scene-title">OFFER ĐẦU TIÊN<br><span class="accent-text">ĐANG CHỜ BẠN.</span></h2></div>
    <div class="offer-action"><a class="scene-button scene-button--primary" href="/app/#/login">Bắt đầu luyện ngay <span aria-hidden="true">↗</span></a><p class="scene-body">Miễn phí. Không cần thẻ.</p></div>
    <p class="offer-signoff" aria-hidden="true">TỪ DÒNG CODE ĐẦU TIÊN.<br>ĐẾN OFFER ĐẦU TIÊN.</p>`;

  const title = createReveal(root.querySelector('.scene-title'), { type: 'chars' });
  const heading = root.querySelector('.offer-heading');
  const action = root.querySelector('.offer-action');
  const link = root.querySelector('.scene-button');
  const signoff = root.querySelector('.offer-signoff');

  function update(t) {
    root.style.opacity = String(mapRange(t, 0, 0.1));
    const p = easeOutCubic(mapRange(t, 0.55, 0.76));
    heading.style.opacity = String(p);
    title.set(mapRange(t, 0.55, 0.86));
    const cta = easeOutCubic(mapRange(t, 0.66, 0.86));
    action.style.opacity = String(cta);
    action.style.transform = `translate3d(0, ${20 * (1 - cta)}px, 0)`;
    action.style.visibility = t > 0.66 ? 'inherit' : 'hidden';
    link.style.pointerEvents = t > 0.66 ? 'auto' : 'none';
    signoff.style.opacity = String(mapRange(t, 0.76, 0.91));
  }
  update(0);
  return { update };
}
