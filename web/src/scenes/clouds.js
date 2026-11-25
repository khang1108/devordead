import { createReveal, mapRange } from '../fx/text.js';

export default function createScene(root) {
  root.innerHTML = `
    <p class="scene-index">07 — CẢM NHẬN</p>
    <h2 class="scene-title">HỌ ĐÃ<br><span class="accent-text">CẤT CÁNH</span></h2>
    <div class="testimonials"><div class="testimonial-track">
      <figure class="testimonial"><figcaption><span class="testimonial-avatar" aria-hidden="true">MA</span><span><strong>Minh Anh</strong><span>Backend Intern</span></span><span class="quote-mark" aria-hidden="true">“</span></figcaption><blockquote>“Từ không biết bắt đầu ở đâu, mình đã có lộ trình để luyện mỗi ngày.”</blockquote></figure>
      <figure class="testimonial"><figcaption><span class="testimonial-avatar" aria-hidden="true">QB</span><span><strong>Quốc Bảo</strong><span>Frontend Developer</span></span><span class="quote-mark" aria-hidden="true">“</span></figcaption><blockquote>“AI hỏi sâu hơn mình nghĩ. Luyện trước giúp mình tự tin hơn khi phỏng vấn thật.”</blockquote></figure>
      <figure class="testimonial"><figcaption><span class="testimonial-avatar" aria-hidden="true">TH</span><span><strong>Thu Hà</strong><span>Data Analyst</span></span><span class="quote-mark" aria-hidden="true">“Mỗi lần nhận góp ý, mình lại biết cách trả lời rõ ràng và có cấu trúc hơn.”</blockquote></figure>
    </div></div>
    <p class="scene-footnote">*nội dung minh họa</p>`;

  const title = createReveal(root.querySelector('.scene-title'), { type: 'chars' });
  const cards = [...root.querySelectorAll('.testimonial')].map((el) => createReveal(el, { type: 'blur' }));

  function update(t) {
    root.style.opacity = String(mapRange(t, 0, 0.1) * (1 - mapRange(t, 0.9, 1)));
    title.set(mapRange(t, 0.02, 0.27));
    cards.forEach((card, i) => card.set(mapRange(t, 0.16 + i * 0.18, 0.36 + i * 0.18)));
    root.style.setProperty('--testimonial-travel', String(mapRange(t, 0.38, 0.82)));
  }
  update(0);
  return { update };
}
