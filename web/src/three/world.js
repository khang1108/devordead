import * as THREE from "three";
import { localT } from "../story/timeline.js";
import { clamp, lerp, range, smooth, easeInOut, easeOut, track } from "./util.js";
import { makeCVTexture, makeOfferTexture, setTexturePalette } from "./textures.js";
import { readPalette } from "./palette.js";
import { createPaperPlane } from "./paperPlane.js";
import { createCap } from "./cap.js";
import { createFlightMap } from "./flightMap.js";
import { createCodeWall } from "./codeWall.js";
import { createOrb } from "./orb.js";
import { createClouds } from "./clouds.js";
import { createConfetti } from "./confetti.js";

const FLY_Y = 2.6;
const ORB = new THREE.Vector3(13, 4, 128);
const ORBIT_R = 4.8;
const HR_START = new THREE.Vector3(13, 4, 142);
const HR_END = new THREE.Vector3(13, 4.5, 168);
const SKY = new THREE.Vector3(13, 34, 196);
const OFFER = new THREE.Vector3(13, 35, 202);

/**
 * Thế giới 3D phía sau lớp DOM. Mọi thứ là hàm của tiến độ cuộn p (trừ vài chuyển động "thở" theo thời gian).
 */
export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pal = readPalette();
  setTexturePalette(pal.css);
  const bg = pal.bg.clone();
  scene.background = bg;
  scene.fog = new THREE.Fog(bg, 40, 140);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 400);

  // ánh sáng
  scene.add(new THREE.HemisphereLight(pal.hemiSky, pal.hemiGround, 1.6));
  const sun = new THREE.DirectionalLight(0xfffaf2, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 40 });
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);

  // mặt đất: màu trùng nền + lớp nhận bóng
  const groundColor = new THREE.MeshBasicMaterial({ color: bg.clone() });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), groundColor);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.01, 100);
  const shadowCatcher = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800),
    new THREE.ShadowMaterial({ opacity: pal.shadowOpacity, color: pal.shadow }),
  );
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.set(0, 0.008, 100);
  shadowCatcher.receiveShadow = true;
  scene.add(ground, shadowCatcher);

  // vật thể
  const plane = createPaperPlane({ cvTexture: makeCVTexture(renderer), offerTexture: makeOfferTexture(renderer) });
  scene.add(plane.group);

  const cap = createCap(pal);
  scene.add(cap);

  const road = createFlightMap(renderer, pal);
  scene.add(road.group);

  const codeWall = createCodeWall(pal);
  codeWall.group.position.set(58, 4.5, 91);
  codeWall.group.scale.setScalar(1.05);
  codeWall.group.rotation.y = -Math.PI / 2;
  scene.add(codeWall.group);

  const orb = createOrb(pal);
  orb.group.position.copy(ORB);
  scene.add(orb.group);


  const clouds = createClouds(renderer, { center: new THREE.Vector3(13, 18, 184), spanZ: 44 });
  scene.add(clouds.group);

  const confetti = createConfetti(pal);
  confetti.mesh.position.copy(OFFER).add(new THREE.Vector3(2.2, 0.6, 0.4));
  scene.add(confetti.mesh);

  // ——— vị trí máy bay theo p ———
  // máy bay rời cảnh gấp ở x = 4; đường bay bắt đầu từ đầu đường băng (x = −60)
  const travelStart = (road.runwayLength - 4) / road.flightLength;
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();

  function planePos(p, out) {
    if (p < localStart("fold")) return out.set(0, 0.012, 0);
    if (p < localStart("roadmap")) {
      const t = localT(p, "fold");
      const rise = easeInOut(range(t, 0.15, 0.8));
      const fwd = easeInOut(range(t, 0.55, 1)) * 4;
      return out.set(fwd, lerp(0.012, FLY_Y, rise), 0);
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
      const approach = tmp.set(13, lerp(3.4, 4, range(t, 0, 0.2)), lerp(104, 122, range(t, 0, 0.2)));
      const phi = -Math.PI / 2 + (t - 0.12) * Math.PI * 2 * 1.5;
      const orbit = tmp2.set(
        ORB.x + ORBIT_R * Math.cos(phi),
        ORB.y + 0.3 * ORBIT_R * Math.sin(phi),
        ORB.z + ORBIT_R * Math.sin(phi),
      );
      const wIn = smooth(range(t, 0.04, 0.2));
      out.lerpVectors(approach, orbit, wIn);
      const wOut = smooth(range(t, 0.86, 1));
      if (wOut > 0) {
        const exit = tmp.lerpVectors(new THREE.Vector3(13, 4, 134), HR_START, range(t, 0.86, 1));
        out.lerp(exit, wOut);
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

  // ——— camera: vị trí/đích tương đối với "tiêu điểm" (máy bay, hoặc quả cầu ở cảnh AI) ———
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
  // dịch khung hình theo chiều ngang (tỉ lệ bề rộng): >0 → vật thể nằm lệch phải, chừa chỗ cho chữ bên trái
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
  const bgTrack = track([
    [0.0, rgb(pal.bg)],
    [0.481, rgb(pal.bg)],
    [0.515, rgb(pal.bgDark)],
    [0.655, rgb(pal.bgDark)],
    [0.69, rgb(pal.bg)],
    [0.785, rgb(pal.bg)],
    [0.82, rgb(pal.sky)],
    [0.875, rgb(pal.skyHigh)],
    [0.91, rgb(pal.bg)],
    [1.0, rgb(pal.bg)],
  ]);

  const sunOffset = track([
    [0.0, [4, 12, 6]],
    [0.9, [4, 12, 6]],
    [0.95, [-10, 7, 4]],
  ]);

  // ——— trạng thái tạm ———
  const P = new THREE.Vector3();
  const Pa = new THREE.Vector3();
  const Pb = new THREE.Vector3();
  const fwd = new THREE.Vector3(1, 0, 0);
  const upW = new THREE.Vector3(0, 1, 0);
  const up = new THREE.Vector3();
  const side = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  const qFly = new THREE.Quaternion();
  const qRoll = new THREE.Quaternion();
  const qLetter = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.18, Math.PI / 2, "YXZ"));
  const focus = new THREE.Vector3();
  const look = new THREE.Vector3();
  let width = 1, height = 1;
  let introStart = performance.now();

  function resize() {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // màn hình dọc (mobile): FOV rộng hơn để vật thể không bị cắt
    camera.fov = camera.aspect < 0.8 ? 55 : 35;
    camera.updateProjectionMatrix();
  }

  function update(p, time) {
    // ——— máy bay ———
    planePos(p, P);
    const dp = 0.004;
    planePos(Math.max(0, p - dp), Pa);
    planePos(Math.min(1, p + dp), Pb);
    const dir = tmp.subVectors(Pb, Pa);
    const flying = p > localStart("roadmap") - 0.01;
    if (flying && dir.lengthSq() > 1e-6) fwd.copy(dir).normalize();
    else fwd.set(1, 0, 0);

    up.copy(upW).addScaledVector(fwd, -fwd.dot(upW)).normalize();
    side.crossVectors(fwd, up);
    m4.makeBasis(fwd, up, side);
    qFly.setFromRotationMatrix(m4);

    // nghiêng cánh khi rẽ + nhào lộn ở cảnh HR + "thở" nhẹ
    const turn = planeTurn(p);
    let roll = clamp(-turn * 14, -0.9, 0.9);
    const hrT = localT(p, "hr");
    roll += easeInOut(range(hrT, 0.3, 0.75)) * Math.PI * 2;
    const breathing = flying && p < 0.93 ? 1 : 0;
    roll += Math.sin(time * 1.3) * 0.06 * breathing;
    qRoll.setFromAxisAngle(fwd, roll);
    qFly.premultiply(qRoll);

    // cảnh Offer: dựng đứng thành lá thư hướng về camera
    const offerT = localT(p, "offer");
    const wLetter = easeInOut(range(offerT, 0.12, 0.55));
    plane.group.quaternion.slerpQuaternions(qFly, qLetter, wLetter);
    plane.group.position.copy(P);
    plane.group.position.y += Math.sin(time * 1.7) * 0.06 * breathing;
    if (offerT > 0.5) plane.group.position.y += Math.sin(time * 1.1) * 0.05 * range(offerT, 0.5, 0.7);

    // gấp / mở
    const foldT = localT(p, "fold");
    let fold = range(foldT, 0.1, 0.7);
    if (p >= localStart("offer")) fold = 1 - range(offerT, 0.12, 0.6);
    plane.setFold(fold);
    plane.useOffer(p > (localStart("clouds") + localStart("offer")) / 2);

    // ——— mũ tốt nghiệp: rơi xuống khi tải trang, bị tung lên khi bắt đầu cuộn ———
    const intro = clamp((performance.now() - introStart) / 1100 - 0.25);
    const drop = 1 - bounce(intro);
    const toss = easeOut(range(foldT, 0, 0.35));
    cap.visible = toss < 0.999;
    cap.position.set(0.45 - toss * 1.5, 0.02 + drop * 3.5 + toss * 6, -0.45 - toss * 2);
    cap.rotation.set(-0.06 + toss * 4, 0.6 + toss * 3 + drop * 0.8, 0.05 + toss * 2);

    // ——— đường ———
    // đường băng quét ngang màn hình trong cảnh gấp (x −12 → 12 trên đường băng dài 120)
    const runwayWipe = foldT < 0.45 ? 0 : lerp(0.4, 0.6, easeInOut(range(foldT, 0.45, 0.95)));
    const rmT = localT(p, "roadmap");
    road.group.visible = p > localStart("fold") && p < localStart("code") + 0.03;
    road.update({
      runway: p < localStart("roadmap") ? runwayWipe : lerp(0.6, 1, range(rmT, 0, 0.2)),
      map: smooth(range(rmT, 0.04, 0.5)),
      travel: p < localStart("roadmap") ? 0 : lerp(travelStart, 1, smooth(rmT) * 0.85 + rmT * 0.15),
      branches: smooth(range(rmT, 0.55, 0.8)),
    });

    // ——— tường code ———
    const codeT = localT(p, "code");
    codeWall.group.visible = p > localStart("code") - 0.03 && p < localStart("ai") + 0.04;
    codeWall.update(range(codeT, 0.15, 0.9));

    // ——— quả cầu AI ———
    const aiT = localT(p, "ai");
    const orbVis = smooth(range(aiT, 0.04, 0.25)) * (1 - smooth(range(aiT, 0.9, 1)));
    const talk = range(aiT, 0.15, 0.25) * (1 - range(aiT, 0.5, 0.6)) + 0.35;
    orb.update(time, talk, orbVis);


    // ——— mây & pháo giấy ———
    const clT = localT(p, "clouds");
    clouds.update(smooth(range(clT, 0, 0.25)) * (1 - smooth(range(offerT, 0, 0.3))));
    confetti.update(range(offerT, 0.48, 1));

    // ——— nền / sương mù ———
    const c = bgTrack(p);
    bg.setRGB(c[0], c[1], c[2]);
    groundColor.color.copy(bg);
    scene.fog.color.copy(bg);
    shadowCatcher.material.opacity = pal.shadowOpacity * (1 - orbFocus(p)[0]);

    // ——— camera ———
    focus.copy(P).lerp(ORB, orbFocus(p)[0]);
    const o = camOffset(p);
    const portrait = camera.aspect < 0.8;
    const inRoadmap = p > localStart("roadmap") + 0.03 && p < localStart("code") + 0.01;
    if (portrait && inRoadmap) o[1] *= 1.25; // màn hình dọc: nhìn cao hơn để thấy đủ bản đồ
    const tg = camTarget(p);
    const u = camUp(p);
    camera.position.set(focus.x + o[0], focus.y + o[1], focus.z + o[2]);
    look.set(focus.x + tg[0], focus.y + tg[1], focus.z + tg[2]);
    camera.up.set(u[0], u[1], u[2]).normalize();
    camera.lookAt(look);
    const shift = camShift(p)[0] * (width > 800 ? 1 : portrait && inRoadmap ? 0.6 : 0.2);
    camera.setViewOffset(width, height, -shift * width, 0, width, height);

    // bóng đổ đi theo máy bay
    const so = sunOffset(p);
    sun.position.copy(P).add(tmp2.set(so[0], so[1], so[2]));
    sun.target.position.copy(P);

    renderer.render(scene, camera);
  }

  // độ cong đường bay (dương = rẽ trái nhìn từ trên)
  const ta = new THREE.Vector3(), tb = new THREE.Vector3(), tc = new THREE.Vector3();
  function planeTurn(p) {
    if (p < localStart("roadmap")) return 0;
    const d = 0.006;
    planePos(p - d, ta);
    planePos(p, tb);
    planePos(Math.min(1, p + d), tc);
    const a = tb.clone().sub(ta).setY(0);
    const b = tc.clone().sub(tb).setY(0);
    if (a.lengthSq() < 1e-8 || b.lengthSq() < 1e-8) return 0;
    a.normalize();
    b.normalize();
    return a.x * b.z - a.z * b.x;
  }

  resize();
  return { renderer, update, resize, restartIntro: () => (introStart = performance.now()) };
}

function localStart(key) {
  // p bắt đầu của cảnh (tránh import vòng — dùng localT ngược)
  return START[key];
}
const START = {
  hero: 0,
  fold: 0.074,
  roadmap: 0.185,
  code: 0.333,
  ai: 0.481,
  hr: 0.667,
  clouds: 0.778,
  offer: 0.889,
};

function rgb(c) {
  return [c.r, c.g, c.b]; // THREE.Color đã ở không gian tuyến tính
}

function bounce(t) {
  // easeOutBounce
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}
