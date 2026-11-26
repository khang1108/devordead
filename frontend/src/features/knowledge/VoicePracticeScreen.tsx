import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import * as THREE from "three";
import Waveform from "@shared/components/Waveform";
import { getErrorMessage } from "@shared/services/apiClient";
import { speakText, startMicrophoneStream, type LiveMicHandle } from "@shared/services/audioEngine";
import type { VoiceAnswerEvaluation, VoiceSessionData } from "@shared/types";
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHead,
  EmptyState,
  ErrorBanner,
  Field,
  PageHeader,
  ProgressBar,
  RuleTag,
  Skeleton,
} from "@shared/ui";
import { knowledgeService, type EvaluateVoiceAnswerPayload } from "./knowledge.service";
import "./VoicePracticeScreen.css";

type VoicePhase = "ready" | "recording" | "evaluating" | "feedback";

interface VoiceRouteState {
  topicId?: string;
  topicName?: string;
}

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
    float activeAmp = uSpeak * (0.022 + 0.010 * uCadence) + uListen * 0.016 + uThink * 0.012;
    float disp = n1 * (idleAmp + activeAmp) + harmonic * (uSpeak * 0.010 * uCadence + uListen * 0.006);

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

    vec3 keyDir = normalize(vec3(-0.52, 0.74, 0.86));
    float wrap = clamp((dot(N, keyDir) + 0.52) / 1.52, 0.0, 1.0);
    float spec = pow(max(dot(N, keyDir), 0.0), 7.0);

    vec3 scatter = uCeramicMid;
    scatter = mix(scatter, mix(uCeramicMid, uSky, 0.52), clamp(uSpeak * (0.65 + 0.35 * uCadence) + uThink * 0.35, 0.0, 1.0));
    scatter = mix(scatter, mix(uCeramicMid, uEmerald, 0.48), clamp(uListen * 0.85, 0.0, 1.0));

    vec3 body = mix(uShadow, scatter, smoothstep(0.0, 0.58, wrap));
    body = mix(body, uPearl, smoothstep(0.42, 1.0, wrap));

    vec3 rimTint = mix(uShadow * 1.35, uSky, clamp(uSpeak * 0.65, 0.0, 1.0));
    rimTint = mix(rimTint, uEmerald, clamp(uListen * 0.6, 0.0, 1.0));

    float subtleBand = smoothstep(0.35, 0.85, vWave) * (uSpeak * 0.06 + uListen * 0.05);
    vec3 col = mix(body, rimTint, fresnel * 0.36) + uPearl * spec * 0.14 + scatter * subtleBand;

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

interface VoiceOrbProps {
  speaking?: boolean;
  listening?: boolean;
  thinking?: boolean;
  size?: number;
}

