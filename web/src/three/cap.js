import * as THREE from "three";

/**
 * Mũ tốt nghiệp điêu khắc tối giản (Matte Architectural Obsidian Mortarboard):
 * chất liệu vải mờ đen tuyền (#181B20), dây & tua rua lụa vàng đồng trầm (#B58952) không chói mắt.
 */
export function createCap(pal) {
  const group = new THREE.Group();

  const fabric = new THREE.MeshPhysicalMaterial({
    color: pal.capObsidian.clone(),
    roughness: 0.8,
    metalness: 0.02,
    sheen: 0.25,
    sheenColor: new THREE.Color(0x2a2e36),
    sheenRoughness: 0.72,
    side: THREE.DoubleSide,
  });

  const trim = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x111317),
    roughness: 0.65,
    metalness: 0.05,
  });

  const silk = new THREE.MeshPhysicalMaterial({
    color: pal.capCord.clone(),
    roughness: 0.54,
    metalness: 0.06,
    sheen: 0.45,
    sheenColor: new THREE.Color(0xe6d3b3),
    sheenRoughness: 0.55,
  });

  const claspMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x9e7a47),
    roughness: 0.38,
    metalness: 0.55,
  });

  const board = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.044, 1.52), fabric);
  board.position.y = 0.425;

  const boardTrim = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.016, 1.55), trim);
  boardTrim.position.y = 0.425;

  const skull = new THREE.Mesh(new THREE.CylinderGeometry(0.51, 0.555, 0.39, 48, 1, true), fabric);
  skull.position.y = 0.21;

  const skullTop = new THREE.Mesh(new THREE.CircleGeometry(0.51, 48), fabric);
  skullTop.rotation.x = -Math.PI / 2;
  skullTop.position.y = 0.405;

  const headband = new THREE.Mesh(new THREE.TorusGeometry(0.552, 0.014, 12, 48), trim);
  headband.rotation.x = Math.PI / 2;
  headband.position.y = 0.022;

  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.062, 0.03, 28), silk);
  button.position.y = 0.462;

  const topCordCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.462, 0),
    new THREE.Vector3(0.28, 0.458, 0.26),
    new THREE.Vector3(0.58, 0.452, 0.56),
    new THREE.Vector3(0.745, 0.436, 0.745),
  ]);
  const topCord = new THREE.Mesh(new THREE.TubeGeometry(topCordCurve, 28, 0.011, 10, false), silk);

  const tasselPivot = new THREE.Group();
  tasselPivot.position.set(0.745, 0.434, 0.745);

  const dropCordCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.02, -0.09, 0.02),
    new THREE.Vector3(0.024, -0.2, 0.024),
  ]);
  const dropCord = new THREE.Mesh(new THREE.TubeGeometry(dropCordCurve, 16, 0.011, 8, false), silk);

  const clasp = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.038, 20), claspMat);
  clasp.position.set(0.024, -0.212, 0.024);

  const tasselOuter = new THREE.Mesh(new THREE.ConeGeometry(0.056, 0.23, 24, 1, false), silk);
  tasselOuter.position.set(0.024, -0.335, 0.024);

  for (const m of [dropCord, clasp, tasselOuter]) {
    m.castShadow = true;
    tasselPivot.add(m);
  }

  for (const m of [board, boardTrim, skull, skullTop, headband, button, topCord]) {
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
  group.add(tasselPivot);

  group.setPose = (toss, drop, time = 0) => {
    const flare = Math.min(1.05, drop * 0.5 + toss * 1.1);
    const sway = Math.sin(time * 1.6) * 0.015 * (1 - Math.min(1, toss * 3));
    tasselPivot.rotation.set(-flare * 0.6 + sway, 0, flare * 0.6 - sway);
  };

  group.setPalette = (nextPal) => {
    fabric.color.copy(nextPal.capObsidian);
    silk.color.copy(nextPal.capCord);
  };

  return group;
}
