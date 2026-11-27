import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import type { EditorPasteGuard } from "@shared/components/CodeEditor";
import { getErrorMessage } from "@shared/services/apiClient";
import { localStore } from "@shared/services/localStore";
import type { ExamEventType, ExamSession } from "@shared/types";
import { examService, type ExamEventPayload } from "./exam.service";

/**
 * Vòng đời Chế độ thi trên trang luyện tập.
 *
 * idle      → chưa thi (luyện tập bình thường)
 * starting  → đang xin toàn màn hình + tạo phiên trên máy chủ
 * active    → đang thi, mọi listener giám sát đang bật
 * resume    → vừa tải lại trang giữa giờ thi, chờ người dùng bấm "Tiếp tục" (cần cử chỉ để vào lại toàn màn hình)
 * finished  → phiên đã đóng (nộp bài / hết giờ), hiện báo cáo
 *
 * Mọi thứ ở đây chỉ là tín hiệu do trình duyệt báo lên; máy chủ mới là nơi tính điểm trung thực.
 */
export type ExamPhase = "idle" | "starting" | "active" | "resume" | "finished";

const FLUSH_INTERVAL_MS = 4000;
/** Bỏ qua các lần mất focus quá ngắn (hộp thoại hệ thống chớp qua, thông báo…). */
const BLUR_MIN_MS = 1500;
const NOTICE_MS = 4200;
const MAX_REMEMBERED_CLIPS = 30;

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: (options?: FullscreenOptions) => Promise<void> | void;
};

