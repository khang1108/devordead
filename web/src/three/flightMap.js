import * as THREE from "three";
import { makeLabelTexture } from "./textures.js";

const V = (x, z) => new THREE.Vector3(x, 0, z);
let PAL; // bảng màu, đặt trong createFlightMap
const INCLUDES = /* glsl */ `
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
`;

const ribbonVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Đường băng: nền đen, vạch tim nét đứt, vạch mép liền, vạch ngưỡng kiểu "phím đàn".
const runwayFrag = /* glsl */ `
  uniform float uWipe;     // 0..1: phần đường băng đã hiện (quét từ trái sang)
  uniform float uLength;
  uniform float uThreshold; // vị trí (đơn vị thật) bắt đầu vạch ngưỡng
  uniform vec3 uColor;
  uniform vec3 uLine;
  varying vec2 vUv;
  void main() {
    if (vUv.x > uWipe) discard;
    vec3 col = uColor;
    float c = abs(vUv.y - 0.5);
    float along = vUv.x * uLength;
    float center = 1.0 - smoothstep(0.010, 0.015, c);
    col = mix(col, uLine, center * step(0.5, fract(along / 3.0)) * 0.9);
    float edge = smoothstep(0.43, 0.434, c) * (1.0 - smoothstep(0.444, 0.448, c));
    col = mix(col, uLine, edge * 0.85);
    float inThr = step(uThreshold, along) * step(along, uThreshold + 3.2);
    float keys = step(0.5, fract(vUv.y * 16.0)) * step(0.06, c) * step(c, 0.4);
    col = mix(col, uLine, inThr * keys * 0.9);
    gl_FragColor = vec4(col, 1.0);
    ${INCLUDES}
  }
`;

// Tuyến bay trên bản đồ: nét đứt mảnh; đoạn đã bay qua thành nét liền màu nhấn.
const routeFrag = /* glsl */ `
  uniform float uWipe;
  uniform float uProgress;
  uniform float uLength;
  uniform float uOpacity;
  uniform vec3 uInk;
  uniform vec3 uAccent;
  varying vec2 vUv;
  void main() {
    if (vUv.x > uWipe) discard;
    float dash = step(0.45, fract(vUv.x * uLength / 1.1));
    float done = step(vUv.x, uProgress);
    float a = mix(dash * 0.6, 1.0, done) * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(mix(uInk, uAccent, done), a);
    ${INCLUDES}
  }
`;

// Lưới chấm kiểu bản đồ, mờ dần ra rìa.
const gridVert = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const gridFrag = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uInk;
  uniform vec2 uCenter;
  uniform float uRadius;
  varying vec3 vW;
  void main() {
    vec2 g = fract(vW.xz / 1.6) - 0.5;
    float dotm = 1.0 - smoothstep(0.05, 0.08, length(g));
    float fade = 1.0 - smoothstep(uRadius * 0.55, uRadius, distance(vW.xz, uCenter));
    float a = dotm * fade * uOpacity * 0.22;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uInk, a);
    ${INCLUDES}
  }
