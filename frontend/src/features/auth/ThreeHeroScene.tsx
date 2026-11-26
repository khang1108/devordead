import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface PlinthSpec {
  size: [number, number, number];
  pos: [number, number, number];
  color: number;
}

/**
 * Hình học máy bay giấy origami 6 mặt phẳng gấp sắc nét (flat-shaded gallery paper).
 * Mũi hướng về +Z, sải cánh theo trục X, sống gấp trung tâm theo trục Y.
 */
function createSculpturalPlaneGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array([
    // Cánh ngoài bên trái
    0.0, 0.05, 0.92,
    -0.78, 0.19, -0.68,
    -0.14, 0.09, -0.58,

    // Cánh ngoài bên phải
    0.0, 0.05, 0.92,
    0.14, 0.09, -0.58,
    0.78, 0.19, -0.68,

    // Rãnh gấp trong bên trái
    0.0, 0.05, 0.92,
    -0.14, 0.09, -0.58,
    0.0, 0.01, -0.54,

    // Rãnh gấp trong bên phải
    0.0, 0.05, 0.92,
    0.0, 0.01, -0.54,
    0.14, 0.09, -0.58,

    // Sống bụng trái (keel)
    0.0, 0.05, 0.92,
    0.0, 0.01, -0.54,
    -0.02, -0.24, -0.52,

    // Sống bụng phải (keel)
    0.0, 0.05, 0.92,
    0.02, -0.24, -0.52,
    0.0, 0.01, -0.54,
  ]);
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