function getFullscreenElement(): Element | null {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function isFullscreenSupported(): boolean {
  const doc = document as FullscreenDocument;
  return Boolean(doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled);
}

/** Phải được gọi đồng bộ trong một cử chỉ người dùng (click) thì trình duyệt mới cho phép. */
function requestFullscreen(): Promise<void> {
  const el = document.documentElement as FullscreenElement;
  try {
    if (el.requestFullscreen) return el.requestFullscreen({ navigationUI: "hide" });
    if (el.webkitRequestFullscreen) return Promise.resolve(el.webkitRequestFullscreen());
  } catch (err) {
    return Promise.reject(err);
  }
  return Promise.reject(new Error("Fullscreen API không được hỗ trợ"));
}

function exitFullscreen(): Promise<void> {
  if (!getFullscreenElement()) return Promise.resolve();
  const doc = document as FullscreenDocument;
  try {
    if (doc.exitFullscreen) return doc.exitFullscreen().catch(() => undefined);
    if (doc.webkitExitFullscreen) return Promise.resolve(doc.webkitExitFullscreen());
  } catch {
    // ignore
  }
  return Promise.resolve();
}

function normalizeClip(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

export function formatAwayDuration(ms: number): string {
  const totalSec = Math.max(1, Math.round(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec} giây`;
  return sec === 0 ? `${min} phút` : `${min} phút ${sec} giây`;
}

export function formatCountdown(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface UseExamModeOptions {
  problemId: string;
  /** false cho Sandbox tự do — không có bộ test chính thức nên không thi được. */
  enabled: boolean;
}

export function useExamMode({ problemId, enabled }: UseExamModeOptions) {
  const [phase, setPhase] = useState<ExamPhase>("idle");
  const [session, setSession] = useState<ExamSession | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(getFullscreenElement()));
  const [violations, setViolations] = useState(0);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const phaseRef = useRef<ExamPhase>(phase);
  phaseRef.current = phase;
  const sessionIdRef = useRef<string | null>(null);
  const queueRef = useRef<ExamEventPayload[]>([]);
  const flushingRef = useRef<Promise<void> | null>(null);
  const clockOffsetRef = useRef(0);
  const clipsRef = useRef<string[]>([]);
  const noticeTimerRef = useRef<number | null>(null);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);

  const adopt = useCallback((s: ExamSession) => {
    clockOffsetRef.current = new Date(s.serverNow).getTime() - Date.now();
    sessionIdRef.current = s.id;
    setSession(s);
  }, []);

  const flush = useCallback(async (): Promise<void> => {
    if (flushingRef.current) await flushingRef.current;
    const sessionId = sessionIdRef.current;
    if (!sessionId || queueRef.current.length === 0) return;
    const batch = queueRef.current.splice(0, queueRef.current.length);
    const task = examService
      .sendExamEvents(sessionId, batch)
      .then(() => undefined)
      .catch(() => {
        // Mất mạng tạm thời: giữ lại để gửi lần sau, trừ khi phiên đã đóng.
        if (phaseRef.current === "active" || phaseRef.current === "resume") {
          queueRef.current.unshift(...batch);
        }
      })
      .finally(() => {
        flushingRef.current = null;
      });
    flushingRef.current = task;
    await task;
  }, []);

  const record = useCallback(
    (type: ExamEventType, extra: { durationMs?: number; chars?: number } = {}, message?: string) => {
      if (phaseRef.current !== "active") return;
      queueRef.current.push({
        type,
        at: new Date().toISOString(),
        durationMs: Math.round(extra.durationMs ?? 0),
        chars: extra.chars ?? 0,
      });
      setViolations((n) => n + 1);
      if (message) showNotice(message);
    },
    [showNotice],
  );

  const rememberClip = useCallback((text: string) => {
    if (!text) return;
    const clip = normalizeClip(text);
    const next = clipsRef.current.filter((c) => c !== clip);
    next.push(clip);
    clipsRef.current = next.slice(-MAX_REMEMBERED_CLIPS);
  }, []);

  const pasteGuard = useMemo<EditorPasteGuard>(
    () => ({
      isAllowedPaste: (text) => clipsRef.current.includes(normalizeClip(text)),
      onInternalCopy: rememberClip,
      onBlocked: (kind, chars) =>
        record(
          kind === "paste" ? "paste_blocked" : "drop_blocked",
          { chars },
          kind === "paste"
            ? "Đã chặn dán nội dung từ bên ngoài trang — chỉ được dán đoạn đã copy trong bài thi."
            : "Đã chặn kéo-thả văn bản từ bên ngoài vào trình soạn thảo.",
        ),
      onLargeInsert: (chars) => record("large_insert", { chars }),
    }),
    [record, rememberClip],
  );

  const resetLocalState = useCallback(() => {
    queueRef.current = [];
    clipsRef.current = [];
    setViolations(0);
    setNotice(null);
    setRemainingSec(null);
  }, []);

  // ——— Hành động ———

  const start = useCallback(
    async (durationMinutes: number): Promise<ExamSession | null> => {
      setError(null);
      // Gọi ngay trong click handler, trước mọi await, để không mất "user activation".
      const fullscreen = requestFullscreen();
      setPhase("starting");
      const [fsResult, sessionResult] = await Promise.allSettled([
        fullscreen,
        examService.startExam(problemId, durationMinutes),
      ]);

      if (fsResult.status === "rejected") {
        if (sessionResult.status === "fulfilled") {
          void examService.abandonExam(sessionResult.value.id).catch(() => undefined);
        }
        setPhase("idle");
        setError("Trình duyệt không cho bật toàn màn hình. Chế độ thi bắt buộc toàn màn hình — hãy dùng trình duyệt trên máy tính và thử lại.");
        return null;
      }
      if (sessionResult.status === "rejected") {
        await exitFullscreen();
        setPhase("idle");
        setError(getErrorMessage(sessionResult.reason, "Không tạo được phiên thi. Hãy kiểm tra kết nối Backend."));
        return null;
      }

      resetLocalState();
      adopt(sessionResult.value);
      localStore.setActiveExam({ sessionId: sessionResult.value.id, problemId });
      setIsFullscreen(true);
      setPhase("active");
      return sessionResult.value;
    },
    [problemId, adopt, resetLocalState],
  );

  const resume = useCallback(async () => {
    setError(null);
    try {
      await requestFullscreen();
    } catch {
      setError("Không bật lại được toàn màn hình. Hãy thử lại.");
      return;
    }
    setIsFullscreen(true);
    phaseRef.current = "active";
    setPhase("active");
    record("resumed", {}, "Đã ghi nhận: tải lại trang trong lúc thi.");
  }, [record]);

  const reenterFullscreen = useCallback(async () => {
    setError(null);
    try {
      await requestFullscreen();
    } catch {
      setError("Không bật lại được toàn màn hình. Hãy thử lại.");
    }
  }, []);

  /** Gọi khi máy chủ đã đóng phiên (nộp bài thành công, hết giờ…). */
  const finish = useCallback(
    (closed: ExamSession) => {
      queueRef.current = [];
      adopt(closed);
      localStore.setActiveExam(null);
      setPhase("finished");
      void exitFullscreen();
    },
    [adopt],
  );

  const refresh = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    try {
      const s = await examService.getExam(sessionId);
      if (s.status === "active") adopt(s);
      else finish(s);
    } catch {
      // giữ nguyên trạng thái
    }
  }, [adopt, finish]);

  const abandon = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    await flush();
    if (sessionId) {
      await examService.abandonExam(sessionId).catch(() => undefined);
    }
    localStore.setActiveExam(null);
    sessionIdRef.current = null;
    setSession(null);
    resetLocalState();
    setPhase("idle");
    await exitFullscreen();
  }, [flush, resetLocalState]);

  const dismiss = useCallback(() => {
    sessionIdRef.current = null;
    setSession(null);
    resetLocalState();
    setPhase("idle");
  }, [resetLocalState]);

  // ——— Tiếp tục phiên thi khi lỡ tải lại trang ———
  useEffect(() => {
    if (!enabled) return undefined;
    const saved = localStore.getActiveExam();
    if (!saved || saved.problemId !== problemId) return undefined;
    const controller = new AbortController();
    void examService
      .getExam(saved.sessionId, controller.signal)
      .then((s) => {
        if (s.status === "active") {
          adopt(s);
          setPhase("resume");
        } else {
          localStore.setActiveExam(null);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) localStore.setActiveExam(null);
      });
    return () => controller.abort();
  }, [enabled, problemId, adopt]);

  // ——— Theo dõi trạng thái toàn màn hình (luôn bật để overlay hiển thị đúng) ———
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(getFullscreenElement()));
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  // ——— Bộ giám sát khi đang thi ———
  useEffect(() => {
    if (phase !== "active") return undefined;
    let hiddenAt: number | null = null;
    let blurAt: number | null = null;

    const onFullscreenChange = () => {
      if (!getFullscreenElement()) {
        record("fullscreen_exit", {}, "Bạn đã thoát toàn màn hình — trình soạn thảo bị khóa cho tới khi quay lại.");
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        blurAt = null; // tránh tính trùng với window_blur
        return;
      }
      if (hiddenAt !== null) {
        const away = Date.now() - hiddenAt;
        hiddenAt = null;
        record("tab_hidden", { durationMs: away }, `Đã ghi nhận: rời khỏi trang thi ${formatAwayDuration(away)}.`);
        void flush();
      }
    };

    const onBlur = () => {
      if (document.visibilityState === "visible") blurAt = Date.now();
    };

    const onFocus = () => {
      if (blurAt === null) return;
      const away = Date.now() - blurAt;
      blurAt = null;
      if (away >= BLUR_MIN_MS) {
        record("window_blur", { durationMs: away }, `Đã ghi nhận: chuyển sang cửa sổ khác ${formatAwayDuration(away)}.`);
      }
    };

    // Ghi nhớ mọi đoạn copy trong trang (đề bài, ví dụ, chính trình soạn thảo) — chỉ những đoạn này được dán.
    const onCopy = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text/plain") || window.getSelection()?.toString() || "";
      rememberClip(text);
    };

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    window.addEventListener("beforeunload", onBeforeUnload);
    const flushTimer = window.setInterval(() => void flush(), FLUSH_INTERVAL_MS);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.clearInterval(flushTimer);
    };
  }, [phase, record, flush, rememberClip]);

  // ——— Đồng hồ đếm ngược (theo giờ máy chủ) ———
  useEffect(() => {
    if (!session || (phase !== "active" && phase !== "resume")) return undefined;
    const endsAt = new Date(session.endsAt).getTime();
    const tick = () => {
      const now = Date.now() + clockOffsetRef.current;
      setRemainingSec(Math.max(0, Math.ceil((endsAt - now) / 1000)));
    };
    tick();
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [session, phase]);

  useEffect(
    () => () => {
      if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
      // Rời màn hình mà phiên vẫn mở (điều hướng lọt qua bộ chặn, ví dụ mục lịch sử không do router tạo):
      // đóng phiên ở trạng thái bỏ dở và trả trình duyệt về cửa sổ thường.
      const sessionId = sessionIdRef.current;
      const p = phaseRef.current;
      if (sessionId && (p === "active" || p === "resume" || p === "starting")) {
        void examService.abandonExam(sessionId).catch(() => undefined);
        localStore.setActiveExam(null);
        void exitFullscreen();
      }
    },
    [],
  );

  // Chặn điều hướng trong ứng dụng (nút Back, link) khi đang thi.
  const inExam = phase === "starting" || phase === "active" || phase === "resume";
  const blocker = useBlocker(inExam);

  const locked = phase === "starting" || phase === "resume" || (phase === "active" && !isFullscreen);

  return {
    phase,
    session,
    inExam,
    locked,
    isFullscreen,
    violations,
    remainingSec,
    timeUp: (phase === "active" || phase === "resume") && remainingSec === 0,
    notice,
    error,
    blocker,
    pasteGuard: inExam ? pasteGuard : undefined,
    start,
    resume,
    reenterFullscreen,
    flush,
    finish,
    refresh,
    abandon,
    dismiss,
    clearError: () => setError(null),
  };
}

export type ExamController = ReturnType<typeof useExamMode>;
