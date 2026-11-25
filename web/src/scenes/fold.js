import { createReveal, mapRange } from '../fx/text.js';

export default function createScene(root) {
  root.innerHTML = `
    <p class="scene-index">02 — SẴN SÀNG</p>
    <h2 class="fold-ghost">SẴN<br>SÀNG?</h2>
    <div class="fold-note">
      <span class="detail-rule" aria-hidden="true"></span>
      <p class="scene-body">Biết code là một chuyện.<br>Vượt qua phỏng vấn là chuyện khác.</p>
    </div>
    <div class="fold-footer" aria-hidden="true"><span>CV</span><span class="fold-flight-line"></span><span>↗</span><span>OFFER</span></div>`;

  const heading = createReveal(root.querySelector('.fold-ghost'), { type: 'chars' });
  const note = createReveal(root.querySelector('.scene-body'), { type: 'blur' });
  const footer = root.querySelector('.fold-footer');

  function update(t) {
    root.style.opacity = String(mapRange(t, 0, 0.1) * (1 - mapRange(t, 0.9, 1)));
    heading.set(mapRange(t, 0.04, 0.68));
    note.set(mapRange(t, 0.08, 0.36));
    footer.style.opacity = String(mapRange(t, 0.52, 0.72));
    footer.style.transform = `translate3d(0, ${12 * (1 - mapRange(t, 0.52, 0.72))}px, 0)`;
  }
  update(0);
  return { update };
}
