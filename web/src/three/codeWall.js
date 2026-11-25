import * as THREE from "three";
import { clamp, range, rng, smooth } from "./util.js";

/**
 * Tấm điêu khắc kiến trúc Gốm mờ & Nhôm Anodized tối giản (Matte Ceramic & Anodized Plate — cảnh Luyện code):
 * - Thu gọn thanh lịch ở hành lang trung tâm (chừa thoáng 100% khoảng âm bên trái cho tiêu đề & số liệu,
 *   và bên phải cho khung code editor),
 * - Các gờ nổi token đơn sắc (#D8DDE5 / #E6E9EF) chuyển êm sang xanh lục trầm (#16794C) theo t,
 * - Loại bỏ hoàn toàn 3 bia xám khổng lồ, gạch xanh neon và tia laser ngang.
 */
export function createCodeWall(pal) {
  let PAL = pal;
  const r = rng(42);
  const group = new THREE.Group();

  const W = 8.2;
  const H = 10.4;

  // Tấm nền nhôm mờ phía sau (anodized aluminum backing frame)
  const backMat = new THREE.MeshStandardMaterial({
    color: PAL.ceramicBack.clone(),
    roughness: 0.78,
    metalness: 0.06,
  });
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, H + 0.5, 0.18), backMat);
  backPlate.position.set(0, 0, -0.2);
  backPlate.receiveShadow = true;

  // Tấm mặt gốm trắng mờ (matte ceramic architectural tablet)
  const frontMat = new THREE.MeshStandardMaterial({
    color: PAL.ceramicPlate.clone(),
    roughness: 0.86,
    metalness: 0.02,
    emissive: PAL.ceramicPlate.clone(),
    emissiveIntensity: PAL.darkTheme ? 0.02 : 0.14,
  });
  const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.22), frontMat);
  frontPlate.castShadow = true;
  frontPlate.receiveShadow = true;

  // Chỉ mảnh phân cách phần thân mã và dải 6 ô test phía dưới
  const ruleMat = new THREE.MeshBasicMaterial({
    color: PAL.ceramicEdge.clone(),
    toneMapped: false,
  });
  const ruleLine = new THREE.Mesh(new THREE.BoxGeometry(W - 1.3, 0.025, 0.02), ruleMat);
  ruleLine.position.set(0, -H / 2 + 1.45, 0.12);

  group.add(backPlate, frontPlate, ruleLine);

  // ——— Các thanh gờ nổi Token mã nguồn đơn sắc tinh tế ———
  const ROWS = 15;
  const rowGap = 0.48;
  const padX = 0.85;
  const usableW = W - padX * 2;
  const topY = H / 2 - 0.95;
  const tokens = [];

  for (let row = 0; row < ROWS; row++) {
    if (row === 5 || row === 11) continue; // khoảng nghỉ đoạn code tự nhiên
    const indents = [0, 0.55, 0.55, 1.1, 1.1, 1.65];
    const indent = indents[Math.floor(r() * indents.length)];
    const count = 1 + Math.floor(r() * 3);
    let cursor = indent;
    for (let k = 0; k < count; k++) {
      const w = 0.55 + r() * 1.65;
      if (cursor + w > usableW) break;
      tokens.push({
        row,
        x: -W / 2 + padX + cursor + w / 2,
        y: topY - row * rowGap,
        w,
        subtle: (row + k) % 3 === 0,
      });
      cursor += w + 0.24;
    }
  }

  const tokenGeo = new THREE.BoxGeometry(1, 0.16, 0.07);
  const tokenMat = new THREE.MeshStandardMaterial({
    roughness: 0.72,
    metalness: 0.02,
  });
  const tokenMesh = new THREE.InstancedMesh(tokenGeo, tokenMat, tokens.length);

  const m4 = new THREE.Matrix4();
  const qId = new THREE.Quaternion();
  const vPos = new THREE.Vector3();
  const vScale = new THREE.Vector3();

  tokens.forEach((tk, i) => {
    vPos.set(tk.x, tk.y, 0.13);
    vScale.set(tk.w, 1, 1);
    m4.compose(vPos, qId, vScale);
    tokenMesh.setMatrixAt(i, m4);
    tokenMesh.setColorAt(i, tk.subtle ? PAL.wallDim : PAL.wallToken);
  });
  tokenMesh.instanceMatrix.needsUpdate = true;
  tokenMesh.instanceColor.needsUpdate = true;
  group.add(tokenMesh);

  // ——— 6 ô trạng thái Test-Case phẳng tối giản ở cạnh đáy tấm gốm ———
  const TEST_COUNT = 6;
  const tileGap = (W - 1.3) / TEST_COUNT;
  const tileGeo = new THREE.BoxGeometry(tileGap - 0.18, 0.24, 0.06);
  const tileMat = new THREE.MeshStandardMaterial({
    roughness: 0.68,
    metalness: 0.02,
  });
  const tileMesh = new THREE.InstancedMesh(tileGeo, tileMat, TEST_COUNT);

  const tileY = -H / 2 + 0.82;
  for (let i = 0; i < TEST_COUNT; i++) {
    const tx = -((TEST_COUNT - 1) / 2) * tileGap + i * tileGap;
    vPos.set(tx, tileY, 0.13);
    vScale.set(1, 1, 1);
    m4.compose(vPos, qId, vScale);
    tileMesh.setMatrixAt(i, m4);
    tileMesh.setColorAt(i, PAL.wallDim);
  }
  tileMesh.instanceMatrix.needsUpdate = true;
  tileMesh.instanceColor.needsUpdate = true;
  group.add(tileMesh);

  const cIdle = new THREE.Color();
  const cDim = new THREE.Color();
  const cPass = new THREE.Color();
  const cPassSoft = new THREE.Color();
  const tmpCol = new THREE.Color();

  function syncColors() {
    cIdle.copy(PAL.wallToken);
    cDim.copy(PAL.wallDim);
    cPass.copy(PAL.wallLit);
    cPassSoft.copy(PAL.wallLit).lerp(PAL.wallToken, 0.35);
  }
  syncColors();

  let lastT = -1;

  /** t ∈ [0,1]: hàm thuần theo tiến độ kiểm thử. */
  function update(t) {
    if (Math.abs(t - lastT) < 5e-4) return;
    lastT = t;

    const progressRow = t * (ROWS + 1) - 0.5;
    for (let i = 0; i < tokens.length; i++) {
      const tk = tokens[i];
      const passed = smooth(clamp(progressRow - tk.row + 0.5, 0, 1));
      const base = tk.subtle ? cDim : cIdle;
      const done = tk.subtle ? cPassSoft : cPass;
      tmpCol.copy(base).lerp(done, passed);
      tokenMesh.setColorAt(i, tmpCol);
    }
    tokenMesh.instanceColor.needsUpdate = true;

    for (let i = 0; i < TEST_COUNT; i++) {
      const thr = 0.2 + (i / TEST_COUNT) * 0.68;
      const passW = smooth(range(t, thr - 0.05, thr + 0.05));
      tmpCol.copy(cDim).lerp(cPass, passW);
      tileMesh.setColorAt(i, tmpCol);
    }
    tileMesh.instanceColor.needsUpdate = true;
  }

  function setPalette(nextPal) {
    PAL = nextPal;
    backMat.color.copy(PAL.ceramicBack);
    frontMat.color.copy(PAL.ceramicPlate);
    frontMat.emissive.copy(PAL.ceramicPlate);
    frontMat.emissiveIntensity = PAL.darkTheme ? 0.02 : 0.14;
    ruleMat.color.copy(PAL.ceramicEdge);
    syncColors();
    const prev = lastT;
    lastT = -1;
    if (prev >= 0) update(prev);
  }

  return { group, update, setPalette };
}
