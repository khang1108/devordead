import * as THREE from "three";

/** Mũ tốt nghiệp tối giản: bảng vuông + chỏm mũ + tua rua màu nhấn. */
export function createCap(pal) {
  const group = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: pal.ink, roughness: 0.7 });
  const accent = new THREE.MeshStandardMaterial({ color: pal.accent, roughness: 0.5 });

  const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 1.5), dark);
  board.position.y = 0.42;
  const skull = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.56, 0.4, 48, 1, true), dark);
  skull.position.y = 0.2;
  const skullTop = new THREE.Mesh(new THREE.CircleGeometry(0.52, 48), dark);
  skullTop.rotation.x = -Math.PI / 2;
  skullTop.position.y = 0.4;
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 24), accent);
  button.position.y = 0.47;

  // dây tua rua: từ nút giữa ra mép rồi rủ xuống
  const cordCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.47, 0),
    new THREE.Vector3(0.45, 0.47, 0.45),
    new THREE.Vector3(0.72, 0.44, 0.72),
    new THREE.Vector3(0.74, 0.2, 0.74),
  ]);
  const cord = new THREE.Mesh(new THREE.TubeGeometry(cordCurve, 32, 0.015, 8), accent);
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 16), accent);
  tassel.position.set(0.74, 0.1, 0.74);

  for (const m of [board, skull, skullTop, button, cord, tassel]) {
    m.castShadow = true;
    group.add(m);
  }
  return group;
}
