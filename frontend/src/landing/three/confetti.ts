import * as THREE from "three";
import { clamp, rng, smooth } from "./util";
import type { ConfettiAPI, PaletteConfig } from "../types";

interface ConfettiParticle {
  readonly v: THREE.Vector3;
  readonly spin: THREE.Vector3;
  readonly flutterFreq: number;
  readonly flutterAmp: number;
  readonly phase: number;
  readonly aspect: number;
  readonly delay: number;
}

/**
 * Pháo giấy mừng Offer (cảnh cuối):
 * Mọi vị trí & góc xoay chao liệng (aerodynamic paper flutter) là HÀM THUẦN của t ∈ [0,1]
 * để cuộn xuôi hay cuộn ngược đều khớp tuyệt đối từng khung hình.
 * Tuyệt đối không dùng sắc tím / lavender.
 */
export function createConfetti(
  pal: PaletteConfig,
  count = 220,
): ConfettiAPI {
  let PAL = pal;
  const r = rng(99);
  const geo = new THREE.PlaneGeometry(0.125, 0.22);
  const mat = new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide,
    roughness: 0.34,
    metalness: 0.14,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;

  const parts: ConfettiParticle[] = [];
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const up = 0.55 + r() * 0.95;
    const sp = 4.2 + r() * 6.4;
    parts.push({
      // Bay ra phía sau lá thư (+X, xa camera) và bung đều sang hai bên
      v: new THREE.Vector3(
        Math.abs(Math.cos(a)) * sp * 0.52 + 0.55,
        up * sp * 0.82,
        Math.sin(a) * sp * 0.78,
      ),
      spin: new THREE.Vector3(
        (r() - 0.5) * 14,
        (r() - 0.5) * 16,
        (r() - 0.5) * 14,
      ),
      flutterFreq: 3.2 + r() * 4.2,
      flutterAmp: 0.12 + r() * 0.26,
      phase: r() * Math.PI * 2,
      aspect: 0.7 + r() * 0.65,
      delay: r() * 0.16,
    });
    const col = PAL.confetti[i % PAL.confetti.length];
    if (col) mesh.setColorAt(i, col);
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const zero = new THREE.Vector3(0, 0, 0);

  /** t ∈ [0,1]: thời lượng bung pháo giấy (≈ 2.3 giây mô phỏng vật lý giấy bay). */
  function update(t: number): void {
    mesh.visible = t > 0.001;
    if (!mesh.visible) return;

    for (let i = 0; i < count; i++) {
      const pt = parts[i];
      if (!pt) continue;
      const tt = Math.max(0, t - pt.delay) * 2.3;
      if (tt <= 0) {
        m4.compose(zero, q.identity(), zero);
        mesh.setMatrixAt(i, m4);
        continue;
      }

      // Lực cản không khí + rơi lơ lửng tốc độ giới hạn + chao liệng lá giấy
      const drag = (1 - Math.exp(-1.65 * tt)) / 1.65;
      p.copy(pt.v).multiplyScalar(drag);
      p.y -= (1.42 * tt * tt) / (1 + 0.28 * tt);

      const flutterEnv = smooth(clamp(tt * 2.5, 0, 1));
      const swayX =
        Math.sin(tt * pt.flutterFreq + pt.phase) * pt.flutterAmp * flutterEnv;
      const swayZ =
        Math.cos(tt * pt.flutterFreq * 0.82 + pt.phase) *
        pt.flutterAmp *
        flutterEnv;
      p.x += swayX * 0.55;
      p.z += swayZ;

      e.set(
        pt.spin.x * tt + Math.sin(tt * pt.flutterFreq + pt.phase) * 0.65,
        pt.spin.y * tt,
        pt.spin.z * tt + Math.cos(tt * pt.flutterFreq + pt.phase) * 0.65,
      );
      q.setFromEuler(e);

      const pop = smooth(clamp(tt * 9, 0, 1));
      s.set(pop, pop * pt.aspect, pop);
      m4.compose(p, q, s);
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function setPalette(nextPal: PaletteConfig): void {
    PAL = nextPal;
    for (let i = 0; i < count; i++) {
      const col = PAL.confetti[i % PAL.confetti.length];
      if (col) mesh.setColorAt(i, col);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  return { mesh, update, setPalette };
}