/** SVG tĩnh cho chế độ giảm chuyển động (prefers-reduced-motion) hoặc khi không có WebGL */
function StaticSculptureFallback() {
  return (
    <div className="three-hero three-hero--fallback" aria-hidden="true">
      <svg
        className="three-hero__svg"
        viewBox="0 0 720 420"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="studioSpot" cx="52%" cy="48%" r="48%">
            <stop offset="0%" stopColor="#262C36" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#111418" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="720" height="420" fill="url(#studioSpot)" />

        {/* 3 bệ kiến trúc bậc thang (Stepped Matte Slate Plinths) */}
        <g>
          <polygon points="150,300 250,262 330,296 230,334" fill="#1E232B" stroke="#2E3542" />
          <polygon points="150,300 230,334 230,368 150,334" fill="#161A20" />
          <polygon points="230,334 330,296 330,330 230,368" fill="#1A1E25" />

          <polygon points="275,264 385,222 475,260 365,302" fill="#232933" stroke="#343C4A" />
          <polygon points="275,264 365,302 365,356 275,318" fill="#181C22" />
          <polygon points="365,302 475,260 475,314 365,356" fill="#1C2129" />

          <polygon points="415,222 530,178 620,216 505,260" fill="#282F3A" stroke="#3B4454" />
          <polygon points="415,222 505,260 505,336 415,298" fill="#191D24" />
          <polygon points="505,260 620,216 620,292 505,336" fill="#1E232B" />
        </g>

        {/* Đường cung quỹ đạo mảnh */}
        <path
          d="M140 268 C255 215, 380 164, 565 118"
          stroke="#8A909E"
          strokeOpacity="0.36"
          strokeWidth="1.25"
        />

        {/* Máy bay giấy origami trắng ngà (#F7F7F5) */}
        <g transform="translate(392, 152) rotate(-16)">
          <polygon points="62,0 -48,-36 -34,-6" fill="#F7F7F5" />
          <polygon points="62,0 -34,-6 -30,4" fill="#E4E7EC" />
          <polygon points="62,0 -30,4 -42,32" fill="#ECEEF2" />
          <polygon points="62,0 -34,-6 -28,14" fill="#CFD5DF" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Tác phẩm điêu khắc 3D tối giản cho cột trái LoginScreen (#111418):
 * - Máy bay giấy origami trắng mờ (#F7F7F5) nghiêng cánh nhẹ nhàng
 * - 3 khối bệ bậc thang đá phiến mờ (#1A1E24 -> #242A34) với viền bắt sáng mảnh
 * - 1 đường cung quỹ đạo tinh tế + phản hồi nghiêng mượt theo chuột
 */
export default function ThreeHeroScene() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion || webglFailed) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    const canvas = document.createElement("canvas");
    canvas.className = "three-hero__canvas";
    canvas.setAttribute("aria-hidden", "true");
    container.appendChild(canvas);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      canvas.remove();
      setWebglFailed(true);
      return undefined;
    }

    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.add(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      materials.add(m);
      return m;
    };

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.setClearColor(0x111418, 0);

    const scene = new THREE.Scene();

    const initialW = Math.max(container.clientWidth, 320);
    const initialH = Math.max(container.clientHeight, 240);
    const camera = new THREE.PerspectiveCamera(32, initialW / initialH, 0.1, 60);
    camera.position.set(4.6, 3.15, 6.6);
    camera.lookAt(0.1, -0.1, 0);
    renderer.setSize(initialW, initialH, false);

    // Ánh sáng studio điêu khắc (Key ấm từ trên trái + Rim lạnh nhẹ tách khối đá phiến)
    const hemi = new THREE.HemisphereLight(0xf1f5f9, 0x111418, 0.82);
    const keyLight = new THREE.DirectionalLight(0xfffdf9, 2.45);
    keyLight.position.set(4.5, 7.5, 5.2);

    const rimLight = new THREE.DirectionalLight(0xcbd5e1, 0.95);
    rimLight.position.set(-5.5, 3.2, -4.5);

    const softFill = new THREE.PointLight(0x7cc4e8, 2.2, 12, 2.0);
    softFill.position.set(0.4, 0.9, 1.8);

    scene.add(hemi, keyLight, rimLight, softFill);

    const sculptureGroup = new THREE.Group();
    sculptureGroup.position.set(0.15, -0.12, 0);
    scene.add(sculptureGroup);

    // 1. Ba khối bệ kiến trúc bậc thang bằng gốm/nhôm anod mờ (#1A1E24 -> #232830)
    const plinthSpecs: readonly PlinthSpec[] = [
      { size: [1.55, 0.42, 1.35], pos: [-1.42, -1.05, 0.48], color: 0x181c22 },
      { size: [1.65, 0.72, 1.45], pos: [0.02, -0.9, 0.02], color: 0x1d222a },
      { size: [1.75, 1.06, 1.55], pos: [1.52, -0.73, -0.46], color: 0x232832 },
    ];

    const edgeMat = trackMat(
      new THREE.LineBasicMaterial({
        color: 0x384150,
        transparent: true,
        opacity: 0.34,
      }),
    );

    plinthSpecs.forEach((spec) => {
      const boxGeo = trackGeo(new THREE.BoxGeometry(...spec.size));
      const boxMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: spec.color,
          roughness: 0.78,
          metalness: 0.14,
        }),
      );
      const mesh = new THREE.Mesh(boxGeo, boxMat);
      mesh.position.set(...spec.pos);
      mesh.rotation.y = -0.22;

      const edgesGeo = trackGeo(new THREE.EdgesGeometry(boxGeo));
      mesh.add(new THREE.LineSegments(edgesGeo, edgeMat));
      sculptureGroup.add(mesh);
    });

    // 2. Đường cung quỹ đạo mảnh tinh tế vươn qua 3 bậc thềm
    const flightArc = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.45, -0.35, 1.05),
      new THREE.Vector3(-0.85, 0.18, 0.48),
      new THREE.Vector3(0.55, 0.62, -0.05),
      new THREE.Vector3(2.35, 1.12, -0.78),
    ]);
    const arcGeo = trackGeo(new THREE.TubeGeometry(flightArc, 72, 0.008, 6, false));
    const arcMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x8a909e,
        transparent: true,
        opacity: 0.32,
      }),
    );
    sculptureGroup.add(new THREE.Mesh(arcGeo, arcMat));

    // 3. Máy bay giấy origami trắng mờ (#F7F7F5) lơ lửng thanh tĩnh trên quỹ đạo
    const planePivot = new THREE.Group();
    const planeGeo = trackGeo(createSculpturalPlaneGeometry());
    const planeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf7f7f5,
        roughness: 0.66,
        metalness: 0.02,
        flatShading: true,
        side: THREE.DoubleSide,
      }),
    );
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.scale.setScalar(1.08);
    planePivot.add(planeMesh);

    const anchorPoint = flightArc.getPointAt(0.56);
    const anchorTangent = flightArc.getTangentAt(0.56);
    planePivot.position.copy(anchorPoint).setY(anchorPoint.y + 0.24);
    planePivot.lookAt(anchorPoint.clone().add(anchorTangent));
    sculptureGroup.add(planePivot);

    // Phản hồi parallax nhẹ nhàng theo con trỏ chuột
    const pointerTarget = new THREE.Vector2(0, 0);
    const pointerSmooth = new THREE.Vector2(0, 0);

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) {
        pointerTarget.set(0, 0);
        return;
      }
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      pointerTarget.set(nx, ny);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    const handleResize = () => {
      const w = Math.max(container.clientWidth, 1);
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    let rafId = 0;
    let elapsed = 0;
    let lastTime = performance.now();
    const basePlaneY = anchorPoint.y + 0.24;

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += dt;

      const damp = 1 - Math.exp(-4.2 * dt);
      pointerSmooth.lerp(pointerTarget, damp);

      sculptureGroup.rotation.y = pointerSmooth.x * 0.11 + Math.sin(elapsed * 0.22) * 0.025;
      sculptureGroup.rotation.x = -pointerSmooth.y * 0.06;

      // Chuyển động thở êm ái của máy bay giấy
      planePivot.position.y = basePlaneY + Math.sin(elapsed * 0.95) * 0.055;
      planeMesh.rotation.z = -0.16 + Math.sin(elapsed * 0.65) * 0.045 - pointerSmooth.x * 0.08;
      planeMesh.rotation.x = Math.cos(elapsed * 0.8) * 0.025;

      renderer.render(scene, camera);
      rafId = window.requestAnimationFrame(tick);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
      } else if (!rafId) {
        lastTime = performance.now();
        rafId = window.requestAnimationFrame(tick);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    if (!document.hidden) {
      rafId = window.requestAnimationFrame(tick);
    }

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pointermove", handlePointerMove);
      resizeObserver.disconnect();

      scene.traverse((obj: THREE.Object3D) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose());
        }
      });

      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      geometries.clear();
      materials.clear();

      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, [reducedMotion, webglFailed]);

  if (reducedMotion || webglFailed) {
    return <StaticSculptureFallback />;
  }

  return <div ref={containerRef} className="three-hero" aria-hidden="true" />;
}
