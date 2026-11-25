import { createReveal, easeOutCubic, mapRange } from '../fx/text.js';

export default function createScene(root) {
  root.innerHTML = `
    <p class="scene-index">01 — KHỞI ĐẦU</p>
    <div class="hero-heading">
      <h1 class="scene-title">TỐT NGHIỆP RỒI.<br>GIỜ LÀ<br><span class="accent-text">PHỎNG VẤN.</span></h1>
    </div>
    <div class="hero-details">
      <p class="scene-body">Luyện phỏng vấn IT với AI — từ lộ trình học đến offer đầu tiên.</p>
      <div class="scene-actions">
        <a class="scene-button scene-button--primary" href="/app/#/login">Bắt đầu miễn phí <span aria-hidden="true">↗</span></a>
        <button class="scene-button scene-button--outline" type="button">Xem cách hoạt động <span aria-hidden="true">↓</span></button>
      </div>
    </div>
    <div class="scroll-cue" aria-hidden="true"><span class="scroll-cue-line"></span><span>CUỘN ĐỂ CẤT CÁNH</span><span>↓</span></div>
    <p class="scene-edition" aria-hidden="true">DEVORDEAD / 2026</p>`;

  const heading = root.querySelector('.hero-heading');
  const details = root.querySelector('.hero-details');
  const cue = root.querySelector('.scroll-cue');
  const copy = createReveal(root.querySelector('.scene-body'), { type: 'blur' });
  copy.set(1);

  const story = root.closest('#story');
  root.querySelector('.scene-button--outline').addEventListener('click', (event) => {
    if (!story || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    // A sticky scene has no useful anchor offset; navigate into fold's timeline.
    const start = story.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: start + (story.offsetHeight - window.innerHeight) * 0.1,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });

  function update(t) {
    root.style.opacity = String(1 - mapRange(t, 0.9, 1));
    const exit = easeOutCubic(mapRange(t, 0.12, 1));
    heading.style.transform = `translate3d(0, ${-64 * exit}px, 0)`;
    heading.style.opacity = String(1 - mapRange(t, 0.45, 0.96));
    details.style.transform = `translate3d(0, ${-32 * exit}px, 0)`;
    details.style.opacity = String(1 - mapRange(t, 0.6, 0.98));
    cue.style.opacity = String(1 - mapRange(t, 0.08, 0.38));
  }
  update(0);
  return { update };
}
