import * as THREE from "three";
import { rng } from "./util.js";

/**
 * "Bức tường code": các thanh bo tròn giả lập token trong một file code khổng lồ (giống minimap editor).
 * Khi cuộn, từng dòng chuyển sang màu xanh "pass". Nằm trên mặt phẳng XY cục bộ, nhìn từ +Z.
 */
export function createCodeWall(pal) {
  const r = rng(42);
  const ROWS = 30;
  const rowGap = 0.62;
  const tokens = [];
  for (let row = 0; row < ROWS; row++) {
    const indent = [0, 1, 1, 2, 2, 3][Math.floor(r() * 6)] * 1.1;
    const n = row % 7 === 6 ? 0 : 1 + Math.floor(r() * 5); // thỉnh thoảng có dòng trống
    let x = indent;
    for (let i = 0; i < n; i++) {
      const w = 0.6 + r() * 2.6;
      tokens.push({ row, x: x + w / 2, w });
      x += w + 0.3;
    }
  }

  const geo = new THREE.BoxGeometry(1, 0.3, 0.12);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.6, transparent: true, opacity: 0.55 });
  const mesh = new THREE.InstancedMesh(geo, mat, tokens.length);
  const m4 = new THREE.Matrix4();
  const gray = pal.wallToken.clone();
  const dim = pal.wallDim.clone();
  const accent = pal.wallLit.clone();
  const width = 16;
  tokens.forEach((tk, i) => {
    m4.makeScale(tk.w, 1, 1);
    m4.setPosition(tk.x - width / 2, (ROWS / 2 - tk.row) * rowGap, 0);
    mesh.setMatrixAt(i, m4);
    mesh.setColorAt(i, i % 3 === 0 ? dim : gray);
  });
  mesh.instanceMatrix.needsUpdate = true;

  // con trỏ dòng hiện tại
  const caret = new THREE.Mesh(
    new THREE.BoxGeometry(width + 4, 0.5, 0.02),
    new THREE.MeshBasicMaterial({ color: pal.brand, transparent: true, opacity: 0.12 }),
  );
  caret.position.z = -0.1;

  const group = new THREE.Group();
  group.add(mesh, caret);

  let lastRow = -2;
  /** t ∈ [0,1]: tiến độ "chạy test" — các dòng chuyển xanh từ trên xuống. */
  function update(t) {
    const row = Math.floor(t * (ROWS + 1)) - 1;
    caret.position.y = (ROWS / 2 - Math.max(0, row)) * rowGap;
    caret.visible = t > 0.01 && t < 0.99;
    if (row === lastRow) return;
    lastRow = row;
    tokens.forEach((tk, i) => mesh.setColorAt(i, tk.row <= row ? accent : i % 3 === 0 ? dim : gray));
    mesh.instanceColor.needsUpdate = true;
  }
  return { group, update };
}
