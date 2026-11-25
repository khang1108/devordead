import * as THREE from "three";
import { makeLabelTexture } from "./textures.js";

const V = (x, z) => new THREE.Vector3(x, 0, z);

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

// Đường băng kiến trúc tối giản: nền than mờ (#181B20), vạch kẻ trắng ngà mảnh chuẩn bản vẽ kỹ thuật, 0 đèn neon
const runwayFrag = /* glsl */ `
  uniform float uWipe;
  uniform float uLength;
  uniform float uThreshold;
  uniform vec3 uColor;
  uniform vec3 uShoulder;
  uniform vec3 uLine;
  varying vec2 vUv;

  void main() {
    if (vUv.x > uWipe) discard;
    float c = abs(vUv.y - 0.5);
    float along = vUv.x * uLength;

    vec3 col = mix(uColor, uShoulder, smoothstep(0.43, 0.44, c));

    // Vạch biên mảnh hai bên
    float edgeLine = smoothstep(0.418, 0.421, c) * (1.0 - smoothstep(0.428, 0.431, c));
    col = mix(col, uLine, edgeLine * 0.78);

    // Vạch tim đường nét đứt thanh mảnh
    float centerMask = 1.0 - smoothstep(0.007, 0.011, c);
    float centerDash = step(0.48, fract(along / 3.2));
    col = mix(col, uLine, centerMask * centerDash * 0.82);

    // Vạch ngưỡng đầu đường băng (Threshold)
    float inThr = step(uThreshold, along) * step(along, uThreshold + 3.0);
    float keys = step(0.5, fract(vUv.y * 16.0)) * step(0.06, c) * step(c, 0.38);
    col = mix(col, uLine, inThr * keys * 0.8);

    gl_FragColor = vec4(col, 1.0);
    ${INCLUDES}
  }
`;

// Tuyến bay nét vẽ kiến trúc trên giấy: đoạn chưa qua = nét đứt chì mờ; đoạn đã bay = nét mực liền sắc nét, không loang sáng neon
const routeFrag = /* glsl */ `
  uniform float uWipe;
  uniform float uProgress;
  uniform float uLength;
  uniform float uOpacity;
  uniform vec3 uGraphite;
  uniform vec3 uActive;
  varying vec2 vUv;

  void main() {
    if (vUv.x > uWipe) discard;

    float distY = abs(vUv.y - 0.5) * 2.0;
    float along = vUv.x * uLength;

    float strokeMask = 1.0 - smoothstep(0.55, 0.88, distY);
    float dash = step(0.46, fract(along / 1.1));
    float done = smoothstep(uProgress + 0.004, uProgress - 0.004, vUv.x) * step(0.001, uProgress);

    float alpha = mix(dash * 0.42, 0.92, done) * strokeMask * uOpacity;
    if (alpha < 0.01) discard;

    vec3 col = mix(uGraphite, uActive, done);
    gl_FragColor = vec4(col, alpha);
    ${INCLUDES}
  }
`;

// Lưới chấm bản vẽ kỹ thuật cực dịu trên nền giấy #FBFBF9 (giảm 55% độ tương phản, bỏ vòng radar màu)
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
    float dist = distance(vW.xz, uCenter);
    float fade = 1.0 - smoothstep(uRadius * 0.48, uRadius, dist);
    if (fade < 0.005) discard;

    vec2 gMinor = fract(vW.xz / 1.8) - 0.5;
    float dotMinor = 1.0 - smoothstep(0.036, 0.058, length(gMinor));

    float a = dotMinor * fade * uOpacity * 0.1;
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

/**
 * Bản vẽ lộ trình kiến trúc tối giản trên mặt giấy (Architectural Drafting Flight Map):
 * nét đứt chì mờ (#8A909E), nét hành trình sắc gọn (#111418 / #2484B5),
 * ghim trụ gốm mờ (cylindrical matte-ceramic pins) tại 4 trạm cốt lõi và 4 nhánh vị trí.
 */
