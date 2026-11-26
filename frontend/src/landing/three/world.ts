import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { localT } from "../story/timeline";
import {
  clamp,
  lerp,
  range,
  smooth,
  easeInOut,
  easeOut,
  track,
} from "./util";
import {
  makeCVTexture,
  makeOfferTexture,
  setTexturePalette,
} from "./textures";
import { readPalette } from "./palette";
import { createPaperPlane } from "./paperPlane";
import { createWingTrails } from "./wingTrails";
import { createCap } from "./cap";
import { createFlightMap } from "./flightMap";
import { createCodeWall } from "./codeWall";
import { createOrb } from "./orb";
import { createClouds } from "./clouds";
import { createConfetti } from "./confetti";
import type {
  PaletteConfig,
  RGBTuple,
  SceneKey,
  WorldAPI,
  WorldOptions,
} from "../types";

const FLY_Y = 2.6;
const ORB = new THREE.Vector3(13, 4, 128);
const ORBIT_R = 4.8;
const AI_EXIT_START = new THREE.Vector3(13, 4, 134);
const HR_START = new THREE.Vector3(13, 4, 142);
const HR_END = new THREE.Vector3(13, 4.5, 168);
const SKY = new THREE.Vector3(13, 34, 196);
const OFFER = new THREE.Vector3(13, 35, 202);

/**
 * Thế giới điêu khắc 3D Studio phía sau lớp DOM (Round 2 Anti-Slop Overhaul).
 * Mọi biến đổi không gian là hàm thuần xác định của tiến độ cuộn p ∈ [0,1].
 */
