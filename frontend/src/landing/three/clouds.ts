import * as THREE from "three";
import { makeCloudTexture } from "./textures";
import { rng } from "./util";
import type { CloudsAPI, CloudsOptions } from "../types";

interface CloudMaterialEntry {
  readonly mat: THREE.SpriteMaterial;
  readonly tier: number;
}

interface CloudSpriteEntry {
  readonly sprite: THREE.Sprite;
  readonly baseY: number;
  readonly baseZ: number;
  readonly phase: number;
  readonly drift: number;
}

/**
 * Biển mây đa tầng thể tích (Volumetric-feel multi-layered cloud banks):
 * - Tầng mây nền thấp trải rộng chân trời,
 * - Hai dải mây cumulus dày hai bên hành lang bay lên (chừa thoáng trục giữa cho máy bay + vệt cánh),
 * - Tầng mây cao đón nắng phía đỉnh bầu trời.
 * Dùng chung 8 SpriteMaterial (4 texture × 2 lớp độ mờ) để tối ưu state switch, `toneMapped: false` giữ sắc mây trắng sáng tinh khôi.
 */
export function createClouds(
  renderer: THREE.WebGLRenderer,
  { center, spanZ = 48, count = 84 }: CloudsOptions,
): CloudsAPI {
  const group = new THREE.Group();
  const textures = [
    makeCloudTexture(renderer, 3),
    makeCloudTexture(renderer, 9),
    makeCloudTexture(renderer, 17),
    makeCloudTexture(renderer, 29),
  ] as const;

  const materials: CloudMaterialEntry[] = [];
  for (const tex of textures) {
    for (const tier of [0.88, 0.58]) {
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        opacity: 0,
      });
      materials.push({ mat, tier });
    }
  }

  const r = rng(23);
  const sprites: CloudSpriteEntry[] = [];

  for (let i = 0; i < count; i++) {
    const layer = i % 3; // 0 = thảm mây thấp, 1 = khối cumulus trung tầng, 2 = mây cao đón sáng
    const matIdx = (i % textures.length) * 2 + (layer === 1 ? 0 : 1);
    const matEntry = materials[matIdx];
    if (!matEntry) continue;
    const s = new THREE.Sprite(matEntry.mat);

    let scale: number;
    let px: number;
    let py: number;
    let pz: number;
    if (layer === 0) {
      scale = 16 + r() * 18;
      px = center.x + 6 + r() * 34;
      py = center.y - 10 + r() * 7;
      pz = center.z + (r() - 0.5) * (spanZ * 1.15);
    } else if (layer === 1) {
      scale = 11 + r() * 15;
      // Tách sang hai sườn hành lang Z hoặc lùi sâu +X phía sau máy bay
      const flank = r() < 0.5 ? -1 : 1;
      px = center.x + 4.5 + r() * 26;
      py = center.y + (r() - 0.45) * 16;
      pz = center.z + flank * (5 + r() * (spanZ * 0.48));
    } else {
      scale = 13 + r() * 17;
      px = center.x + 8 + r() * 32;
      py = center.y + 5 + r() * 13;
      pz = center.z + (r() - 0.5) * spanZ;
    }

    s.scale.set(scale, scale * (0.56 + r() * 0.14), 1);
    s.position.set(px, py, pz);
    const phase = r() * Math.PI * 2;
    const drift = 0.2 + r() * 0.35;
    group.add(s);
    sprites.push({ sprite: s, baseY: py, baseZ: pz, phase, drift });
  }

  function update(visible: number, time = 0): void {
    group.visible = visible > 0.001;
    if (!group.visible) return;
    for (const entry of materials) {
      entry.mat.opacity = entry.tier * visible;
    }
    for (const item of sprites) {
      item.sprite.position.z =
        item.baseZ + Math.sin(time * 0.22 + item.phase) * item.drift;
      item.sprite.position.y =
        item.baseY + Math.cos(time * 0.18 + item.phase) * (item.drift * 0.4);
    }
  }

  return { group, update };
}
