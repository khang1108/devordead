import * as THREE from "three";
import { range, smooth } from "./util.js";

/**
 * Tờ giấy A4 tự gấp thành máy bay giấy (fold = 0 → phẳng, fold = 1 → máy bay).
 *
 * Không gian cục bộ của tờ giấy: x = chiều ngang, y = chiều dài (mũi máy bay hướng +y), z = pháp tuyến.
 * Gấp theo góc thật chứ không morph tuyến tính:
 *   1. nếp giữa (x = 0) gập lên tạo thân (keel) hình chữ V,
 *   2. nếp cánh (|x| = k) gập ngược ra ngoài thành hai cánh nằm ngang,
 *   3. đồng thời thu hẹp dần về phía mũi để ra dáng phi tiêu.
 * Mỗi vùng giữ nguyên chiều dài theo mặt cắt nên trông như giấy thật đang gấp.
 */
export function createPaperPlane({ cvTexture, offerTexture }) {
  const W = 2.0; // ngang
  const L = 2.828; // dài (tỉ lệ A4)
  const SX = 48, SY = 64;
  const geo = new THREE.PlaneGeometry(W, L, SX, SY);
  const pos = geo.attributes.position;
  const base = Float32Array.from(pos.array); // tọa độ phẳng ban đầu

  const material = new THREE.MeshStandardMaterial({
    map: cvTexture,
    side: THREE.DoubleSide,
    roughness: 0.92,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Đổi trục: cục bộ y (mũi) → thế giới +X, cục bộ z (lên) → thế giới +Y, cục bộ x → thế giới +Z
  const basis = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
  );
  mesh.quaternion.setFromRotationMatrix(basis);

  const group = new THREE.Group(); // rig: đặt vị trí/hướng bay ở đây
  group.add(mesh);

  const K0 = 0.34; // nửa bề rộng thân trên tờ giấy phẳng
  const HALF = W / 2;
  const DEG = Math.PI / 180;
  let lastFold = -1;

  function setFold(f) {
    if (Math.abs(f - lastFold) < 1e-4) return;
    lastFold = f;
    const a = smooth(range(f, 0.0, 0.55)); // nếp giữa
    const b = smooth(range(f, 0.42, 1.0)); // nếp cánh
    const c = smooth(range(f, 0.15, 0.9)); // thu hẹp về mũi
    const theta = a * 90 * DEG; // góc mỗi nửa thân so với phương ngang
    // Góc cánh so với phương ngang: ban đầu song song nửa thân, cuối cùng nằm ngang + nhị diện nhẹ
    const wingAng = theta * (1 - b) + b * 6 * DEG;
    const ct = Math.cos(theta), st = Math.sin(theta);
    const cw = Math.cos(wingAng), sw = Math.sin(wingAng);
    // Nâng tâm xoay để máy bay đã gấp cân giữa quanh gốc tọa độ
    const lift = -0.5 * K0 * a;

    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      // 0 = đuôi, 1 = mũi (clamp: sai số float có thể cho −1e-8 → pow() ra NaN)
      const u = Math.min(1, Math.max(0, (y + L / 2) / L));
      const sgn = x < 0 ? -1 : 1;
      const d = Math.abs(x);

      // thu hẹp theo chiều dài: thân giảm nhẹ, cánh giảm mạnh về mũi
      const k = K0 * (1 - 0.55 * c * u);
      const wingW = (HALF - K0) * (1 - c * Math.pow(u, 0.9) * 0.97);
      let px, pz;
      if (d <= K0) {
        const dd = (d / K0) * k;
        px = dd * ct;
        pz = dd * st;
      } else {
        const ww = ((d - K0) / (HALF - K0)) * wingW;
        px = k * ct + ww * cw;
        pz = k * st + ww * sw;
      }
      // tách hai lớp thân một chút để không z-fight
      px += 0.006 * a;
      pos.array[i * 3] = sgn * px;
      // mũi hơi kéo dài khi gấp để dáng thon hơn
      pos.array[i * 3 + 1] = y + c * u * u * 0.18;
      // đáy thân (nếp giữa) ở thấp nhất, cánh ở trên
      pos.array[i * 3 + 2] = pz + lift;
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
  }

  function useOffer(on) {
    const want = on ? offerTexture : cvTexture;
    if (material.map !== want) {
      material.map = want;
      material.needsUpdate = true;
    }
  }

  setFold(0);
  return { group, mesh, setFold, useOffer, size: { W, L } };
}