export function createWorld(
  canvas: HTMLCanvasElement,
  { reducedMotion = false }: WorldOptions = {},
): WorldAPI {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();

  // Phản xạ Studio mờ tự nhiên (Procedural IBL qua PMREMGenerator + RoomEnvironment)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTarget = pmrem.fromScene(roomEnv, 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.24;
  roomEnv.dispose();
  pmrem.dispose();

  let pal = readPalette();
  setTexturePalette(pal.css);

  const bg = pal.bg.clone();
  scene.background = bg;
  const fog = new THREE.Fog(bg, 45, 150);
  scene.fog = fog;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 400);

  // ——— Ánh sáng Studio Gallery dịu ấm, không gắt, không shadow acne ———
  const hemi = new THREE.HemisphereLight(pal.hemiSky, pal.hemiGround, 1.72);
  scene.add(hemi);

  const sunDayCol = new THREE.Color(0xfffdf9);
  const sun = new THREE.DirectionalLight(sunDayCol, 2.55);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -6.5,
    right: 6.5,
    top: 6.5,
    bottom: -6.5,
    near: 1.5,
    far: 34,
  });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.018;
  sun.shadow.radius = 4.2;
  scene.add(sun, sun.target);

  const rim = new THREE.DirectionalLight(pal.rimDay, 0.52);
  scene.add(rim, rim.target);

  // Đèn tán xạ dịu từ quả cầu ngọc trai chiếu lên cánh máy bay trong cảnh AI
  const aiLight = new THREE.PointLight(pal.orbPearl, 0, 24, 1.8);
  aiLight.position.copy(ORB);
  scene.add(aiLight);

  // ——— Mặt nền Gallery: toneMapped: false khớp tuyệt đối 100% với CSS --bg (#FBFBF9) ———
  const groundColor = new THREE.MeshBasicMaterial({
    color: bg.clone(),
    toneMapped: false,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), groundColor);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.01, 100);

  const shadowCatcherMat = new THREE.ShadowMaterial({
    opacity: pal.shadowOpacity,
    color: pal.shadow.clone(),
  });
  const shadowCatcher = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800),
    shadowCatcherMat,
  );
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.set(0, 0.008, 100);
  shadowCatcher.receiveShadow = true;
  scene.add(ground, shadowCatcher);

  // ——— Các tác phẩm điêu khắc 3D ———
  let cvTex = makeCVTexture(renderer);
  let offerTex = makeOfferTexture(renderer);
  const plane = createPaperPlane({ cvTexture: cvTex, offerTexture: offerTex });
  scene.add(plane.group);

  const wingTrails = createWingTrails(pal, 28);
  scene.add(wingTrails.group);

  const cap = createCap(pal);
  scene.add(cap);

  const road = createFlightMap(renderer, pal);
  scene.add(road.group);

  const codeWall = createCodeWall(pal);
  codeWall.group.rotation.y = -Math.PI / 2;
  scene.add(codeWall.group);

  const orb = createOrb(pal);
  orb.group.position.copy(ORB);
  scene.add(orb.group);

  const clouds = createClouds(renderer, {
    center: new THREE.Vector3(13, 18, 184),
    spanZ: 46,
  });
  scene.add(clouds.group);

  const confetti = createConfetti(pal);
  confetti.mesh.position.copy(OFFER).add(new THREE.Vector3(2.2, 0.6, 0.4));
  scene.add(confetti.mesh);

  const travelStart = (road.runwayLength - 4) / road.flightLength;
  const vApproach = new THREE.Vector3();
  const vOrbit = new THREE.Vector3();
  const vExit = new THREE.Vector3();

  function planePos(p: number, out: THREE.Vector3): THREE.Vector3 {
    if (p < localStart("fold")) return out.set(0, 0.012, 0);
    if (p < localStart("roadmap")) {
      const t = localT(p, "fold");
      const rise = easeInOut(range(t, 0.15, 0.8));
      const fwdX = easeInOut(range(t, 0.55, 1)) * 4;
      return out.set(fwdX, lerp(0.012, FLY_Y, rise), 0);
    }
    if (p < localStart("code")) {
      const t = localT(p, "roadmap");
      const u = lerp(travelStart, 1, smooth(t) * 0.85 + t * 0.15);
      road.flight.getPointAt(clamp(u, 0, 1), out);
      return out.setY(FLY_Y);
    }
    if (p < localStart("ai")) {
      const t = localT(p, "code");
      return out.set(13, lerp(FLY_Y, 3.4, t), lerp(78, 104, t));
    }
    if (p < localStart("hr")) {
      const t = localT(p, "ai");
      vApproach.set(
        13,
        lerp(3.4, 4, range(t, 0, 0.2)),
        lerp(104, 122, range(t, 0, 0.2)),
      );
      const phi = -Math.PI / 2 + (t - 0.12) * Math.PI * 2 * 1.5;
      vOrbit.set(
        ORB.x + ORBIT_R * Math.cos(phi),
        ORB.y + 0.3 * ORBIT_R * Math.sin(phi),
        ORB.z + ORBIT_R * Math.sin(phi),
      );
      const wIn = smooth(range(t, 0.04, 0.2));
      out.lerpVectors(vApproach, vOrbit, wIn);
      const wOut = smooth(range(t, 0.86, 1));
      if (wOut > 0) {
        vExit.lerpVectors(AI_EXIT_START, HR_START, range(t, 0.86, 1));
        out.lerp(vExit, wOut);
      }
      return out;
    }
    if (p < localStart("clouds")) {
      const t = localT(p, "hr");
      return out.lerpVectors(HR_START, HR_END, t);
    }
    if (p < localStart("offer")) {
      const t = localT(p, "clouds");
      out.lerpVectors(HR_END, SKY, t);
      out.y = lerp(HR_END.y, SKY.y, easeInOut(t));
      return out;
    }
    const t = localT(p, "offer");
    return out.lerpVectors(SKY, OFFER, easeOut(range(t, 0, 0.45)));
  }

  const camOffset = track([
    [0.0, [-3.3, 7.4, 4.4]],
    [0.074, [-2.8, 6.4, 4.1]],
    [0.13, [-0.8, 3.2, 7.0]],
    [0.185, [0, 1.1, 10]],
    [0.198, [0, 26, 3]],
    [0.225, [0, 38, 0.01]],
    [0.3, [0, 38, 0.01]],
    [0.333, [0, 48, 0.01]],
    [0.375, [-13, 1.4, 0]],
    [0.481, [-12, 1.2, 1]],
    [0.53, [0, 1.6, -19]],
    [0.6, [0, 1.6, -19]],
    [0.65, [0, 3.2, -25]],
    [0.667, [0, 3.2, -25]],
    [0.705, [-16, 1.5, 0]],
    [0.778, [-16, 1.5, 0]],
    [0.81, [-9, -1.2, -2]],
    [0.889, [-9, -1.2, -2]],
    [0.94, [-10.5, 0, 0]],
    [1.0, [-9.8, 0.1, 0.3]],
  ]);
  const camTarget = track([
    [0.0, [0.3, 0, 0.25]],
    [0.074, [0.3, 0.3, 0.2]],
    [0.185, [0.6, -0.1, 0]],
    [0.2, [2, 0, -5]],
    [0.235, [0, 0, 4]],
    [0.3, [0, 0, 4]],
    [0.333, [0, 0, 2]],
    [0.375, [0, 0.3, 0]],
    [0.53, [0, 1.3, 0]],
    [0.65, [0, 0.4, 0]],
    [0.667, [0, 0.4, 0]],
    [0.705, [0, -2.4, 0]],
    [0.778, [0, -2.4, 0]],
    [0.81, [0, 0.6, 2]],
    [0.94, [0, 0, 0]],
    [1.0, [0, 0, 0]],
  ]);
  const camUp = track([
    [0.185, [0, 1, 0]],
    [0.225, [0, 0, -1]],
    [0.333, [0, 0, -1]],
    [0.375, [0, 1, 0]],
  ]);
  const camShift = track([
    [0.0, [0.24]],
    [0.074, [0.24]],
    [0.16, [0]],
    [0.225, [0.14]],
    [0.333, [0.14]],
    [0.375, [0]],
    [0.667, [0]],
    [0.705, [0.2]],
    [0.778, [0.2]],
    [0.81, [0]],
    [0.92, [0]],
    [0.96, [0.27]],
  ]);
  const orbFocus = track([
    [0.481, [0]],
    [0.53, [1]],
    [0.667, [1]],
    [0.705, [0]],
  ]);

  function makeBgTrack(palette: PaletteConfig): (p: number) => RGBTuple {
    return track([
      [0.0, rgb(palette.bg)],
      [0.481, rgb(palette.bg)],
      [0.515, rgb(palette.bgDark)],
      [0.655, rgb(palette.bgDark)],
      [0.69, rgb(palette.bg)],
      [0.785, rgb(palette.bg)],
      [0.82, rgb(palette.sky)],
      [0.875, rgb(palette.skyHigh)],
      [0.91, rgb(palette.bg)],
      [1.0, rgb(palette.bg)],
    ]);
  }
  let bgTrack = makeBgTrack(pal);

  const sunOffset = track([
    [0.0, [4.2, 12, 6.2]],
    [0.9, [4.2, 12, 6.2]],
    [0.95, [-10, 7.2, 4.2]],
  ]);

  const P = new THREE.Vector3();
  const Pa = new THREE.Vector3();
  const Pb = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const fwd = new THREE.Vector3(1, 0, 0);
  const upW = new THREE.Vector3(0, 1, 0);
  const up = new THREE.Vector3();
  const side = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  const qFly = new THREE.Quaternion();
  const qRoll = new THREE.Quaternion();
  const qPitch = new THREE.Quaternion();
  const qSample = new THREE.Quaternion();
  const qLetter = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, -0.18, Math.PI / 2, "YXZ"),
  );
  const focus = new THREE.Vector3();
  const look = new THREE.Vector3();
  const tmpVec = new THREE.Vector3();
  const tipLocalL = new THREE.Vector3();
  const tipLocalR = new THREE.Vector3();
  const samplePos = new THREE.Vector3();

  const ta = new THREE.Vector3();
  const tb = new THREE.Vector3();
  const tc = new THREE.Vector3();
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();

  let width = 1;
  let height = 1;
  let introStart = performance.now();
  let isReducedMotion = Boolean(reducedMotion);
  let lastProgress = 0;

  function planeTurn(p: number): number {
    if (p < localStart("roadmap")) return 0;
    const d = 0.006;
    planePos(Math.max(0, p - d), ta);
    planePos(p, tb);
    planePos(Math.min(1, p + d), tc);
    va.subVectors(tb, ta).setY(0);
    vb.subVectors(tc, tb).setY(0);
    if (va.lengthSq() < 1e-8 || vb.lengthSq() < 1e-8) return 0;
    va.normalize();
    vb.normalize();
    return va.x * vb.z - va.z * vb.x;
  }

  function computePlanePose(
    p: number,
    mTime: number,
    outPos: THREE.Vector3,
    outQuat: THREE.Quaternion,
  ): void {
    planePos(p, outPos);
    const dp = 0.004;
    planePos(Math.max(0, p - dp), Pa);
    planePos(Math.min(1, p + dp), Pb);
    dir.subVectors(Pb, Pa);

    const flying = p > localStart("roadmap") - 0.012;
    if (flying && dir.lengthSq() > 1e-6) fwd.copy(dir).normalize();
    else fwd.set(1, 0, 0);

    up.copy(upW).addScaledVector(fwd, -fwd.dot(upW)).normalize();
    side.crossVectors(fwd, up).normalize();
    m4.makeBasis(fwd, up, side);
    qFly.setFromRotationMatrix(m4);

    const foldT = localT(p, "fold");
    const takeoffFlare = Math.sin(range(foldT, 0.22, 0.92) * Math.PI) * 0.14;
    if (takeoffFlare > 1e-4) {
      qPitch.setFromAxisAngle(side, takeoffFlare);
      qFly.premultiply(qPitch);
    }

    const turn = planeTurn(p);
    let roll = clamp(-turn * 14, -0.88, 0.88);

    const aiT = localT(p, "ai");
    const orbitBank =
      smooth(range(aiT, 0.08, 0.22)) * (1 - smooth(range(aiT, 0.82, 0.96)));
    roll -= orbitBank * 0.32;

    const hrT = localT(p, "hr");
    roll += easeInOut(range(hrT, 0.28, 0.76)) * Math.PI * 2;

    const breathing = flying && p < 0.93 ? 1 : 0;
    roll += Math.sin(mTime * 1.2) * 0.045 * breathing;

    qRoll.setFromAxisAngle(fwd, roll);
    qFly.premultiply(qRoll);

    const offerT = localT(p, "offer");
    const wLetter = easeInOut(range(offerT, 0.12, 0.55));
    outQuat.slerpQuaternions(qFly, qLetter, wLetter);

    outPos.y += Math.sin(mTime * 1.5) * 0.045 * breathing;
    if (offerT > 0.5) {
      outPos.y += Math.sin(mTime * 1.0) * 0.035 * range(offerT, 0.5, 0.72);
    }
  }

  function foldAt(p: number): number {
    const foldT = localT(p, "fold");
    let fold = range(foldT, 0.1, 0.7);
    if (p >= localStart("offer")) {
      fold = 1 - range(localT(p, "offer"), 0.12, 0.6);
    }
    return fold;
  }

  function resize(): void {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = camera.aspect < 0.8 ? 55 : 35;
    camera.updateProjectionMatrix();
  }

  function update(p: number, rawTime: number): void {
    lastProgress = p;
    const mTime = isReducedMotion ? 0 : rawTime;

    // ——— 1. Máy bay giấy ———
    computePlanePose(p, mTime, P, plane.group.quaternion);
    plane.group.position.copy(P);

    const fold = foldAt(p);
    const flutter =
      p > localStart("roadmap") && p < localStart("offer")
        ? Math.sin(mTime * 3.6) * 0.012
        : 0;
    plane.setFold(fold, flutter);

    const isOfferSide = p > (localStart("clouds") + localStart("offer")) / 2;
    plane.useOffer(isOfferSide);

    // ——— 2. Mũ tốt nghiệp ———
    const foldT = localT(p, "fold");
    const intro = isReducedMotion
      ? 1
      : clamp((performance.now() - introStart) / 1100 - 0.25);
    const drop = 1 - bounce(intro);
    const toss = easeOut(range(foldT, 0, 0.35));
    cap.visible = toss < 0.999;
    if (cap.visible) {
      cap.position.set(
        0.45 - toss * 1.5,
        0.02 + drop * 3.5 + toss * 6,
        -0.45 - toss * 2,
      );
      cap.rotation.set(
        -0.06 + toss * 4,
        0.6 + toss * 3 + drop * 0.8,
        0.05 + toss * 2,
      );
      cap.setPose(toss, drop, mTime);
    }

    // ——— 3. Đường băng & Bản đồ bay kiến trúc ———
    const runwayWipe =
      foldT < 0.45 ? 0 : lerp(0.4, 0.6, easeInOut(range(foldT, 0.45, 0.95)));
    const rmT = localT(p, "roadmap");
    road.group.visible =
      p > localStart("fold") && p < localStart("code") + 0.015;
    if (road.group.visible) {
      road.update({
        runway:
          p < localStart("roadmap")
            ? runwayWipe
            : lerp(0.6, 1, range(rmT, 0, 0.2)),
        map: smooth(range(rmT, 0.04, 0.5)),
        travel:
          p < localStart("roadmap")
            ? 0
            : lerp(travelStart, 1, smooth(rmT) * 0.85 + rmT * 0.15),
        branches: smooth(range(rmT, 0.55, 0.8)),
      });
    }

    // ——— 4. Tấm gốm mờ cảnh Code: bám hành lang trung tâm, chừa thoáng 100% chữ trái & khung editor phải ———
    const codeT = localT(p, "code");
    const codeVis =
      smooth(range(p, localStart("code") + 0.022, localStart("code") + 0.055)) *
      (1 - smooth(range(p, localStart("ai") - 0.02, localStart("ai") + 0.01)));
    codeWall.group.visible = codeVis > 0.005;
    if (codeWall.group.visible) {
      // Giữ tấm gốm ở đúng khe thoáng trung tâm màn hình (39%..60% bề rộng), chỉ trượt parallax nhẹ ±0.7 đơn vị
      codeWall.group.position.set(
        39,
        4.15 - (1 - codeVis) * 1.2,
        P.z + (0.5 - codeT) * 1.4,
      );
      codeWall.group.scale.setScalar(0.88 + 0.12 * codeVis);
      codeWall.update(range(codeT, 0.14, 0.9));
    }

    // ——— 5. Quả cầu ngọc trai AI Interviewer ———
    const aiT = localT(p, "ai");
    const orbVis =
      smooth(range(aiT, 0.04, 0.25)) * (1 - smooth(range(aiT, 0.9, 1)));
    const talk = range(aiT, 0.14, 0.25) * (1 - range(aiT, 0.5, 0.6)) + 0.35;
    orb.update(mTime, talk, orbVis);

    // ——— 6. Mây & Pháo giấy ———
    const clT = localT(p, "clouds");
    const offerT = localT(p, "offer");
    clouds.update(
      smooth(range(clT, 0, 0.25)) * (1 - smooth(range(offerT, 0, 0.3))),
      mTime,
    );
    confetti.update(range(offerT, 0.48, 1));

    // ——— 7. Nền, Bóng đổ tiếp xúc dịu (0.075) & Ánh sáng Studio ———
    const darkW = orbFocus(p)[0];
    const c = bgTrack(p);
    bg.setRGB(c[0], c[1], c[2]);
    groundColor.color.copy(bg);
    fog.color.copy(bg);

    const groundVis = 1 - smooth(range(p, 0.335, 0.365));
    shadowCatcherMat.opacity = pal.shadowOpacity * (1 - darkW) * groundVis;

    renderer.toneMappingExposure = lerp(1.06, 1.0, darkW);
    scene.environmentIntensity = lerp(0.24, 0.14, darkW);
    plane.setPaperLift(lerp(pal.darkTheme ? 0.08 : 0.26, 0.04, darkW));

    hemi.intensity = lerp(1.72, 0.34, darkW);
    sun.intensity = lerp(2.55, 0.72, darkW);
    sun.color.copy(sunDayCol).lerp(pal.orbPearl, darkW * 0.5);

    rim.intensity = lerp(0.52, 1.05, darkW);
    rim.color.copy(pal.rimDay).lerp(pal.rimNight, darkW);

    aiLight.intensity = orbVis * (38 + talk * 20);

    // ——— 8. Camera ———
    focus.copy(P).lerp(ORB, darkW);
    const o = camOffset(p);
    const portrait = camera.aspect < 0.8;
    const inRoadmap =
      p > localStart("roadmap") + 0.03 && p < localStart("code") + 0.01;
    const offY = portrait && inRoadmap ? o[1] * 1.25 : o[1];
    const tg = camTarget(p);
    const u = camUp(p);

    camera.position.set(focus.x + o[0], focus.y + offY, focus.z + o[2]);
    look.set(focus.x + tg[0], focus.y + tg[1], focus.z + tg[2]);
    camera.up.set(u[0], u[1], u[2]).normalize();
    camera.lookAt(look);

    const shift =
      camShift(p)[0] * (width > 800 ? 1 : portrait && inRoadmap ? 0.6 : 0.2);
    camera.setViewOffset(width, height, -shift * width, 0, width, height);

    // ——— 9. Đèn bám chủ thể ———
    const so = sunOffset(p);
    sun.position.copy(P).add(tmpVec.set(so[0], so[1], so[2]));
    sun.target.position.copy(P);

    rim.position.set(P.x - so[0] * 0.8, P.y + 4.5, P.z - so[2] * 0.9);
    rim.target.position.copy(P);

    // ——— 10. Vệt không khí siêu mảnh đầu mút cánh ———
    const trailVis =
      smooth(range(p, 0.18, 0.22)) * (1 - smooth(range(p, 0.855, 0.892)));
    plane.getWingTipOffsets(1, tipLocalL, tipLocalR);
    wingTrails.update(p, trailVis, darkW, camera.position, (ps, outL, outR) => {
      computePlanePose(ps, mTime, samplePos, qSample);
      outL.copy(tipLocalL).applyQuaternion(qSample).add(samplePos);
      outR.copy(tipLocalR).applyQuaternion(qSample).add(samplePos);
    });

    renderer.render(scene, camera);
  }

  function refreshPalette(): void {
    pal = readPalette();
    setTexturePalette(pal.css);
    bgTrack = makeBgTrack(pal);

    hemi.color.copy(pal.hemiSky);
    hemi.groundColor.copy(pal.hemiGround);
    aiLight.color.copy(pal.orbPearl);
    shadowCatcherMat.color.copy(pal.shadow);

    const prevCV = cvTex;
    const prevOffer = offerTex;
    cvTex = makeCVTexture(renderer);
    offerTex = makeOfferTexture(renderer);
    const isOfferSide =
      lastProgress > (localStart("clouds") + localStart("offer")) / 2;
    plane.setTextures({ cv: cvTex, offer: offerTex }, isOfferSide);
    prevCV.dispose();
    prevOffer.dispose();

    cap.setPalette(pal);
    road.setPalette(pal);
    codeWall.setPalette(pal);
    orb.setPalette(pal);
    wingTrails.setPalette(pal);
    confetti.setPalette(pal);
  }

  function setReducedMotion(flag: boolean): void {
    isReducedMotion = Boolean(flag);
  }

  resize();
  return {
    renderer,
    update,
    resize,
    refreshPalette,
    setReducedMotion,
    restartIntro: () => {
      introStart = performance.now();
    },
  };
}

function localStart(key: SceneKey): number {
  return START[key];
}

const START: Record<SceneKey, number> = {
  hero: 0,
  fold: 0.074,
  roadmap: 0.185,
  code: 0.333,
  ai: 0.481,
  hr: 0.667,
  clouds: 0.778,
  offer: 0.889,
};

function rgb(c: THREE.Color): RGBTuple {
  return [c.r, c.g, c.b];
}

function bounce(t: number): number {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}
