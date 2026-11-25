import { createReveal, easeOutCubic, mapRange } from '../fx/text.js';

export default function createScene(root) {
  root.innerHTML = `
    <p class="scene-index">05 — PHỎNG VẤN AI</p>
    <h2 class="scene-title">PHỎNG VẤN KỸ THUẬT VỚI AI.<br><span class="accent-text">BẤT CỨ LÚC NÀO.</span></h2>
    <div class="ai-dialogue">
      <p class="interviewer-label"><span aria-hidden="true"></span>AI Interviewer</p>
      <div class="ai-questions">
        <p class="ai-question">Bạn hãy phân tích độ phức tạp thời gian của lời giải này?</p>
        <p class="ai-question">Nếu dữ liệu tăng lên 10 triệu bản ghi thì sao?</p>
      </div>
    </div>
    <div class="ai-features">
      <article class="ai-card"><span class="ai-card-icon" aria-hidden="true">⌖</span><div><h3>Câu hỏi đúng vị trí ứng tuyển</h3><p>Tập trung vào kỹ năng bạn cần.</p></div><span class="ai-card-number" aria-hidden="true">01</span></article>
      <article class="ai-card"><span class="ai-card-icon" aria-hidden="true">↳</span><div><h3>Hỏi vặn như người phỏng vấn thật</h3><p>Đào sâu cách bạn tư duy.</p></div><span class="ai-card-number" aria-hidden="true">02</span></article>
      <article class="ai-card"><span class="ai-card-icon" aria-hidden="true">≡</span><div><h3>Chấm điểm chi tiết từng tiêu chí</h3><p>Biết rõ điểm mạnh và điểm cần cải thiện.</p></div><span class="ai-card-number" aria-hidden="true">03</span></article>
      <article class="ai-card"><span class="ai-card-icon" aria-hidden="true">↗</span><div><h3>Gợi ý cách trả lời tốt hơn</h3><p>Rút kinh nghiệm sau mỗi buổi luyện.</p></div><span class="ai-card-number" aria-hidden="true">04</span></article>
    </div>`;

  const title = createReveal(root.querySelector('.scene-title'), { type: 'chars' });
  const questions = [...root.querySelectorAll('.ai-question')];
  const typing = questions.map((el) => createReveal(el, { type: 'type' }));
  const dialogue = root.querySelector('.ai-dialogue');
  const cards = [...root.querySelectorAll('.ai-card')];

  function update(t) {
    root.style.opacity = String(mapRange(t, 0, 0.1) * (1 - mapRange(t, 0.9, 1)));
    title.set(mapRange(t, 0.02, 0.25));
    dialogue.style.opacity = String(mapRange(t, 0.1, 0.16));
    typing[0].set(mapRange(t, 0.14, 0.4));
    typing[1].set(mapRange(t, 0.46, 0.73));
    questions[0].style.opacity = String(1 - mapRange(t, 0.41, 0.46));
    questions[1].style.opacity = String(mapRange(t, 0.45, 0.48));
    cards.forEach((el, i) => {
      const p = easeOutCubic(mapRange(t, 0.5 + i * 0.065, 0.63 + i * 0.065));
      el.style.opacity = String(p);
      el.style.transform = `translate3d(${(i % 2 ? 16 : -16) * (1 - p)}px, ${12 * (1 - p)}px, 0)`;
    });
  }
  update(0);
  return { update };
}
