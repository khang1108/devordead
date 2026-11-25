import * as THREE from "three";
import { rng } from "./util.js";

/**
 * Pháo giấy: vị trí là hàm thuần của t (v·t + ½·g·t²) để cuộn ngược vẫn đúng.
 * Đây là khoảnh khắc DUY NHẤT trang có nhiều màu.
 */
export function createConfetti(pal, count = 180) {
  const r = rng(99);
  const colors = pal.confetti;
  const geo = new THREE.PlaneGeometry(0.12, 0.2);
  const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.6 });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const parts = [];
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const up = 0.5 + r() * 0.9;
    const sp = 4 + r() * 6;
    parts.push({
      // bay ra phía sau lá thư (+X, xa camera) và tỏa sang hai bên
      v: new THREE.Vector3(Math.abs(Math.cos(a)) * sp * 0.5 + 0.5, up * sp * 0.8, Math.sin(a) * sp * 0.7),
      spin: new THREE.Vector3(r() * 12, r() * 12, r() * 12),
      delay: r() * 0.15,
    });
    mesh.setColorAt(i, colors[i % colors.length]);
  }
  mesh.instanceColor.needsUpdate = true;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3(1, 1, 1);
  const zero = new THREE.Vector3(0, 0, 0);

  /** t ∈ [0,1] thời lượng nổ (≈ 2.2 giây mô phỏng). */
  function update(t) {
    mesh.visible = t > 0.001;
    if (!mesh.visible) return;
    parts.forEach((pt, i) => {
      const tt = Math.max(0, t - pt.delay) * 2.2;
      // lực cản không khí: vận tốc giảm dần, trọng lực nhẹ
      const drag = (1 - Math.exp(-1.6 * tt)) / 1.6;
      p.copy(pt.v).multiplyScalar(drag);
      p.y -= 1.6 * tt * tt;
      e.set(pt.spin.x * tt, pt.spin.y * tt, pt.spin.z * tt);
      q.setFromEuler(e);
      m4.compose(tt === 0 ? zero : p, q, tt === 0 ? zero : s);
      mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { mesh, update };
}