`;

function ribbonGeometry(path, width, segments) {
  const pts = path.getSpacedPoints(segments);
  const up = new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3();
  const positions = [];
  const uvs = [];
  const index = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    side.subVectors(b, a).normalize().cross(up).multiplyScalar(width / 2);
    const p = pts[i];
    positions.push(p.x - side.x, 0, p.z - side.z, p.x + side.x, 0, p.z + side.z);
    const u = i / (pts.length - 1);
    uvs.push(u, 0, u, 1);
    if (i < pts.length - 1) {
      const k = i * 2;
      index.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  return geo;
}

function route(path, width = 0.32) {
  const mesh = new THREE.Mesh(
    ribbonGeometry(path, width, 400),
    new THREE.ShaderMaterial({
      vertexShader: ribbonVert,
      fragmentShader: routeFrag,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uWipe: { value: 0 },
        uProgress: { value: 0 },
        uLength: { value: path.getLength() },
        uOpacity: { value: 1 },
        uInk: { value: PAL.ink.clone() },
        uAccent: { value: PAL.brand.clone() },
      },
    }),
  );
  mesh.position.y = 0.02;
  return mesh;
}

function groundLabel(renderer, index, title, width) {
  const { texture, aspect } = makeLabelTexture(renderer, index, title);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width / aspect),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0 }),
  );
  mesh.rotation.x = -Math.PI / 2; // nằm trên đất, đỉnh chữ hướng −Z (phía trên màn hình khi nhìn từ trên)
  mesh.position.y = 0.03;
  return mesh;
}

/** Ký hiệu sân bay: vòng tròn + chấm, đổi sang màu nhấn khi máy bay đã đi qua. */
function hubMarker(size = 1) {
  const g = new THREE.Group();
  const ringMat = new THREE.MeshBasicMaterial({ color: PAL.ink, transparent: true, opacity: 0 });
  const fillMat = new THREE.MeshBasicMaterial({ color: PAL.surface, transparent: true, opacity: 0 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5 * size, 0.78 * size, 48), ringMat);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(0.5 * size, 48), fillMat);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.22 * size, 32), ringMat);
  for (const m of [ring, fill, dot]) m.rotation.x = -Math.PI / 2;
  fill.position.y = 0.035;
  ring.position.y = dot.position.y = 0.04;
  g.add(ring, fill, dot);
  return { group: g, ringMat, fillMat };
}

/**
 * Đường băng (cảnh gấp: máy bay cất cánh) + bản đồ chuyến bay (cảnh lộ trình):
 * 4 sân bay trung chuyển = 4 chặng kiến thức, rồi tỏa ra 4 điểm đến theo vị trí. Máy bay bay tới Backend.
 */
export function createFlightMap(renderer, pal) {
  PAL = pal;
  const group = new THREE.Group();

  // ——— đường băng: dọc +X, máy bay đứng ở x = 0..4 trong cảnh gấp ———
  const RW_START = -60, RW_END = 60;
  const runwayPath = new THREE.LineCurve3(V(RW_START, 0), V(RW_END, 0));
  const runway = new THREE.Mesh(
    ribbonGeometry(runwayPath, 9, 2),
    new THREE.ShaderMaterial({
      vertexShader: ribbonVert,
      fragmentShader: runwayFrag,
      side: THREE.DoubleSide,
      uniforms: {
        uWipe: { value: 0 },
        uLength: { value: RW_END - RW_START },
        uThreshold: { value: -8 - RW_START },
        uColor: { value: PAL.runway.clone() },
        uLine: { value: PAL.runwayLine.clone() },
      },
    }),
  );
  runway.position.y = 0.005;
  group.add(runway);

  // ——— bản đồ bay ———
  const hubs = [
    { p: V(16, 16), idx: "01", title: "Nền tảng" },
    { p: V(23, 26), idx: "02", title: "Cấu trúc dữ liệu" },
    { p: V(15, 36), idx: "03", title: "Thuật toán" },
    { p: V(20, 46), idx: "04", title: "System Design" },
  ];
  const fork = hubs[3].p;
  const routeCurve = new THREE.CatmullRomCurve3(
    [V(8, 0), V(14, 3), ...hubs.map((h) => h.p)],
    false,
    "centripetal",
  );
  const ends = [V(3, 74), V(13, 78), V(26, 78), V(37, 73)];
  const names = ["Frontend", "Backend", "Data", "Mobile"];
  const branches = ends.map(
    (e) => new THREE.QuadraticBezierCurve3(fork, V(fork.x + (e.x - fork.x) * 0.15, 62), e),
  );

  const mainRoute = route(routeCurve);
  group.add(mainRoute);
  const branchRoutes = branches.map((b) => {
    const m = route(b, 0.26);
    group.add(m);
    return m;
  });

  // lưới chấm bản đồ
  const gridMat = new THREE.ShaderMaterial({
    vertexShader: gridVert,
    fragmentShader: gridFrag,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uOpacity: { value: 0 },
      uInk: { value: PAL.ink.clone() },
      uCenter: { value: new THREE.Vector2(19, 44) },
      uRadius: { value: 48 },
    },
  });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(110, 110), gridMat);
  grid.rotation.x = -Math.PI / 2;
  grid.position.set(19, 0.003, 44);
  group.add(grid);

  // đường bay của máy bay: đường băng (tới x = 8) → tuyến chính → nhánh Backend
  const flight = new THREE.CurvePath();
  flight.add(new THREE.LineCurve3(V(RW_START, 0), V(8, 0)));
  flight.add(routeCurve);
  flight.add(branches[1]);
  const L0 = 8 - RW_START;
  const Lr = routeCurve.getLength();
  const Lb = branches[1].getLength();
  const total = L0 + Lr + Lb;

  // vị trí (0..1) của mỗi sân bay trên tuyến chính — lấy mẫu để tìm điểm gần nhất
  const samples = routeCurve.getSpacedPoints(800);
  const hubU = hubs.map((h) => {
    let best = 0, bestD = Infinity;
    samples.forEach((s, i) => {
      const d = s.distanceToSquared(h.p);
      if (d < bestD) (bestD = d), (best = i);
    });
    return best / 800;
  });

  const hubItems = hubs.map((h, i) => {
    const marker = hubMarker(1);
    marker.group.position.copy(h.p);
    const label = groundLabel(renderer, h.idx, h.title, 6.4);
    // nhãn đặt phía ngoài đường cong để không đè lên tuyến bay
    const side = i % 2 === 0 ? -1 : 1;
    label.position.set(h.p.x + side * 4.6, 0.03, h.p.z);
    group.add(marker.group, label);
    return { ...marker, label, at: (L0 + hubU[i] * Lr) / total, appear: hubU[i] };
  });

  const destItems = ends.map((e, i) => {
    const marker = hubMarker(0.8);
    marker.group.position.copy(e);
    const label = groundLabel(renderer, "→", names[i], 4.6);
    label.position.set(e.x, 0.03, e.z + 2.2);
    group.add(marker.group, label);
    return { ...marker, label, isTarget: i === 1 };
  });

  const ink = PAL.ink.clone();
  const accent = PAL.brand.clone(); // sân bay đã đi qua = màu tiến độ

  /**
   * runway: 0..1 phần đường băng đã hiện; map: 0..1 độ hiện của bản đồ (lưới, tuyến chính, sân bay);
   * branches: 0..1 độ hiện của 4 nhánh; travel: 0..1 vị trí máy bay trên `flight`.
   */
  function update({ runway: rw, map, branches: br, travel }) {
    runway.material.uniforms.uWipe.value = rw;
    gridMat.uniforms.uOpacity.value = map;

    const traveled = travel * total;
    mainRoute.material.uniforms.uWipe.value = map;
    mainRoute.material.uniforms.uProgress.value = Math.min(1, Math.max(0, (traveled - L0) / Lr));
    branchRoutes.forEach((m, i) => {
      m.material.uniforms.uWipe.value = br;
      m.material.uniforms.uProgress.value = i === 1 ? Math.max(0, (traveled - L0 - Lr) / Lb) : 0;
    });

    for (const h of hubItems) {
      const vis = Math.min(1, Math.max(0, (map - h.appear) * 6 + 0.4));
      h.ringMat.opacity = h.fillMat.opacity = vis;
      h.label.material.opacity = vis;
      const passed = travel >= h.at;
      h.ringMat.color.copy(passed ? accent : ink);
    }
    const arrived = travel >= 0.999;
    for (const d of destItems) {
      d.ringMat.opacity = d.fillMat.opacity = br;
      d.label.material.opacity = br;
      d.ringMat.color.copy(d.isTarget && arrived ? accent : ink);
    }
  }

  return { group, flight, update, runwayLength: L0, flightLength: total };
}