export function createFlightMap(renderer, pal) {
  let PAL = pal;
  const group = new THREE.Group();

  const discGeo = new THREE.CylinderGeometry(0.58, 0.6, 0.06, 40);
  const pinGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 32);

  function route(path, width = 0.28) {
    const mesh = new THREE.Mesh(
      ribbonGeometry(path, width, 400),
      new THREE.ShaderMaterial({
        vertexShader: ribbonVert,
        fragmentShader: routeFrag,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        forceSinglePass: true,
        uniforms: {
          uWipe: { value: 0 },
          uProgress: { value: 0 },
          uLength: { value: path.getLength() },
          uOpacity: { value: 1 },
          uGraphite: { value: PAL.draftGraphite.clone() },
          uActive: { value: PAL.draftActive.clone() },
        },
      }),
    );
    mesh.position.y = 0.02;
    return mesh;
  }

  function groundLabel(index, title, width) {
    const { texture, aspect } = makeLabelTexture(renderer, index, title);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / aspect), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.03;
    return { mesh, index, title };
  }

  /** Ghim trụ gốm mờ tối giản (Minimal Cylindrical Ceramic Waypoint Pin). */
  function hubPin(size = 1) {
    const g = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({
      color: PAL.draftGraphite,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const discMat = new THREE.MeshStandardMaterial({
      color: PAL.surface,
      roughness: 0.85,
      metalness: 0.02,
      transparent: true,
      opacity: 0,
    });
    const pinMat = new THREE.MeshStandardMaterial({
      color: PAL.draftGraphite,
      roughness: 0.65,
      metalness: 0.05,
      transparent: true,
      opacity: 0,
    });

    const ring = new THREE.Mesh(new THREE.RingGeometry(0.62 * size, 0.72 * size, 48), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.036;

    const disc = new THREE.Mesh(discGeo, discMat);
    disc.scale.setScalar(size);
    disc.position.y = 0.03 * size;
    disc.castShadow = true;
    disc.receiveShadow = true;

    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.scale.setScalar(size);
    pin.position.y = 0.08 * size;
    pin.castShadow = true;

    g.add(ring, disc, pin);
    return { group: g, ringMat, discMat, pinMat };
  }

  // ——— Đường băng ———
  const RW_START = -60, RW_END = 60;
  const runwayPath = new THREE.LineCurve3(V(RW_START, 0), V(RW_END, 0));
  const runway = new THREE.Mesh(
    ribbonGeometry(runwayPath, 9.2, 2),
    new THREE.ShaderMaterial({
      vertexShader: ribbonVert,
      fragmentShader: runwayFrag,
      side: THREE.DoubleSide,
      uniforms: {
        uWipe: { value: 0 },
        uLength: { value: RW_END - RW_START },
        uThreshold: { value: -8 - RW_START },
        uColor: { value: PAL.runway.clone() },
        uShoulder: { value: PAL.runwayShoulder.clone() },
        uLine: { value: PAL.runwayLine.clone() },
      },
    }),
  );
  runway.position.y = 0.005;
  group.add(runway);

  // ——— Bản đồ 4 trạm cốt lõi & 4 nhánh nghề nghiệp ———
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

  const mainRoute = route(routeCurve, 0.28);
  group.add(mainRoute);
  const branchRoutes = branches.map((b) => {
    const m = route(b, 0.21);
    group.add(m);
    return m;
  });

  const gridMat = new THREE.ShaderMaterial({
    vertexShader: gridVert,
    fragmentShader: gridFrag,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uOpacity: { value: 0 },
      uInk: { value: PAL.ink.clone() },
      uCenter: { value: new THREE.Vector2(19, 44) },
      uRadius: { value: 50 },
    },
  });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(112, 112), gridMat);
  grid.rotation.x = -Math.PI / 2;
  grid.position.set(19, 0.003, 44);
  group.add(grid);

  const flight = new THREE.CurvePath();
  flight.add(new THREE.LineCurve3(V(RW_START, 0), V(8, 0)));
  flight.add(routeCurve);
  flight.add(branches[1]);
  const L0 = 8 - RW_START;
  const Lr = routeCurve.getLength();
  const Lb = branches[1].getLength();
  const total = L0 + Lr + Lb;

  const samples = routeCurve.getSpacedPoints(800);
  const hubU = hubs.map((h) => {
    let best = 0, bestD = Infinity;
    samples.forEach((s, i) => {
      const d = s.distanceToSquared(h.p);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best / 800;
  });

  const hubLabelOffsets = [
    [4.6, -0.7], // 01 Nền tảng: bên phải thoáng, lệch nhẹ -Z tránh đường cong đi xuống
    [4.6, 0.0],  // 02 Cấu trúc dữ liệu: bên phải đỉnh cong
    [4.6, 0.0],  // 03 Thuật toán: bên phải hõm cong, tránh hoàn toàn .roadmap-features bên trái & mép màn hình dọc
    [4.8, -0.6], // 04 System Design: bên phải trên điểm rẽ nhánh, tách biệt khỏi 4 tia phân nhánh
  ];
  const hubItems = hubs.map((h, i) => {
    const marker = hubPin(1.0);
    marker.group.position.copy(h.p);
    const labelObj = groundLabel(h.idx, h.title, 5.8);
    const [dx, dz] = hubLabelOffsets[i];
    labelObj.mesh.position.set(h.p.x + dx, 0.03, h.p.z + dz);
    group.add(marker.group, labelObj.mesh);
    return { ...marker, labelObj, label: labelObj.mesh, at: (L0 + hubU[i] * Lr) / total, appear: hubU[i] };
  });

  const destItems = ends.map((e, i) => {
    const isTarget = i === 1;
    const marker = hubPin(0.84);
    marker.group.position.copy(e);
    const labelObj = groundLabel(isTarget ? "05" : "→", names[i], 4.5);
    const clampX = i === 0 ? 1.1 : i === 3 ? -1.1 : 0;
    labelObj.mesh.position.set(e.x + clampX, 0.03, e.z + 2.25);
    group.add(marker.group, labelObj.mesh);
    return { ...marker, labelObj, label: labelObj.mesh, isTarget };
  });

  function updatePin(item, vis, active, activeCol) {
    item.ringMat.opacity = vis * (active ? 0.9 : 0.45);
    item.discMat.opacity = vis;
    item.pinMat.opacity = vis;
    item.label.material.opacity = vis;

    const col = active ? activeCol : PAL.draftGraphite;
    item.ringMat.color.copy(col);
    item.pinMat.color.copy(active ? activeCol : PAL.ink);
  }

  function update({ runway: rw, map, branches: br, travel }) {
    runway.material.uniforms.uWipe.value = rw;
    gridMat.uniforms.uOpacity.value = map;

    const traveled = travel * total;
    mainRoute.material.uniforms.uWipe.value = map;
    mainRoute.material.uniforms.uProgress.value = Math.min(1, Math.max(0, (traveled - L0) / Lr));

    branchRoutes.forEach((m, i) => {
      m.material.uniforms.uWipe.value = br;
      m.material.uniforms.uProgress.value = i === 1 ? Math.min(1, Math.max(0, (traveled - L0 - Lr) / Lb)) : 0;
    });

    for (const h of hubItems) {
      const vis = Math.min(1, Math.max(0, (map - h.appear) * 6 + 0.42));
      const passed = travel >= h.at - 0.004;
      updatePin(h, vis, passed, PAL.draftActive);
    }

    const arrived = travel >= 0.985;
    for (const d of destItems) {
      updatePin(d, br, d.isTarget && arrived, PAL.brand);
    }
  }

  function setPalette(nextPal) {
    PAL = nextPal;
    runway.material.uniforms.uColor.value.copy(PAL.runway);
    runway.material.uniforms.uShoulder.value.copy(PAL.runwayShoulder);
    runway.material.uniforms.uLine.value.copy(PAL.runwayLine);
    gridMat.uniforms.uInk.value.copy(PAL.ink);

    for (const rMesh of [mainRoute, ...branchRoutes]) {
      rMesh.material.uniforms.uGraphite.value.copy(PAL.draftGraphite);
      rMesh.material.uniforms.uActive.value.copy(PAL.draftActive);
    }

    for (const it of [...hubItems, ...destItems]) {
      it.discMat.color.copy(PAL.surface);
      const oldTex = it.label.material.map;
      const { texture } = makeLabelTexture(renderer, it.labelObj.index, it.labelObj.title);
      it.label.material.map = texture;
      it.label.material.needsUpdate = true;
      oldTex?.dispose();
    }
  }

  return { group, flight, update, setPalette, runwayLength: L0, flightLength: total };
}
