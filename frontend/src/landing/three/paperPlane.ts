import * as THREE from "three";
import { range, smooth } from "./util";
import type {
  PaperPlaneAPI,
  PaperPlaneOptions,
  PaperPlaneTextures,
} from "../types";

interface CrossSection {
  a: number;
  b: number;
  c: number;
  w: number;
  ct: number;
  st: number;
  cw: number;
  sw: number;
  ctip: number;
  stip: number;
  lift: number;
}

/**
 * Tờ giấy A4 gấp thành máy bay giấy origami (fold = 0 → phẳng, fold = 1 → máy bay).
 * Chất liệu giấy mỹ thuật mờ (matte gallery paper) giữ độ trắng tinh khiết trên nền #FBFBF9
 * nhờ bù sáng emissiveMap tinh chỉnh theo ACESFilmicToneMapping.
 */
export function createPaperPlane({
  cvTexture,
  offerTexture,
}: PaperPlaneOptions): PaperPlaneAPI {
  let activeCvTexture = cvTexture;
  let activeOfferTexture = offerTexture;

  const W = 2.0;
  const L = 2.828;
  const SX = 64;
  const SY = 80;
  const geo = new THREE.PlaneGeometry(W, L, SX, SY);
  const posAttr = geo.getAttribute("position");
  if (!(posAttr instanceof THREE.BufferAttribute)) {
    throw new Error("Expected BufferAttribute for PlaneGeometry position");
  }
  const base = Float32Array.from(posAttr.array);

  const colors = new Float32Array(posAttr.count * 3);
  colors.fill(1);
  const colAttr = new THREE.BufferAttribute(colors, 3);
  geo.setAttribute("color", colAttr);

  const material = new THREE.MeshStandardMaterial({
    map: activeCvTexture,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: activeCvTexture,
    emissiveIntensity: 0.26,
    side: THREE.DoubleSide,
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.0,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const basis = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
  );
  mesh.quaternion.setFromRotationMatrix(basis);

  const group = new THREE.Group();
  group.add(mesh);

  const HALF = W / 2;
  const K0 = 11 * (W / SX);
  const WLET = 29 * (W / SX);
  const DEG = Math.PI / 180;

  let lastFold = -1;
  let lastFlutter = -999;

  function computeCrossSection(f: number, flutter = 0): CrossSection {
    const a = smooth(range(f, 0.0, 0.55));
    const b = smooth(range(f, 0.4, 1.0));
    const c = smooth(range(f, 0.14, 0.92));
    const w = smooth(range(f, 0.7, 1.0));
    const theta = a * 88 * DEG;
    const wingAng = theta * (1 - b) + b * (6.0 * DEG + flutter);
    const tipAng = wingAng + w * 20 * DEG;
    return {
      a,
      b,
      c,
      w,
      ct: Math.cos(theta),
      st: Math.sin(theta),
      cw: Math.cos(wingAng),
      sw: Math.sin(wingAng),
      ctip: Math.cos(tipAng),
      stip: Math.sin(tipAng),
      lift: -0.5 * K0 * a,
    };
  }

  function setFold(f: number, flutter = 0): void {
    if (
      Math.abs(f - lastFold) < 1e-4 &&
      Math.abs(flutter - lastFlutter) < 2e-4
    ) {
      return;
    }
    lastFold = f;
    lastFlutter = flutter;

    const cs = computeCrossSection(f, flutter);
    const { a, b, c, ct, st, cw, sw, ctip, stip, lift } = cs;

    for (let i = 0; i < posAttr.count; i++) {
      const x = base[i * 3] ?? 0;
      const y = base[i * 3 + 1] ?? 0;
      const u = Math.min(1, Math.max(0, (y + L / 2) / L));
      const sgn = x < 0 ? -1 : 1;
      const d = Math.abs(x);

      const k = K0 * (1 - 0.56 * c * u);
      const taper = 1 - c * Math.pow(u, 0.9) * 0.97;
      const mainSpan = (WLET - K0) * taper;
      const tipSpan = (HALF - WLET) * taper;

      let px: number;
      let pz: number;
      if (d <= K0) {
        const dd = (d / K0) * k;
        px = dd * ct;
        pz = dd * st;
      } else if (d <= WLET) {
        const ww = ((d - K0) / (WLET - K0)) * mainSpan;
        px = k * ct + ww * cw;
        pz = k * st + ww * sw;
      } else {
        const tw = ((d - WLET) / (HALF - WLET)) * tipSpan;
        px = k * ct + mainSpan * cw + tw * ctip;
        pz = k * st + mainSpan * sw + tw * stip;
      }

      px += 0.006 * a;
      posAttr.setXYZ(i, sgn * px, y + c * u * u * 0.19, pz + lift);

      const keelAO = 1 - a * 0.13 * Math.pow(Math.max(0, 1 - d / K0), 1.8);
      const ridgeLift =
        1 + b * 0.025 * Math.exp(-Math.pow((d - K0) / 0.045, 2));
      const shade = keelAO * ridgeLift;
      colors[i * 3] = shade;
      colors[i * 3 + 1] = shade;
      colors[i * 3 + 2] = shade;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
  }

  function getWingTipOffsets(
    f: number,
    outLeft: THREE.Vector3,
    outRight: THREE.Vector3,
  ): void {
    const cs = computeCrossSection(f, 0);
    const px =
      K0 * cs.ct + (WLET - K0) * cs.cw + (HALF - WLET) * cs.ctip + 0.006 * cs.a;
    const pz =
      K0 * cs.st + (WLET - K0) * cs.sw + (HALF - WLET) * cs.stip + cs.lift;
    const py = -L / 2 + 0.04;
    outRight.set(py, pz, px);
    outLeft.set(py, pz, -px);
  }

  function useOffer(on: boolean): void {
    const want = on ? activeOfferTexture : activeCvTexture;
    if (material.map !== want) {
      material.map = want;
      material.emissiveMap = want;
      material.needsUpdate = true;
    }
  }

  function setPaperLift(amount: number): void {
    material.emissiveIntensity = amount;
  }

  function setTextures({ cv, offer }: PaperPlaneTextures, isOffer: boolean): void {
    activeCvTexture = cv;
    activeOfferTexture = offer;
    const want = isOffer ? activeOfferTexture : activeCvTexture;
    material.map = want;
    material.emissiveMap = want;
    material.needsUpdate = true;
  }

  setFold(0, 0);
  return {
    group,
    mesh,
    material,
    setFold,
    getWingTipOffsets,
    useOffer,
    setPaperLift,
    setTextures,
    size: { W, L },
  };
}