function VoiceOrb({ speaking = false, listening = false, thinking = false, size = 92 }: VoiceOrbProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({ speaking, listening, thinking });
  stateRef.current = { speaking, listening, thinking };

  const [fallback, setFallback] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : true,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setFallback(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
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
    canvas.className = "voice-orb__canvas";
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
    camera.position.set(0, 0, 4.35);

    const group = new THREE.Group();
    scene.add(group);

    const colSky = new THREE.Color("#2484B5");
    const colEmerald = new THREE.Color("#16794C");
    const colRingIdle = new THREE.Color("#525866");

    const uniforms = {
      uTime: { value: 0 },
      uSpeak: { value: speaking ? 1 : 0 },
      uListen: { value: listening ? 1 : 0 },
      uThink: { value: thinking ? 1 : 0 },
      uCadence: { value: 0.5 },
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
      const w = Math.max(64, host.clientWidth || size);
      const h = Math.max(64, host.clientHeight || size);
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

      const voiceCadence = 0.5 + 0.5 * Math.sin(elapsed * 6.2) * Math.cos(elapsed * 2.7 + 0.8);
      uniforms.uCadence.value = voiceCadence;

      const spinRate =
        1 + uniforms.uSpeak.value * 0.5 + uniforms.uThink.value * 1.1 + uniforms.uListen.value * 0.3;
      coreMesh.rotation.y += dt * 0.16 * spinRate;
      coreMesh.rotation.x = Math.sin(elapsed * 0.5) * 0.06;

      ringMesh.rotation.z += dt * 0.22 * spinRate;
      ringMesh.rotation.x = Math.PI / 2.35 + Math.sin(elapsed * 0.7) * 0.04;

      ringMaterial.color
        .copy(colRingIdle)
        .lerp(colSky, uniforms.uSpeak.value * 0.65)
        .lerp(colEmerald, uniforms.uListen.value * 0.65);
      ringMaterial.opacity = 0.14 + uniforms.uSpeak.value * 0.08 + uniforms.uListen.value * 0.06;

      const breath = 1 + Math.sin(elapsed * 1.5) * 0.01 + uniforms.uSpeak.value * 0.02 * voiceCadence;
      group.scale.setScalar(breath);

      renderer.render(scene, camera);
      rafId = window.requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (!rafId && !document.hidden) {
        lastNow = performance.now();
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const stopLoop = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) stopLoop();
      else startLoop();
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

  const style = { "--orb-size": `${size}px` } as CSSProperties;

  return (
    <div ref={hostRef} className={`voice-orb ${modeClass}`} style={style} aria-hidden="true">
      {fallback && (
        <>
          <span className="voice-orb__ring" />
          <span className="voice-orb__core" />
        </>
      )}
    </div>
  );
}

function formatSeconds(sec: number): string {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function formatLatency(latencyMs?: number): string {
  if (typeof latencyMs !== "number" || Number.isNaN(latencyMs)) return "≤ 2,5s";
  return `${(latencyMs / 1000).toFixed(2).replace(".", ",")}s`;
}

function SpeakerIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="3 6 6.5 6 10.5 2.5 10.5 13.5 6.5 10 3 10" />
      <path d="M13 5.5a3.5 3.5 0 0 1 0 5" />
    </svg>
  );
}

interface FeedbackGroupProps {
  tone: "success" | "warning" | "danger";
  marker: string;
  title: string;
  items: readonly string[];
}

function FeedbackGroup({ tone, marker, title, items }: FeedbackGroupProps) {
  if (items.length === 0) return null;
  return (
    <div className="voice__rubric-section">
      <p className="voice__rubric-heading">{title}</p>
      <ul className={`voice__rubric voice__rubric--${tone}`}>
        {items.map((it) => (
          <li key={it} className="voice__rubric-item">
            <span className="voice__rubric-mark" aria-hidden="true">
              {marker}
            </span>
            <span className="t-body-s voice__rubric-text">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function VoicePracticeScreen() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const routeState = (location.state as VoiceRouteState | null) ?? null;

  const topicId = searchParams.get("topic") ?? routeState?.topicId ?? "default";

  const [session, setSession] = useState<VoiceSessionData | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<VoicePhase>("ready");
  const [followUp, setFollowUp] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(() => new Set());

  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [draftTranscript, setDraftTranscript] = useState("");
  const [evaluation, setEvaluation] = useState<VoiceAnswerEvaluation | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  const micHandleRef = useRef<LiveMicHandle | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const ttsCancelRef = useRef<(() => void) | null>(null);
  const lastPayloadRef = useRef<EvaluateVoiceAnswerPayload | null>(null);

  const stopTts = useCallback(() => {
    ttsCancelRef.current?.();
    ttsCancelRef.current = null;
    setTtsPlaying(false);
  }, []);

  const stopMicHardware = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      const handle = micHandleRef.current;
      mediaRecorderRef.current = null;
      micHandleRef.current = null;
      setAnalyser(null);

      const finishHardware = (blob: Blob | null) => {
        handle?.stop();
        audioChunksRef.current = [];
        resolve(blob);
      };

      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = () => {
          const mimeType = recorder.mimeType || "audio/webm";
          const blob =
            audioChunksRef.current.length > 0
              ? new Blob(audioChunksRef.current, { type: mimeType })
              : null;
          finishHardware(blob);
        };
        try {
          recorder.stop();
        } catch {
          finishHardware(null);
        }
      } else {
        finishHardware(null);
      }
    });
  }, []);

  const reloadSession = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  // Nạp phiên luyện giọng nói từ API
  useEffect(() => {
    const controller = new AbortController();
    setSessionLoading(true);
    setSessionError(null);
    setSession(null);
    setIndex(0);
    setFollowUp(false);
    setFollowUpQuestion(null);
    setEvaluation(null);
    setEvalError(null);
    setPhase("ready");
    setCompleted(new Set());

    void knowledgeService
      .getVoiceSession(topicId, controller.signal)
      .then((data) => {
        setSession(data);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setSessionError(getErrorMessage(err, "Không thể tải phiên luyện giọng nói từ máy chủ API."));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setSessionLoading(false);
        }
      });

    return () => controller.abort();
  }, [topicId, reloadTick]);

  // Đồng hồ đếm thời gian ghi âm thực
  useEffect(() => {
    if (phase !== "recording") return undefined;
    const id = window.setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // Giải phóng micro & TTS khi rời màn hình
  useEffect(() => {
    return () => {
      ttsCancelRef.current?.();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      micHandleRef.current?.stop();
      micHandleRef.current = null;
    };
  }, []);

  const questions = session?.questions ?? [];
  const topicTitle = session?.topicName ?? routeState?.topicName ?? "Luyện kiến thức bằng giọng nói";
  const baseQuestion = questions[index] ?? "";
  const currentQuestion = followUp && followUpQuestion ? followUpQuestion : baseQuestion;
  const hasActiveSession = questions.length > 0 && Boolean(currentQuestion);

  const toggleSpeakQuestion = () => {
    if (!currentQuestion) return;
    if (ttsPlaying) {
      stopTts();
      return;
    }
    setTtsPlaying(true);
    ttsCancelRef.current = speakText(currentQuestion, "vi-VN", () => {
      ttsCancelRef.current = null;
      setTtsPlaying(false);
    });
  };

  const submitEvaluation = async (payload: EvaluateVoiceAnswerPayload) => {
    lastPayloadRef.current = payload;
    setEvalError(null);
    setPhase("evaluating");

    try {
      const result = await knowledgeService.evaluateVoiceAnswer(payload);
      setEvaluation(result);
      if (result.transcript) {
        setDraftTranscript(result.transcript);
      }
      setPhase("feedback");
      setCompleted((prev) => {
        const next = new Set(prev);
        next.add(payload.questionIndex);
        return next;
      });
    } catch (err) {
      setEvalError(getErrorMessage(err, "Không thể gửi câu trả lời tới máy chủ chấm điểm."));
      setPhase("ready");
    }
  };

  const startRecording = async () => {
    stopTts();
    setMicError(null);
    setEvalError(null);

    try {
      const handle = await startMicrophoneStream();
      micHandleRef.current = handle;
      setAnalyser(handle.analyser);
      audioChunksRef.current = [];

      if (typeof MediaRecorder !== "undefined") {
        try {
          const recorder = new MediaRecorder(handle.stream);
          recorder.ondataavailable = (ev: BlobEvent) => {
            if (ev.data.size > 0) {
              audioChunksRef.current.push(ev.data);
            }
          };
          recorder.start();
          mediaRecorderRef.current = recorder;
        } catch {
          mediaRecorderRef.current = null;
        }
      }

      setElapsedSec(0);
      setPhase("recording");
    } catch (err) {
      setMicError(
        getErrorMessage(
          err,
          "Không thể mở micro. Hãy kiểm tra quyền truy cập micro trên trình duyệt hoặc nhập câu trả lời bằng văn bản bên dưới.",
        ),
      );
    }
  };

  const cancelRecording = async () => {
    await stopMicHardware();
    setElapsedSec(0);
    setPhase("ready");
  };

  const stopAndEvaluate = async () => {
    const duration = elapsedSec;
    const blob = await stopMicHardware();

    if (!hasActiveSession) {
      setPhase("ready");
      return;
    }

    await submitEvaluation({
      topicId: session?.topicId ?? topicId,
      questionIndex: index,
      question: currentQuestion,
      isFollowUp: followUp,
      transcript: draftTranscript.trim() || undefined,
      audioBlob: blob ?? undefined,
      durationSec: duration,
    });
  };

  const handleSubmitTypedAnswer = async () => {
    if (!hasActiveSession || !draftTranscript.trim()) return;
    stopTts();
    await submitEvaluation({
      topicId: session?.topicId ?? topicId,
      questionIndex: index,
      question: currentQuestion,
      isFollowUp: followUp,
      transcript: draftTranscript.trim(),
      durationSec: elapsedSec,
    });
  };

  const handleRetryEvaluation = async () => {
    if (!lastPayloadRef.current) return;
    await submitEvaluation(lastPayloadRef.current);
  };

  const selectQuestion = (nextIdx: number) => {
    stopTts();
    void stopMicHardware();
    setIndex(nextIdx);
    setFollowUp(false);
    setFollowUpQuestion(null);
    setElapsedSec(0);
    setDraftTranscript("");
    setEvaluation(null);
    setEvalError(null);
    setMicError(null);
    setPhase("ready");
  };

  const nextQuestion = () => {
    if (questions.length === 0) return;
    const nextIdx = Math.min(questions.length - 1, index + 1);
    selectQuestion(nextIdx);
  };

  const handleStartFollowUp = () => {
    const nextFollowUp = evaluation?.feedback.followUp;
    if (!nextFollowUp) return;
    stopTts();
    setFollowUp(true);
    setFollowUpQuestion(nextFollowUp);
    setEvaluation(null);
    setEvalError(null);
    setDraftTranscript("");
    setElapsedSec(0);
    setPhase("ready");
    setTtsPlaying(true);
    ttsCancelRef.current = speakText(nextFollowUp, "vi-VN", () => {
      ttsCancelRef.current = null;
      setTtsPlaying(false);
    });
  };

  const fb = evaluation?.feedback ?? null;

  return (
    <div className="voice">
      <PageHeader
        eyebrow="Luyện giọng nói · UC05, UC06"
        title={topicTitle}
        subtitle="Nghe câu hỏi mở, trả lời theo lượt qua micro thật và nhận phân tích rubric tức thì kèm câu hỏi đào sâu."
        actions={
          <div className="row wrap stack-sm">
            <RuleTag code="BR4">Ngân hàng đã duyệt</RuleTag>
            <Link to="/knowledge" className="btn btn--secondary btn--sm">
              Đổi chủ đề
            </Link>
          </div>
        }
      />

      {sessionLoading ? (
        <div className="col stack-lg" aria-busy="true" aria-label="Đang tải phiên luyện giọng nói">
          <Card>
            <Skeleton width="100%" height={40} />
          </Card>
          <div className="voice__grid">
            <div className="col voice__left">
              <Card>
                <Skeleton width="42%" height={18} />
                <Skeleton width="90%" height={28} />
                <Skeleton width="35%" height={34} />
              </Card>
              <Card>
                <Skeleton width="50%" height={20} />
                <Skeleton width="100%" height={68} />
                <Skeleton width="45%" height={36} />
              </Card>
            </div>
            <Card className="voice__feedback">
              <Skeleton width="60%" height={18} />
              <Skeleton width="100%" height={140} />
              <Skeleton width="80%" height={24} />
            </Card>
          </div>
        </div>
      ) : (
        <>
          {sessionError && (
            <ErrorBanner
              title="Chưa tải được phiên câu hỏi từ máy chủ API"
              message={sessionError}
              onRetry={reloadSession}
              actions={
                <Link to="/knowledge" className="btn btn--secondary btn--sm">
                  Về kho tri thức
                </Link>
              }
            />
          )}

          {!sessionError && questions.length === 0 && (
            <EmptyState
              title="Chủ đề này chưa có câu hỏi luyện giọng nói"
              description="Vui lòng chọn một chủ đề khác đã được duyệt (BR4) trong Kho tri thức hoặc tải lại."
              actions={
                <>
                  <Link to="/knowledge" className="btn btn--primary">
                    Chọn chủ đề khác
                  </Link>
                  <Button variant="secondary" onClick={reloadSession}>
                    Tải lại
                  </Button>
                </>
              }
            />
          )}

          {hasActiveSession && (
            <ol className="voice__stepper" aria-label={`Tiến độ ${questions.length} câu hỏi`}>
              {questions.map((q, i) => {
                const isDone = completed.has(i) && i !== index;
                const isCurrent = i === index;
                return (
                  <li key={`${i}-${q.slice(0, 24)}`} className="voice__stepper-cell">
                    <button
                      type="button"
                      onClick={() => selectQuestion(i)}
                      aria-current={isCurrent ? "step" : undefined}
                      className={`voice__step ${isDone ? "is-done" : isCurrent ? "is-current" : ""}`}
                    >
                      <span className="voice__step-dot" aria-hidden="true">
                        {isDone ? "✓" : i + 1}
                      </span>
                      <span className="voice__step-label">
                        Câu {i + 1}
                        <span className="voice__step-sub">
                          {isDone ? " · Đã xong" : isCurrent ? (followUp ? " · Đào sâu" : " · Đang mở") : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}

          {(hasActiveSession || sessionError) && (
            <div className="voice__grid">
              <div className="col voice__left">
                {hasActiveSession && (
                  <Card className="voice__question">
                    <div className="voice__stage-row">
                      <div className="voice__orb-wrap">
                        <VoiceOrb
                          size={92}
                          speaking={ttsPlaying}
                          listening={phase === "recording"}
                          thinking={phase === "evaluating"}
                        />
                        <span className="voice__orb-caption">
                          {ttsPlaying
                            ? "Đang đọc TTS"
                            : phase === "recording"
                              ? "Đang lắng nghe"
                              : phase === "evaluating"
                                ? "Đang chấm..."
                                : "AI sẵn sàng"}
                        </span>
                      </div>

                      <div className="col grow voice__prompt">
                        <div className="row between wrap stack-sm">
                          <div className="row wrap stack-sm">
                            <Badge tone={followUp ? "warning" : "brand"} dot>
                              {followUp ? "Câu hỏi đào sâu" : `Câu ${index + 1} / ${questions.length}`}
                            </Badge>
                            <span className="t-body-s c-ink2">Có phụ đề TTS (NFR08)</span>
                            {skipped > 0 && <span className="t-body-s c-ink2">· Đã bỏ qua {skipped}</span>}
                          </div>
                        </div>

                        <h2 className="t-heading-m voice__q-text" aria-live="polite">
                          {currentQuestion}
                        </h2>

                        <div className="row wrap stack-sm">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={toggleSpeakQuestion}
                            aria-pressed={ttsPlaying}
                          >
                            <SpeakerIcon />
                            {ttsPlaying ? "Dừng đọc TTS" : "Nghe câu hỏi (TTS)"}
                          </Button>
                          {!followUp && index < questions.length - 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSkipped((s) => s + 1);
                                nextQuestion();
                              }}
                            >
                              Bỏ qua câu này
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Bàn thu âm Studio nền sáng + Web Audio API FFT thật */}
                <Card className="voice__recorder">
                  <div className="row between wrap">
                    <div className="row stack-sm">
                      <span
                        className={`voice__status-dot ${
                          phase === "recording" ? "is-rec" : phase === "feedback" ? "is-done" : ""
                        }`}
                        aria-hidden="true"
                      />
                      <p className="t-heading-s">
                        {phase === "recording"
                          ? "Đang thu âm lượt trả lời"
                          : phase === "evaluating"
                            ? "Đang nhận dạng STT & phân tích rubric..."
                            : phase === "feedback" && fb
                              ? `Đã chấm xong · Phản hồi ${formatLatency(fb.latencyMs)}`
                              : hasActiveSession
                                ? "Thu âm theo lượt (Turn-based)"
                                : "Kiểm tra micro & sóng âm trực tiếp"}
                      </p>
                    </div>
                    <p className="t-mono voice__timer">{formatSeconds(elapsedSec)}</p>
                  </div>

                  <div className="voice__wave-well">
                    <Waveform
                      analyser={analyser}
                      active={phase === "recording"}
                      height={52}
                      color="var(--ink)"
                      idleColor="rgba(17, 20, 24, 0.14)"
                      latencyLabel="Phản hồi ≤ 2,5s"
                    />
                  </div>

                  {micError && (
                    <Callout tone="danger" role="alert" title="Không thể truy cập micro">
                      {micError}
                    </Callout>
                  )}

                  <div className="row between wrap">
                    <div className="row wrap stack-sm">
                      {phase === "ready" && (
                        <Button variant="primary" onClick={() => void startRecording()}>
                          <span className="voice__rec-dot" aria-hidden="true" />
                          Bắt đầu ghi âm
                        </Button>
                      )}
                      {phase === "recording" && (
                        <>
                          <Button variant="primary" onClick={() => void stopAndEvaluate()}>
                            {hasActiveSession ? "Dừng & gửi câu trả lời" : "Dừng ghi âm"}
                          </Button>
                          <Button variant="secondary" onClick={() => void cancelRecording()}>
                            Hủy &amp; ghi lại (A1)
                          </Button>
                        </>
                      )}
                      {phase === "evaluating" && (
                        <Button variant="secondary" disabled>
                          <span className="spinner" aria-hidden="true" /> Đang đánh giá câu trả lời...
                        </Button>
                      )}
                      {phase === "feedback" && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setElapsedSec(0);
                            setEvaluation(null);
                            setPhase("ready");
                          }}
                        >
                          Trả lời lại câu này
                        </Button>
                      )}
                    </div>

                    <span className="t-body-s c-ink2">HTTPS/WSS mã hóa (NFR03)</span>
                  </div>
                </Card>

                {/* Bản ghi giọng nói (STT) & ô nhập văn bản dự phòng */}
                <Card className="voice__transcript">
                  <CardHead title="Bản ghi giọng nói (STT) & nhập dự phòng">
                    {phase === "feedback" ? (
                      <Badge tone="success" dot>
                        Đã nhận dạng
                      </Badge>
                    ) : phase === "recording" ? (
                      <Badge tone="brand" dot>
                        Đang thu âm
                      </Badge>
                    ) : (
                      <Badge tone="neutral">Chờ trả lời</Badge>
                    )}
                  </CardHead>

                  {phase === "feedback" && evaluation?.transcript ? (
                    <p className="t-body-m voice__final-transcript">“{evaluation.transcript}”</p>
                  ) : (
                    <div className="voice__manual-form">
                      <Field
                        multiline
                        label="Nhập câu trả lời bằng văn bản (hoặc bổ sung ghi chú kỹ thuật)"
                        placeholder="Bạn có thể ghi âm trực tiếp ở trên hoặc nhập câu trả lời tại đây để gửi chấm theo rubric..."
                        value={draftTranscript}
                        onChange={(e) => setDraftTranscript(e.target.value)}
                        disabled={phase === "evaluating"}
                      />
                      <div className="row between wrap">
                        <span className="t-body-s c-ink2">
                          Hỗ trợ chấm đồng thời từ tệp âm thanh hoặc bản ghi văn bản.
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={
                            !hasActiveSession ||
                            !draftTranscript.trim() ||
                            phase === "evaluating" ||
                            phase === "recording"
                          }
                          onClick={() => void handleSubmitTypedAnswer()}
                        >
                          Gửi câu trả lời văn bản
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* Cột phải: Đánh giá & phản hồi tức thì (UC06) */}
              <Card as="aside" className="voice__feedback" aria-label="Đánh giá & phản hồi" aria-live="polite">
                <CardHead title="Đánh giá & phản hồi (UC06)">
                  {phase === "feedback" && fb && (
                    <Badge tone="success" dot>
                      {formatLatency(fb.latencyMs)}
                    </Badge>
                  )}
                </CardHead>

                {evalError && (
                  <ErrorBanner
                    title="Không thể chấm câu trả lời"
                    message={evalError}
                    onRetry={() => void handleRetryEvaluation()}
                  />
                )}

                {phase !== "feedback" || !fb ? (
                  <div className="empty voice__empty">
                    {phase === "evaluating" || phase === "recording" ? (
                      <span className="spinner" aria-hidden="true" />
                    ) : null}
                    <p className="t-heading-s">
                      {phase === "evaluating"
                        ? "Đang phân tích điểm đúng & điểm thiếu..."
                        : phase === "recording"
                          ? "Đang ghi nhận câu trả lời từ micro..."
                          : "Chưa có dữ liệu đánh giá"}
                    </p>
                    <p className="t-body-s c-ink2">
                      Sau mỗi lượt trả lời, hệ thống chỉ rõ ý đúng (✓), phần còn thiếu (!), điểm sai (×) và đặt câu hỏi đào sâu để rèn phản xạ phỏng vấn.
                    </p>
                  </div>
                ) : (
                  <div className="col voice__fb-body">
                    <div className="voice__score-row">
                      <div className="row between">
                        <div className="row voice__score-inline">
                          <p className="t-number">{fb.score}/10</p>
                          <p className="t-body-s c-ink2">độ chính xác kỹ thuật</p>
                        </div>
                      </div>
                      <ProgressBar
                        value={fb.score / 10}
                        tone={fb.score >= 7 ? "success" : fb.score >= 4 ? "brand" : "warning"}
                        label="Điểm độ chính xác kỹ thuật"
                      />
                    </div>

                    <FeedbackGroup
                      tone="success"
                      marker="✓"
                      title="Điểm đúng về kỹ thuật"
                      items={fb.correct}
                    />

                    <FeedbackGroup
                      tone="warning"
                      marker="!"
                      title="Cần bổ sung"
                      items={fb.missing}
                    />

                    <FeedbackGroup
                      tone="danger"
                      marker="×"
                      title="Điểm chưa chính xác"
                      items={fb.wrong}
                    />

                    <div className="voice__followup-section">
                      {!followUp && fb.followUp ? (
                        <Callout tone="brand" title="Câu hỏi đào sâu (Follow-up)">
                          <p className="t-body-s t-strong voice__followup-text">{fb.followUp}</p>
                        </Callout>
                      ) : followUp ? (
                        <Callout tone="success" title="Đã hoàn thành câu đào sâu">
                          Bằng chứng của lượt chính và lượt đào sâu đã được lưu vào hồ sơ năng lực.
                        </Callout>
                      ) : null}
                    </div>

                    <div className="col stack-sm voice__actions">
                      {!followUp && fb.followUp && (
                        <Button variant="primary" block onClick={handleStartFollowUp}>
                          Trả lời câu đào sâu
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        block
                        onClick={nextQuestion}
                        disabled={index >= questions.length - 1}
                      >
                        {index < questions.length - 1
                          ? `Sang câu ${index + 2} / ${questions.length}`
                          : "Đã ở câu cuối"}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="row wrap stack-sm voice__rules">
                  <RuleTag code="NFR01">Phản hồi ≤ 2,5s</RuleTag>
                  <RuleTag code="BR4">Câu đào sâu chỉ dùng tạm</RuleTag>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
