import { SCENES } from "./timeline.js";
import * as factories from "../scenes/index.js";

/**
 * Điều phối lớp DOM: dựng module cho từng cảnh, bật/tắt .is-active,
 * chuyển html[data-theme="dark"|"light"], và gọi update(t) là hàm thuần của p ∈ [0,1].
 */
export function createDirector(overlay) {
  const items = SCENES.map((s) => {
    const root = overlay?.querySelector(`.scene[data-scene="${s.key}"]`) ?? null;
    const factory = factories[s.key];
    let api = null;
    try {
      api = root && factory ? factory(root) : null;
    } catch (err) {
      console.error(`[director] cảnh "${s.key}" lỗi khi khởi tạo`, err);
    }
    return { ...s, root, api, active: false };
  });

  let lastP = -1;
  let currentP = 0;

  function apply(p, force = false) {
    currentP = p;
    if (!force && Math.abs(p - lastP) < 1e-5) return;
    lastP = p;

    // Nền tối ở cảnh AI (khớp điểm chuyển màu bgTrack trong three/world.js) → header & overlay đổi theme
    const theme = p > 0.5 && p < 0.672 ? "dark" : "light";
    if (document.documentElement.dataset.theme !== theme) {
      document.documentElement.dataset.theme = theme;
    }

    for (const it of items) {
      if (!it.root || !it.api) continue;
      const first = it.key === "hero";
      const last = it.key === "offer";
      const active = (p >= it.start || first) && (p <= it.end || last);
      if (active !== it.active) {
        it.active = active;
        it.root.classList.toggle("is-active", active);
      }
      if (active) {
        const t = Math.min(1, Math.max(0, (p - it.start) / (it.end - it.start)));
        it.api.update(t);
      }
    }
  }

  function update(p) {
    apply(p, false);
  }

  function resize() {
    for (const it of items) it.api?.resize?.();
    apply(currentP, true);
  }

  return { update, resize };
}
