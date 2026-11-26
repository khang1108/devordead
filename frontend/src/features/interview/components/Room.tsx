import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import * as THREE from "three";
import Logo from "@shared/components/Logo";
import { Badge, Button, RuleTag, type ButtonVariant } from "@shared/ui";
import type { TranscriptTurn } from "@shared/types";
import "./room.css";

// 3D Simplex Noise (Stefan Gustavson / Ashima Arts, MIT) — low-frequency smooth acoustic breathing only
const GLSL_NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

// Calm Matte-Pearl / Frosted-Ceramic Sphere: ~80% reduced displacement (0.009 idle, 0.030 speaking)
const ORB_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uSpeak;
  uniform float uListen;
  uniform float uThink;
  uniform float uCadence;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying float vWave;

  ${GLSL_NOISE}

  void main() {
    float n1 = snoise(normal * 1.05 + vec3(0.0, uTime * 0.28, uTime * 0.14));
    float harmonic = 0.5 * sin(position.y * 2.2 - uTime * 3.6) + 0.5 * cos(position.x * 1.9 + uTime * 2.8);

    float idleAmp = 0.009;
    float activeAmp = uSpeak * (0.022 + 0.010 * uCadence) + uListen * (0.014 + 0.020 * uCadence) + uThink * 0.012;
    float disp = n1 * (idleAmp + activeAmp) + harmonic * (uSpeak * 0.010 * uCadence + uListen * (0.006 + 0.008 * uCadence));

    vWave = n1 * 0.6 + harmonic * 0.4;

    vec3 displaced = position + normal * disp;
    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = worldPos.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const ORB_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uPearl;
  uniform vec3 uCeramicMid;
  uniform vec3 uShadow;
  uniform vec3 uSky;
  uniform vec3 uEmerald;
  uniform float uSpeak;
  uniform float uListen;
  uniform float uThink;
  uniform float uCadence;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying float vWave;

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    float ndotv = max(dot(N, V), 0.0);
    float fresnel = pow(1.0 - ndotv, 2.6);

    // Top-left studio softbox key light + gentle bottom-right bounce
    vec3 keyDir = normalize(vec3(-0.52, 0.74, 0.86));
    float wrap = clamp((dot(N, keyDir) + 0.52) / 1.52, 0.0, 1.0);
    float spec = pow(max(dot(N, keyDir), 0.0), 7.0);

    // Subsurface scatter tint: calm ceramic slate at rest, subtle Sky when speaking, Emerald when listening
    vec3 scatter = uCeramicMid;
    scatter = mix(scatter, mix(uCeramicMid, uSky, 0.52), clamp(uSpeak * (0.65 + 0.35 * uCadence) + uThink * 0.35, 0.0, 1.0));
    scatter = mix(scatter, mix(uCeramicMid, uEmerald, 0.48), clamp(uListen * (0.7 + 0.3 * uCadence), 0.0, 1.0));

    vec3 body = mix(uShadow, scatter, smoothstep(0.0, 0.58, wrap));
    body = mix(body, uPearl, smoothstep(0.42, 1.0, wrap));

    // Crisp matte-ceramic rim definition so sphere reads cleanly on white and light-grey surfaces
    vec3 rimTint = mix(uShadow * 1.35, uSky, clamp(uSpeak * 0.65, 0.0, 1.0));
    rimTint = mix(rimTint, uEmerald, clamp(uListen * 0.6, 0.0, 1.0));

    float subtleBand = smoothstep(0.35, 0.85, vWave) * (uSpeak * 0.06 + uListen * 0.05);
    vec3 col = mix(body, rimTint, fresnel * 0.36) + uPearl * spec * 0.14 + scatter * subtleBand;

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  confirmVariant?: ButtonVariant;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/** Hộp xác nhận dùng <dialog> gốc: có focus trap, Esc để đóng. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Xác nhận",
  confirmVariant = "primary",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="room-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onCancel?.();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCancel?.();
      }}
      aria-labelledby="room-dialog-title"
    >
      <div className="room-dialog__head">
        <h2 id="room-dialog-title" className="t-heading-m">
          {title}
        </h2>
      </div>
      <div className="t-body-m c-ink2">{children}</div>
      <div className="row room-dialog__actions">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Hủy
        </Button>
        <Button variant={confirmVariant} size="sm" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}

export type TimerTone = "normal" | "warn" | "danger";

export interface RoomTopBarProps {
  badge: string;
  title: string;
  remaining: string;
  total: string;
  tone?: TimerTone;
  onEnd: () => void;
  onSimulateTimeout?: () => void;
  simulateLabel?: string;
}

/**
 * Thanh trên 52px phẳng của phòng phỏng vấn: logo, loại phiên, đồng hồ hard-stop (BR1), kết thúc.
 */
export function RoomTopBar({
  badge,
  title,
  remaining,
  total,
  tone = "normal",
  onEnd,
  onSimulateTimeout,
  simulateLabel = "Kiểm tra mốc 00:00 (BR1)",
}: RoomTopBarProps) {
  return (
    <header className="room-bar">
      <div className="room-bar__brand">
        <Logo to="/dashboard" />
        <span className="room-bar__sep" aria-hidden="true" />
        <Badge tone="brand" dot>
          {badge}
        </Badge>
        <p className="t-heading-s room-bar__title">{title}</p>
      </div>

      <div className="room-bar__spacer" />

      <div className="room-bar__controls">
        {onSimulateTimeout && (
          <Button
            variant="ghost"
            size="sm"
            className="room-bar__demo"
            onClick={onSimulateTimeout}
            title="Kích hoạt kết thúc đúng hạn (hard-stop BR1) và chụp snapshot ngay"
          >
            {simulateLabel}
          </Button>
        )}

        <RuleTag code="BR1">Hard-stop</RuleTag>

        <div
          className={`room-timer ${tone === "danger" ? "is-danger" : tone === "warn" ? "is-warn" : ""}`}
          role="timer"
          aria-label={`Thời gian còn lại ${remaining} trên ${total}`}
        >
          <span className="room-timer__dot" aria-hidden="true" />
          <span className="room-timer__value">{remaining}</span>
          <span className="room-timer__total">/ {total}</span>
        </div>

        <Button variant="secondary" size="sm" onClick={onEnd}>
          Kết thúc
        </Button>
      </div>
    </header>
  );
}

export interface AiAvatarProps {
  speaking?: boolean;
  listening?: boolean;
  thinking?: boolean;
  analyser?: AnalyserNode | null;
  size?: number;
  className?: string;
}

/**
 * Calm Matte-Pearl 3D Audio-Reactive AI Orb (WebGL custom GLSL shader + single whisper-thin studio ring).
 * Khi truyền `analyser` (Web Audio API), biên độ âm thanh micro thật điều biến trực tiếp chuyển động quả cầu.
 */
export function AiAvatar({
  speaking = false,
  listening = false,
  thinking = false,
  analyser = null,
  size,
  className = "",
}: AiAvatarProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({ speaking, listening, thinking, analyser });
  stateRef.current = { speaking, listening, thinking, analyser };

  const [fallback, setFallback] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setFallback(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (fallback) return undefined;
    const host = hostRef.current;
    if (!host) return undefined;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setFallback(true);
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.setClearColor(0x000000, 0);

    const canvas = renderer.domElement;
    canvas.className = "ai-avatar__canvas";
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
    camera.position.set(0, 0, 4.35);

    const group = new THREE.Group();
    scene.add(group);

    // Calm Matte-Pearl & Neutral Slate Palette (Zero purple/violet, zero neon clutter)
    const colSky = new THREE.Color("#2484B5");
    const colEmerald = new THREE.Color("#16794C");
    const colRingIdle = new THREE.Color("#525866");

    const uniforms = {
      uTime: { value: 0 },
      uSpeak: { value: stateRef.current.speaking ? 1 : 0 },
      uListen: { value: stateRef.current.listening ? 1 : 0 },
      uThink: { value: stateRef.current.thinking ? 1 : 0 },
      uCadence: { value: 0.45 },
      uPearl: { value: new THREE.Color("#F4F7FA") },
      uCeramicMid: { value: new THREE.Color("#C9D4DF") },
      uShadow: { value: new THREE.Color("#2C3540") },
      uSky: { value: colSky.clone() },
      uEmerald: { value: colEmerald.clone() },
    };

    const coreGeometry = new THREE.IcosahedronGeometry(1.08, 40);
    const coreMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: ORB_VERTEX_SHADER,
      fragmentShader: ORB_FRAGMENT_SHADER,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(coreMesh);

    // Single whisper-thin hairline ring (opacity <= 0.16 at rest)
    const ringGeometry = new THREE.TorusGeometry(1.36, 0.0065, 12, 112);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: colRingIdle.clone(),
      transparent: true,
      opacity: 0.15,
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.rotation.set(Math.PI / 2.35, 0.22, 0);
    group.add(ringMesh);

    const syncSize = () => {
      const w = Math.max(64, host.clientWidth || size || 148);
      const h = Math.max(64, host.clientHeight || size || 148);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    syncSize();

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncSize) : null;
    ro?.observe(host);

    let rafId = 0;
    let lastNow = performance.now();
    let elapsed = 0;
    let freqBuf: Uint8Array<ArrayBuffer> | null = null;
    let smoothedEnergy = 0;

    const tick = (now: number) => {
      const dt = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;
      elapsed += dt;

      const st = stateRef.current;
      const targetSpeak = st.speaking ? 1 : 0;
      const targetListen = !st.speaking && st.listening ? 1 : 0;
      const targetThink = !st.speaking && !st.listening && st.thinking ? 1 : 0;
      const lerpFactor = Math.min(1, dt * 5.5);

      uniforms.uTime.value = elapsed;
      uniforms.uSpeak.value += (targetSpeak - uniforms.uSpeak.value) * lerpFactor;
      uniforms.uListen.value += (targetListen - uniforms.uListen.value) * lerpFactor;
      uniforms.uThink.value += (targetThink - uniforms.uThink.value) * lerpFactor;

      let targetCadence = 0.5 + 0.5 * Math.sin(elapsed * 6.2) * Math.cos(elapsed * 2.7 + 0.8);
      if (st.analyser && st.listening && !st.speaking) {
        if (!freqBuf || freqBuf.length !== st.analyser.frequencyBinCount) {
          freqBuf = new Uint8Array(new ArrayBuffer(st.analyser.frequencyBinCount));
        }
        st.analyser.getByteFrequencyData(freqBuf);
        const voiceBins = Math.max(1, Math.floor(freqBuf.length * 0.5));
        let sum = 0;
        for (let i = 0; i < voiceBins; i++) {
          sum += freqBuf[i] ?? 0;
        }
        const normalized = Math.min(1, (sum / voiceBins / 255) * 2.4);
        smoothedEnergy = smoothedEnergy * 0.72 + normalized * 0.28;
        targetCadence = smoothedEnergy;
      } else {
        smoothedEnergy *= 0.88;
      }

      uniforms.uCadence.value += (targetCadence - uniforms.uCadence.value) * Math.min(1, dt * 10);

      const spinRate =
        1 + uniforms.uSpeak.value * 0.5 + uniforms.uThink.value * 1.1 + uniforms.uListen.value * (0.3 + smoothedEnergy * 0.6);
      coreMesh.rotation.y += dt * 0.16 * spinRate;
      coreMesh.rotation.x = Math.sin(elapsed * 0.5) * 0.06;

      ringMesh.rotation.z += dt * 0.22 * spinRate;
      ringMesh.rotation.x = Math.PI / 2.35 + Math.sin(elapsed * 0.7) * 0.04;

      ringMaterial.color
        .copy(colRingIdle)
        .lerp(colSky, uniforms.uSpeak.value * 0.65)
        .lerp(colEmerald, uniforms.uListen.value * 0.65);
      ringMaterial.opacity =
        0.14 + uniforms.uSpeak.value * 0.08 + uniforms.uListen.value * (0.05 + smoothedEnergy * 0.12);

      const breath =
        1 +
        Math.sin(elapsed * 1.5) * 0.01 +
        uniforms.uSpeak.value * 0.02 * uniforms.uCadence.value +
        uniforms.uListen.value * 0.028 * smoothedEnergy;
      group.scale.setScalar(breath);

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (!rafId && !document.hidden) {
        lastNow = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };

    const stopLoop = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
      } else {
        startLoop();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    startLoop();

    return () => {
      stopLoop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      ro?.disconnect();
      scene.remove(group);
      coreGeometry.dispose();
      coreMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [fallback, size]);

  const modeClass = speaking
    ? "is-speaking"
    : listening
      ? "is-listening"
      : thinking
        ? "is-thinking"
        : "is-idle";

  const avatarStyle = size ? ({ "--ai-size": `${size}px` } as CSSProperties) : undefined;

  return (
    <div
      ref={hostRef}
      className={`ai-avatar ${modeClass} ${fallback ? "is-fallback" : "is-webgl"} ${className}`.trim()}
      style={avatarStyle}
      aria-hidden="true"
    >
      {fallback && (
        <>
          <span className="ai-avatar__ring" />
          <span className="ai-avatar__core" />
        </>
      )}
    </div>
  );
}

export interface TranscriptListProps {
  turns: readonly TranscriptTurn[];
  interim?: string;
  youLabel?: string;
  aiLabel?: string;
  emptyLabel?: string;
}

/** Danh sách lượt hội thoại phẳng chuẩn editorial (không lồng hộp trong hộp, phân tách bằng đường mảnh 1px). */
export function TranscriptList({
  turns,
  interim,
  youLabel = "Bạn",
  aiLabel = "AI Interviewer",
  emptyLabel = "Chưa có lượt hội thoại nào được ghi nhận.",
}: TranscriptListProps) {
  const listRef = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [turns.length, interim]);

  if (turns.length === 0 && !interim) {
    return <p className="room-transcript__empty">{emptyLabel}</p>;
  }

  return (
    <ol className="room-transcript" aria-live="polite" ref={listRef}>
      {turns.map((t, i) => {
        const roleLabel = t.who === "ai" ? aiLabel : t.who === "hint" ? "Gợi ý định hướng" : youLabel;
        const stamp = t.timestamp || String(i + 1).padStart(2, "0");
        return (
          <li key={t.id ?? `${t.who}-${i}-${stamp}`} className={`room-turn room-turn--${t.who}`}>
            <div className="room-turn__meta">
              <span className="room-turn__speaker">{roleLabel}</span>
              <span className="t-mono room-turn__idx">{stamp}</span>
            </div>
            <p className="room-turn__text">{t.text}</p>
          </li>
        );
      })}
      {interim && (
        <li className="room-turn room-turn--you is-interim">
          <div className="room-turn__meta">
            <span className="room-turn__speaker">{youLabel} · đang nói</span>
            <span className="room-turn__live-dot" aria-hidden="true" />
          </div>
          <p className="room-turn__text">{interim}</p>
        </li>
      )}
    </ol>
  );
}
