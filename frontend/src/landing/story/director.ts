import { SCENES } from "./timeline";
import * as factories from "../scenes/index";
import type {
  DirectorAPI,
  SceneModule,
  SceneRegistry,
  SceneTiming,
  ThemeMode,
} from "../types";

interface DirectorItem extends SceneTiming {
  root: HTMLElement | null;
  api: SceneModule | null;
  active: boolean;
}

const sceneRegistry: SceneRegistry = factories;

/**
 * Điều phối lớp DOM: dựng module cho từng cảnh, bật/tắt .is-active,
 * chuyển html[data-theme="dark"|"light"], và gọi update(t) là hàm thuần của p ∈ [0,1].
 */
export function createDirector(overlay: HTMLElement | null): DirectorAPI {
  const items: DirectorItem[] = SCENES.map((s) => {
    const root =
      overlay?.querySelector<HTMLElement>(`.scene[data-scene="${s.key}"]`) ??
      null;
    const factory = sceneRegistry[s.key];
    let api: SceneModule | null = null;
    try {
      api = root && factory ? factory(root) : null;
    } catch (err) {
      console.error(`[director] cảnh "${s.key}" lỗi khi khởi tạo`, err);
    }
    return { ...s, root, api, active: false };
  });

  let lastP = -1;
  let currentP = 0;

  function apply(p: number, force = false): void {
    currentP = p;
    if (!force && Math.abs(p - lastP) < 1e-5) return;
    lastP = p;

    // Nền tối ở cảnh AI (khớp điểm chuyển màu bgTrack trong three/world.ts) → header & overlay đổi theme
    const theme: ThemeMode = p > 0.5 && p < 0.672 ? "dark" : "light";
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

  function update(p: number): void {
    apply(p, false);
  }

  function resize(): void {
    for (const it of items) it.api?.resize?.();
    apply(currentP, true);
  }

  return { update, resize };
}
