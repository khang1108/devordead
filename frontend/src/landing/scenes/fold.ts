import { createReveal, easeOutCubic, mapRange, queryEl } from "../fx/text";
import type { SceneModule } from "../types";

export default function createScene(root: HTMLElement): SceneModule {
  root.innerHTML = `
    <p class="scene-index scene-index--abs">02 · Sẵn sàng</p>
    <h2 class="fold-ghost">Sẵn sàng.</h2>
    <aside class="fold-note">
      <p class="scene-body">Biết code là một chuyện.<br>Vượt qua phỏng vấn là chuyện khác.</p>
      <p class="fold-sub">Nhà tuyển dụng không chỉ nhìn test case xanh — họ lắng nghe cách bạn phân tích độ phức tạp và bảo vệ thiết kế dưới áp lực thời gian.</p>
    </aside>
    <div class="fold-footer" aria-hidden="true">
      <div class="fold-footer-route">
        <span>Hồ sơ CV</span>
        <span class="fold-flight-line"><i class="fold-flight-dot"></i></span>
        <span>Thư mời nhận việc</span>
      </div>
      <span class="fold-telemetry">4 chặng luyện tập</span>
    </div>`;

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const heading = createReveal(queryEl(root, ".fold-ghost"), { type: "chars" });
  const noteCard = queryEl(root, ".fold-note");
  const noteText = createReveal(queryEl(root, ".scene-body"), { type: "blur" });
  const footer = queryEl(root, ".fold-footer");
  const dot = queryEl(root, ".fold-flight-dot");

  function update(t: number): void {
    root.style.opacity = String(mapRange(t, 0, 0.1) * (1 - mapRange(t, 0.9, 1)));
    heading.set(mapRange(t, 0.04, 0.65));

    const cardIn = easeOutCubic(mapRange(t, 0.06, 0.32));
    noteCard.style.opacity = String(cardIn);
    noteCard.style.transform =
      reducedMotion || cardIn > 0.995
        ? "none"
        : `translate3d(0, ${12 * (1 - cardIn)}px, 0)`;
    noteText.set(mapRange(t, 0.08, 0.36));

    const footIn = easeOutCubic(mapRange(t, 0.48, 0.72));
    footer.style.opacity = String(footIn);
    footer.style.transform =
      reducedMotion || footIn > 0.995
        ? "none"
        : `translate3d(0, ${10 * (1 - footIn)}px, 0)`;

    const travel = mapRange(t, 0.5, 0.92);
    dot.style.transform = reducedMotion
      ? "none"
      : `translate3d(${travel * 100}%, -50%, 0)`;
  }

  update(0);
  return { update };
}
