import * as THREE from "three";
import type {
  PaletteConfig,
  WingTrailSampler,
  WingTrailsAPI,
} from "../types";

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const frag = /* glsl */ `
  uniform vec3 uColorHead;
  uniform vec3 uColorTail;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float crossProfile = pow(sin(vUv.y * 3.14159265), 1.6);
    float headIn = smoothstep(0.0, 0.06, vUv.x);
    float tailOut = pow(max(0.0, 1.0 - vUv.x), 2.4);
    float alpha = crossProfile * headIn * tailOut * uOpacity;
    if (alpha < 0.003) discard;
    vec3 col = mix(uColorHead, uColorTail, vUv.x);
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * Hai vệt không khí cực mảnh ở đầu mút cánh (Whisper-thin neutral aerodynamic contrails).
 * Hàm thuần của p, tiết chế trung tính không dùng dải màu chói.
 */
export function createWingTrails(
  pal: PaletteConfig,
  steps = 28,
): WingTrailsAPI {
  let currentPal = pal;
  const count = steps + 1;

  function makeRibbonGeo(): THREE.BufferGeometry {
    const positions = new Float32Array(count * 2 * 3);
    const uvs = new Float32Array(count * 2 * 2);
    const indices: number[] = [];
    for (let i = 0; i < count; i++) {
      const u = i / steps;
      uvs[i * 4] = u;
      uvs[i * 4 + 1] = 0;
      uvs[i * 4 + 2] = u;
      uvs[i * 4 + 3] = 1;
      if (i < steps) {
        const k = i * 2;
        indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return geo;
  }

  const uniforms = {
    uColorHead: { value: new THREE.Color(0xcbd5e1) },
    uColorTail: { value: new THREE.Color(0x94a3b8) },
    uOpacity: { value: 0 },
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    forceSinglePass: true,
  });

  const leftGeo = makeRibbonGeo();
  const rightGeo = makeRibbonGeo();
  const leftMesh = new THREE.Mesh(leftGeo, mat);
  const rightMesh = new THREE.Mesh(rightGeo, mat);
  leftMesh.frustumCulled = false;
  rightMesh.frustumCulled = false;
  leftMesh.renderOrder = 4;
  rightMesh.renderOrder = 4;

  const group = new THREE.Group();
  group.add(leftMesh, rightMesh);

  const leftPts = Array.from({ length: count }, () => new THREE.Vector3());
  const rightPts = Array.from({ length: count }, () => new THREE.Vector3());
  const tang = new THREE.Vector3();
  const view = new THREE.Vector3();
  const side = new THREE.Vector3();
  const fallbackUp = new THREE.Vector3(0, 1, 0);
  const dayHead = new THREE.Color(0x94a3b8);
  const dayTail = new THREE.Color(0xcbd5e1);

  function setPalette(nextPal: PaletteConfig): void {
    currentPal = nextPal;
  }

  function writeRibbon(
    geo: THREE.BufferGeometry,
    pts: readonly THREE.Vector3[],
    camPos: THREE.Vector3,
    baseHalfWidth: number,
  ): void {
    const posAttr = geo.getAttribute("position");
    if (!(posAttr instanceof THREE.BufferAttribute)) return;
    for (let i = 0; i < count; i++) {
      const p = pts[i];
      const prev = pts[Math.max(0, i - 1)];
      const next = pts[Math.min(steps, i + 1)];
      if (!p || !prev || !next) continue;

      tang.subVectors(prev, next);
      if (tang.lengthSq() < 1e-8) tang.set(1, 0, 0);
      else tang.normalize();

      view.subVectors(camPos, p);
      if (view.lengthSq() < 1e-8) view.set(0, 1, 0);
      else view.normalize();

      side.crossVectors(tang, view);
      if (side.lengthSq() < 1e-6) side.crossVectors(tang, fallbackUp);
      side.normalize();

      const u = i / steps;
      const hw = baseHalfWidth * (1 - 0.72 * u);
      posAttr.setXYZ(
        i * 2,
        p.x - side.x * hw,
        p.y - side.y * hw,
        p.z - side.z * hw,
      );
      posAttr.setXYZ(
        i * 2 + 1,
        p.x + side.x * hw,
        p.y + side.y * hw,
        p.z + side.z * hw,
      );
    }
    posAttr.needsUpdate = true;
  }

  function update(
    p: number,
    opacity: number,
    darkWeight: number,
    camPos: THREE.Vector3,
    sampleAt: WingTrailSampler,
    spanP = 0.024,
  ): void {
    group.visible = opacity > 0.005;
    if (!group.visible) return;

    const minP = 0.165;
    for (let i = 0; i < count; i++) {
      const ps = Math.max(minP, p - (i / steps) * spanP);
      const outL = leftPts[i];
      const outR = rightPts[i];
      if (outL && outR) sampleAt(ps, outL, outR);
    }

    writeRibbon(leftGeo, leftPts, camPos, 0.028);
    writeRibbon(rightGeo, rightPts, camPos, 0.028);

    uniforms.uColorHead.value
      .copy(dayHead)
      .lerp(currentPal.orbPearl, darkWeight * 0.85);
    uniforms.uColorTail.value
      .copy(dayTail)
      .lerp(currentPal.orbRing, darkWeight * 0.85);
    uniforms.uOpacity.value = opacity * (0.16 + 0.14 * darkWeight);
  }

  return { group, update, setPalette };
}
