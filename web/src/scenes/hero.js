import { createReveal, easeOutCubic, mapRange } from '../fx/text.js';

export default function createScene(root) {
  root.innerHTML = `
    <div class="hero-layout">
      <div class="hero-top hero-enter">
        <p class="scene-index">01 · Khởi đầu</p>
        <div class="hero-heading">
          <h1 class="scene-title">Tốt nghiệp rồi.<br><span class="accent-text">Giờ là phỏng vấn.</span></h1>
        </div>
      </div>

      <div class="hero-details hero-enter hero-enter--delay">
        <p class="scene-body">Luyện phỏng vấn IT theo vị trí ứng tuyển — phân tích CV/JD, giải bài trong Docker Sandbox và đối thoại giọng nói thời gian thực.</p>
        <ul class="hero-facts" aria-label="Thông số kỹ thuật hệ thống">
          <li><strong>≤ 2,5s</strong> phản hồi giọng nói</li>
          <li><strong>BR2</strong> chấm độc lập mã &amp; lập luận</li>
          <li><strong>256 MB</strong> Docker Sandbox cô lập</li>
        </ul>
        <div class="scene-actions">
          <a class="scene-button scene-button--primary" href="/app/#/login"><span>Bắt đầu miễn phí</span></a>
          <button class="scene-button scene-button--outline" type="button"><span>Xem cách hoạt động</span><span class="btn-glyph" aria-hidden="true">↓</span></button>
        </div>
      </div>

      <div class="hero-foot">
        <div class="scroll-cue" aria-hidden="true"><span>Cuộn để xem hành trình</span><span>↓</span></div>
        <p class="scene-edition" aria-hidden="true">DevOrDead · 2026</p>
      </div>
    </div>`;

  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const heroTop = root.querySelector('.hero-top');
  const details = root.querySelector('.hero-details');
  const cue = root.querySelector('.scroll-cue');
  const edition = root.querySelector('.scene-edition');
  const interactive = [...root.querySelectorAll('.scene-button')];
  const copy = createReveal(root.querySelector('.scene-body'), { type: 'blur' });
  copy.set(1);

  const story = root.closest('#story');
  root.querySelector('.scene-button--outline').addEventListener('click', (event) => {
    if (!story || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const start = story.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: start + (story.offsetHeight - window.innerHeight) * 0.1,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  });

  function update(t) {
    root.style.opacity = String(1 - mapRange(t, 0.9, 1));
    const exit = reducedMotion ? 0 : easeOutCubic(mapRange(t, 0.12, 1));
    // heroTop carries both .scene-index and .hero-heading together so they never collide.
    heroTop.style.transform = exit === 0 ? 'none' : `translate3d(0, ${-20 * exit}px, 0)`;
    heroTop.style.opacity = String(1 - mapRange(t, 0.42, 0.94));
    details.style.transform = exit === 0 ? 'none' : `translate3d(0, ${-14 * exit}px, 0)`;
    details.style.opacity = String(1 - mapRange(t, 0.54, 0.96));
    cue.style.opacity = String(1 - mapRange(t, 0.06, 0.36));
    edition.style.opacity = String(1 - mapRange(t, 0.25, 0.72));
    const canInteract = t < 0.85 ? 'auto' : 'none';
    interactive.forEach((btn) => {
      btn.style.pointerEvents = canInteract;
    });
  }

  update(0);
  return { update };
}
