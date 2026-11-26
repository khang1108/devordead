import { lazy, Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SplitPane from "@shared/components/SplitPane";
import Waveform from "@shared/components/Waveform";
import { Badge, Button, ErrorBanner, ProgressBar, RuleTag } from "@shared/ui";
import {
  DEFAULT_CODE_TEMPLATES,
  DIFFICULTY_META,
  LANGUAGES,
  SANDBOX_CONSTRAINTS_SPEC,
  SANDBOX_LIMITS,
  SANDBOX_STEPS,
  TECH_INTERVIEW_PLAN,
  TEST_STATUS_META,
} from "@shared/constants";
import { getErrorMessage } from "@shared/services/apiClient";
import {
  startMicrophoneStream,
  type LiveMicHandle,
} from "@shared/services/audioEngine";
import { localStore } from "@shared/services/localStore";
import type {
  CodingProblem,
  Difficulty,
  InterviewConfig,
  InterviewDuration,
  InterviewSession,
  ProgrammingLanguage,
  SandboxExecutionResult,
  SandboxRunMode,
  SessionSnapshot,
  TranscriptTurn,
} from "@shared/types";
import { codingService } from "@features/coding/coding.service";
import { AiAvatar, ConfirmDialog, RoomTopBar, TranscriptList } from "./components/Room";
import { interviewService } from "./interview.service";
import "./components/InterviewRoom.css";

const CodeEditor = lazy(() => import("@shared/components/CodeEditor"));

interface TechRouteState {
  config?: InterviewConfig;
  session?: InterviewSession | null;
  offlineStudio?: boolean;
}

type AiMode = "speaking" | "listening" | "thinking";
type LeftTab = "studio" | "plan" | "rubric";
type BottomTab = "result" | "steps";

function formatClock(sec: number): string {
  const safe = Math.max(0, sec);
  const m = String(Math.floor(safe / 60)).padStart(2, "0");
  const s = String(safe % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function nowStamp(): string {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M4 2.75a.75.75 0 0 1 1.14-.64l8.5 5.25a.75.75 0 0 1 0 1.28l-8.5 5.25A.75.75 0 0 1 4 13.25V2.75Z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 11V3" />
      <path d="M4.75 6.25 8 3l3.25 3.25" />
      <path d="M3 12.5h10" />
    </svg>
  );
}

function CodeTagIcon() {
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
      <path d="M5.5 4.5 2 8l3.5 3.5" />
      <path d="M10.5 4.5 14 8l-3.5 3.5" />
      <path d="M9 3 7 13" />
    </svg>
  );
}

function ThemeIcon({ dark }: { dark: boolean }) {
  return dark ? (
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
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.58 3.58l1.06 1.06M11.36 11.36l1.06 1.06M12.42 3.58l-1.06 1.06M4.64 11.36l-1.06 1.06" />
    </svg>
  ) : (
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
      <path d="M13.25 9.85A5.5 5.5 0 0 1 6.15 2.75a5.5 5.5 0 1 0 7.1 7.1Z" />
    </svg>
  );
}

// UC12 Phỏng vấn kỹ thuật & Live Coding — Full-Viewport LeetCode Resizable Workbench
export default function TechInterviewScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state as TechRouteState | null) ?? null;

  const targetProfile = localStore.getTargetProfile();
  const session = routeState?.session ?? null;
  const durationMin: InterviewDuration = session?.duration ?? routeState?.config?.duration ?? 30;
  const diffKey: Difficulty = session?.difficulty ?? routeState?.config?.difficulty ?? "medium";
  const diffMeta = DIFFICULTY_META[diffKey];
  const plan = session?.plan?.length ? session.plan : TECH_INTERVIEW_PLAN;
  const sessionId = session?.sessionId;
  const problemId = session?.problemId ?? "sandbox";
  const draftKey = sessionId ? `interview-${sessionId}` : `interview-${problemId}`;

  const [leftTab, setLeftTab] = useState<LeftTab>("studio");
  const [bottomTab, setBottomTab] = useState<BottomTab>("result");
  const [editorTheme, setEditorTheme] = useState<"light" | "dark">(() => localStore.getEditorTheme());

  const [problemDetail, setProblemDetail] = useState<CodingProblem | null>(null);
  const [lang, setLang] = useState<ProgrammingLanguage>("python");
  const [fontSize, setFontSize] = useState<number>(() => localStore.getEditorFontSize());
  const [code, setCode] = useState<string>(
    () => localStore.getCodeDraft(draftKey, "python") ?? DEFAULT_CODE_TEMPLATES.python,
  );
  const [savedAt, setSavedAt] = useState<string>(() => nowStamp());

  useEffect(() => {
    if (!session?.problemId) return undefined;
    const controller = new AbortController();
    void codingService
      .getProblemById(session.problemId, controller.signal)
      .then((problem) => {
        if (controller.signal.aborted) return;
        setProblemDetail(problem);
        const existingDraft = localStore.getCodeDraft(draftKey, "python");
        if (!existingDraft && problem.starter?.python) {
          setCode(problem.starter.python);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [session?.problemId, draftKey]);

  const [turns, setTurns] = useState<TranscriptTurn[]>(() => session?.initialTurns ?? []);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [stageIdx, setStageIdx] = useState<number>(0);
  const [remainingSec, setRemainingSec] = useState<number>(() => durationMin * 60);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);

  const [micRequested, setMicRequested] = useState<boolean>(true);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<AiMode>(() =>
    session?.initialTurns?.some((t) => t.who === "ai") ? "speaking" : "listening",
  );
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const [draftTurn, setDraftTurn] = useState<string>("");
  const [sendingTurn, setSendingTurn] = useState<boolean>(false);
  const [requestingHint, setRequestingHint] = useState<boolean>(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const [sandboxRunning, setSandboxRunning] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [sandboxResult, setSandboxResult] = useState<SandboxExecutionResult | null>(null);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [lastRunMode, setLastRunMode] = useState<SandboxRunMode>("run");
  const [finalizing, setFinalizing] = useState<boolean>(false);

  const micHandleRef = useRef<LiveMicHandle | null>(null);
  const stepTimerRef = useRef<number | null>(null);
  const finishedRef = useRef<boolean>(false);

  const latestRef = useRef({
    turns,
    code,
    lang,
    sandboxResult,
  });
  latestRef.current = { turns, code, lang, sandboxResult };

  const currentAiPrompt = [...turns].reverse().find((t) => t.who === "ai") ?? null;
  const youTurnsCount = turns.filter((t) => t.who === "you").length;
  const micActive = micRequested && Boolean(analyser);
  const lineCount = code ? code.split("\n").length : 0;
  const activeDiff = problemDetail ? problemDetail.difficulty : diffKey;
  const activeDiffMeta = DIFFICULTY_META[activeDiff];
  const langLabel = LANGUAGES.find((l) => l.value === lang)?.label ?? lang;

  const passedCount = sandboxResult
    ? sandboxResult.tests.filter((t) => t.status === "passed").length
    : 0;
  const totalCount = sandboxResult ? sandboxResult.tests.length : 0;

  const clearStepTimer = useCallback(() => {
    if (stepTimerRef.current !== null) {
      window.clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  }, []);

  const stopHardware = useCallback(() => {
    clearStepTimer();
    micHandleRef.current?.stop();
    micHandleRef.current = null;
    setAnalyser(null);
  }, [clearStepTimer]);

  // Quản lý micro Web Audio thật
  useEffect(() => {
    if (!micRequested) {
      micHandleRef.current?.stop();
      micHandleRef.current = null;
      setAnalyser(null);
      return undefined;
    }

    let cancelled = false;
    setMicError(null);
    void startMicrophoneStream()
      .then((handle) => {
        if (cancelled) {
          handle.stop();
          return;
        }
        micHandleRef.current = handle;
        setAnalyser(handle.analyser);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAnalyser(null);
        setMicError(
          getErrorMessage(err, "Không thể mở micro. Bạn vẫn có thể gửi lập luận qua ô nhập liệu."),
        );
      });

    return () => {
      cancelled = true;
      micHandleRef.current?.stop();
      micHandleRef.current = null;
      setAnalyser(null);
    };
  }, [micRequested]);

  useEffect(() => {
    return () => {
      clearStepTimer();
    };
  }, [clearStepTimer]);

  const finishSession = useCallback(
    async (reason: "hard-stop" | "early-end") => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setFinalizing(true);
      stopHardware();

      const snapData = latestRef.current;
      const snapshot: SessionSnapshot = {
        sessionId,
        mode: "technical",
        duration: durationMin,
        difficulty: diffKey,
        reason,
        endedAt: new Date().toISOString(),
        turns: snapData.turns,
        code: snapData.code,
        language: snapData.lang,
        problemTitle:
          problemDetail?.title ??
          (session?.problemId
            ? `Bài tập #${session.problemId}`
            : `Technical Live Coding · ${targetProfile.role}`),
        sandboxResult: snapData.sandboxResult,
        reportId: null,
      };

      localStore.setLastSnapshot(snapshot);
      localStore.recordTodayPractice();

      if (sessionId) {
        try {
          const res = await interviewService.finalizeSession(sessionId, snapshot);
          if (res.reportId) {
            snapshot.reportId = res.reportId;
            localStore.setLastSnapshot(snapshot);
          }
        } catch {
          // Đảm bảo snapshot cục bộ đã niêm phong theo BR1
        }
      }

      navigate("/interview/ended", { state: snapshot, replace: true });
    },
    [
      diffKey,
      durationMin,
      navigate,
      problemDetail?.title,
      session?.problemId,
      sessionId,
      stopHardware,
      targetProfile.role,
    ],
  );

  useEffect(() => {
    if (aiMode !== "speaking") return undefined;
    const id = window.setTimeout(() => setAiMode("listening"), 2200);
    return () => window.clearTimeout(id);
  }, [aiMode]);

  // Bộ đếm ngược 1s thực tế theo BR1
  useEffect(() => {
    const id = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (remainingSec === 0) {
      void finishSession("hard-stop");
    }
  }, [remainingSec, finishSession]);

  function toggleEditorTheme() {
    setEditorTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStore.setEditorTheme(next);
      return next;
    });
  }

  function handleLanguageChange(nextLang: ProgrammingLanguage) {
    localStore.setCodeDraft(draftKey, lang, code);
    setLang(nextLang);
    const saved = localStore.getCodeDraft(draftKey, nextLang);
    setCode(saved ?? problemDetail?.starter?.[nextLang] ?? DEFAULT_CODE_TEMPLATES[nextLang]);
    setSavedAt(nowStamp());
  }

  function handleCodeChange(nextCode: string) {
    setCode(nextCode);
    localStore.setCodeDraft(draftKey, lang, nextCode);
    setSavedAt(nowStamp());
  }

  function adjustFontSize(delta: number) {
    setFontSize((prev) => {
      const next = Math.max(12, Math.min(22, prev + delta));
      localStore.setEditorFontSize(next);
      return next;
    });
  }

  async function handleSendTurn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draftTurn.trim();
    if (!trimmed || sendingTurn || finalizing) return;

    const turn: TranscriptTurn = {
      id: `you-${Date.now()}`,
      who: "you",
      text: trimmed,
      timestamp: nowStamp(),
    };
    setTurns((prev) => [...prev, turn]);
    setDraftTurn("");

    if (!sessionId) {
      setVoiceError(
        "Đã ghi nhận lượt lập luận vào transcript cục bộ. Kết nối Backend API để nhận phản hồi trực tiếp từ AI Interviewer.",
      );
      return;
    }

    setSendingTurn(true);
    setAiMode("thinking");
    setVoiceError(null);
    const startedAt = performance.now();

    try {
      const res = await interviewService.sendTurn(sessionId, trimmed);
      setLatencyMs(res.latencyMs ?? Math.round(performance.now() - startedAt));
      if (typeof res.stageIndex === "number") {
        setStageIdx(Math.max(0, Math.min(plan.length - 1, res.stageIndex)));
      }
      if (res.reply) {
        setTurns((prev) => [
          ...prev,
          { ...res.reply!, who: "ai", timestamp: res.reply!.timestamp || nowStamp() },
        ]);
        setAiMode("speaking");
      } else {
        setAiMode("listening");
      }
    } catch (err) {
      setAiMode("listening");
      setVoiceError(
        `${getErrorMessage(err)} Lượt lập luận của bạn vẫn được giữ nguyên trong transcript cục bộ.`,
      );
    } finally {
      setSendingTurn(false);
    }
  }

  async function handleRequestHint() {
    if (requestingHint || finalizing) return;
    if (!sessionId) {
      setVoiceError("Cần kết nối Backend API để yêu cầu gợi ý định hướng từ AI Interviewer.");
      return;
    }

    setRequestingHint(true);
    setVoiceError(null);
    try {
      const res = await interviewService.requestHint(sessionId);
      setHintsUsed((prev) => res.hintsUsed ?? prev + 1);
      setTurns((prev) => [
        ...prev,
        { ...res.hint, who: "hint", timestamp: res.hint.timestamp || nowStamp() },
      ]);
      setAiMode("speaking");
    } catch (err) {
      setVoiceError(getErrorMessage(err));
    } finally {
      setRequestingHint(false);
    }
  }

  async function runInSandbox(mode: SandboxRunMode) {
    if (sandboxRunning || finalizing) return;
    if (!code.trim()) {
      setBottomTab("result");
      setSandboxError("Mã nguồn đang trống — vui lòng nhập lời giải trước khi chạy thử hoặc nộp bài.");
      return;
    }

    setLastRunMode(mode);
    setSandboxRunning(true);
    setSandboxError(null);
    setBottomTab("result");

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    setActiveStep(reduce ? SANDBOX_STEPS.length - 1 : 0);
    clearStepTimer();
    if (!reduce) {
      stepTimerRef.current = window.setInterval(() => {
        setActiveStep((prev) => (prev >= SANDBOX_STEPS.length - 2 ? SANDBOX_STEPS.length - 2 : prev + 1));
      }, 150);
    }

    try {
      const result =
        mode === "submit"
          ? await codingService.submitSolution(problemId, lang, code)
          : await codingService.runSampleTests(problemId, lang, code);
      clearStepTimer();
      setActiveStep(SANDBOX_STEPS.length);
      setSandboxResult(result);
      if (mode === "submit") {
        setStageIdx((prev) => Math.max(prev, Math.min(plan.length - 1, 3)));
      }
    } catch (err) {
      clearStepTimer();
      setSandboxError(getErrorMessage(err));
    } finally {
      setSandboxRunning(false);
    }
  }

  const timerTone = remainingSec <= 60 ? "danger" : remainingSec <= 300 ? "warn" : "normal";
  const latencyLabel =
    latencyMs !== null ? `${(latencyMs / 1000).toFixed(2)}s ≤ 2,5s` : "≤ 2,5s";

  const leftPane = (
    <section className="lc-pane" aria-label="Phòng phỏng vấn AI, kế hoạch và chấm điểm BR2">
      <div className="lc-pane__head">
        <div className="lc-pane__tabs" role="tablist" aria-label="Chế độ xem khung phỏng vấn">
          <button
            type="button"
            role="tab"
            aria-selected={leftTab === "studio"}
            className={`lc-pane__tab ${leftTab === "studio" ? "is-active" : ""}`.trim()}
            onClick={() => setLeftTab("studio")}
          >
            Phỏng vấn AI
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={leftTab === "plan"}
            className={`lc-pane__tab ${leftTab === "plan" ? "is-active" : ""}`.trim()}
            onClick={() => setLeftTab("plan")}
          >
            Kế hoạch
            <span className="ir-tab-count">
              {stageIdx + 1}/{plan.length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={leftTab === "rubric"}
            className={`lc-pane__tab ${leftTab === "rubric" ? "is-active" : ""}`.trim()}
            onClick={() => setLeftTab("rubric")}
          >
            Tiêu chí BR2
          </button>
        </div>
      </div>

      {leftTab === "studio" && (
        <div className="it-studio-body">
          <div className="it-studio-head">
            <div className="it-orb-row">
              <AiAvatar
                size={84}
                analyser={analyser}
                speaking={aiMode === "speaking"}
                listening={aiMode === "listening" && micActive}
                thinking={aiMode === "thinking" || sandboxRunning || sendingTurn}
              />

              <div className="it-orb-meta">
                <div className="it-orb-status">
                  <span className="it-orb-label">
                    {aiMode === "speaking"
                      ? "AI Interviewer · Đang trao đổi"
                      : aiMode === "thinking" || sandboxRunning || sendingTurn
                        ? "Đang phân tích mã & lập luận…"
                        : micActive
                          ? "Think-aloud · Micro đang thu"
                          : "Micro đang tắt"}
                  </span>
                  <RuleTag code="NFR01">{latencyLabel}</RuleTag>
                </div>

                <div className="it-wave-row">
                  <div className="it-wave-wrap">
                    <Waveform
                      analyser={analyser}
                      active={micActive && aiMode === "listening"}
                      bars={14}
                      height={20}
                      showBadge={false}
                      color="var(--ink)"
                      idleColor="rgba(17, 20, 24, 0.16)"
                    />
                  </div>
                  <span className="it-wave-text">
                    {micActive ? "Web Audio live" : micRequested ? "Chờ cấp quyền micro" : "Đã tắt mic"}
                  </span>
                </div>

                <div className="it-voice-actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="ir-mic-btn"
                    onClick={() => setMicRequested((v) => !v)}
                    aria-pressed={!micRequested}
                  >
                    <span
                      className={`ir-rec-dot ${micActive ? "" : "ir-rec-dot--off"}`.trim()}
                      aria-hidden="true"
                    />
                    {micRequested ? "Tắt micro" : "Bật micro"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={requestingHint || finalizing}
                    onClick={() => void handleRequestHint()}
                  >
                    {requestingHint && <span className="spinner" aria-hidden="true" />}
                    Yêu cầu gợi ý {hintsUsed > 0 ? `(${hintsUsed})` : ""}
                  </Button>
                </div>
              </div>
            </div>

            <p className="it-prompt-quote" aria-live="polite">
              {currentAiPrompt
                ? `“${currentAiPrompt.text}”`
                : "Trình bày hướng tiếp cận, độ phức tạp Big-O và các edge case song song khi bạn viết mã trong Monaco IDE bên phải."}
            </p>

            {problemDetail && (
              <div className="it-problem-brief">
                <div className="row between wrap stack-sm">
                  <span className="t-body-s t-strong">
                    #{problemDetail.id} {problemDetail.title}
                  </span>
                  <span className={`lc-diff lc-diff--${activeDiff}`}>{activeDiffMeta.label}</span>
                </div>
                <p className="t-body-s c-ink2">{problemDetail.description}</p>
              </div>
            )}

            {!sessionId && !voiceError && (
              <div className="ir-local-notice" role="status">
                <span className="ir-local-notice__dot" aria-hidden="true" />
                <span>
                  Chế độ Local Studio (chưa kết nối Backend AI Interviewer). Monaco IDE, micro Web
                  Audio, quả cầu 3D và bộ đếm BR1 đang hoạt động đầy đủ.
                </span>
              </div>
            )}

            {micError && (
              <ErrorBanner
                title="Lỗi thiết bị micro"
                message={micError}
                onRetry={() => {
                  setMicRequested(false);
                  window.setTimeout(() => setMicRequested(true), 60);
                }}
              />
            )}

            {voiceError && (
              <ErrorBanner title="Trạng thái AI Interviewer" message={voiceError} />
            )}
          </div>

          <div className="it-studio-transcript">
            <div className="it-transcript-bar">
              <span className="card__title">Transcript &amp; gợi ý</span>
              <span className="t-mono c-ink2">{turns.length} lượt</span>
            </div>
            <TranscriptList
              turns={turns}
              emptyLabel="Chưa có lượt hội thoại nào. Bật micro hoặc nhập lập luận ở ô bên dưới."
            />
          </div>

          <form className="it-studio-composer" onSubmit={(e) => void handleSendTurn(e)}>
            <label htmlFor="it-turn-input" className="sr-only">
              Gửi lập luận think-aloud
            </label>
            <div className="it-composer-row">
              <input
                id="it-turn-input"
                className="input grow"
                type="text"
                placeholder="Giải thích thuật toán, độ phức tạp O(...) hoặc edge case…"
                value={draftTurn}
                disabled={sendingTurn || finalizing}
                onChange={(e) => setDraftTurn(e.target.value)}
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!draftTurn.trim() || sendingTurn || finalizing}
              >
                {sendingTurn && <span className="spinner" aria-hidden="true" />}
                Gửi
              </Button>
            </div>
          </form>
        </div>
      )}

      {leftTab === "plan" && (
        <div className="lc-pane__body">
          <div className="ir-pane-pad">
            <div className="row between">
              <h2 className="t-heading-s">Tiến trình phiên kỹ thuật</h2>
              <span className="t-mono c-ink2">
                {stageIdx + 1} / {plan.length}
              </span>
            </div>

            <ol className="ir__plan">
              {plan.map((step, i) => {
                const st = i < stageIdx ? "done" : i === stageIdx ? "now" : "todo";
                return (
                  <li key={step} className={`ir__plan-item is-${st}`}>
                    <span className="ir__plan-step">{String(i + 1).padStart(2, "0")}</span>
                    <span className="ir__plan-dot" aria-hidden="true" />
                    <span className="t-body-s">{step}</span>
                    {st === "now" && (
                      <Badge tone="brand" dot>
                        Đang làm
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ol>

            {problemDetail && (
              <div className="col stack-sm">
                <h3 className="t-heading-s">Đề bài Live Coding</h3>
                <p className="t-body-s c-ink2">{problemDetail.description}</p>
                {problemDetail.constraints.length > 0 && (
                  <ul className="rows">
                    {problemDetail.constraints.map((c) => (
                      <li key={c} className="t-mono c-ink2">
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="row wrap stack-sm">
              <RuleTag code="BR1">Hard-stop {durationMin}:00</RuleTag>
              <RuleTag code="BR4">Câu hỏi tạm trong phiên</RuleTag>
            </div>
          </div>
        </div>
      )}

      {leftTab === "rubric" && (
        <div className="lc-pane__body">
          <div className="ir-pane-pad">
            <div className="col stack-sm">
              <RuleTag code="BR2">Chấm độc lập mã nguồn &amp; lập luận</RuleTag>
              <p className="t-body-s c-ink2">
                Hai trục đánh giá được tách bạch để phản ánh đúng năng lực lập trình và khả năng phân
                tích thuật toán.
              </p>
            </div>

            <div className="it-rubric-grid">
              <div className="it-rubric-card">
                <div className="row between">
                  <span className="t-body-s t-strong">Tính đúng của mã</span>
                  <span className="t-mono c-ink2">Docker Sandbox</span>
                </div>
                <p className="t-number">
                  {sandboxResult && totalCount > 0 ? `${passedCount} / ${totalCount}` : "—"}
                </p>
                <ProgressBar
                  value={totalCount > 0 ? passedCount / totalCount : 0}
                  tone="success"
                  label="Tỉ lệ test case vượt qua"
                />
                <p className="t-body-s c-ink2">
                  Đo khách quan từ bộ test case tự động trong container cô lập (BR3).
                </p>
              </div>

              <div className="it-rubric-card">
                <div className="row between">
                  <span className="t-body-s t-strong">Lập luận thuật toán</span>
                  <span className="t-mono c-ink2">Voice rubric</span>
                </div>
                <p className="t-number">{youTurnsCount} lượt</p>
                <ProgressBar
                  value={Math.min(1, youTurnsCount / 6)}
                  tone="brand"
                  label="Bằng chứng lập luận"
                />
                <p className="t-body-s c-ink2">
                  Đánh giá qua lời giải thích Big-O &amp; edge case
                  {hintsUsed > 0 ? ` · đã dùng ${hintsUsed} gợi ý` : ""}.
                </p>
              </div>
            </div>

            <Button variant="secondary" size="sm" onClick={() => void finishSession("hard-stop")}>
              Kích hoạt hard-stop 00:00 (UC13) →
            </Button>
          </div>
        </div>
      )}
    </section>
  );

  const editorPane = (
    <section
      className={`lc-pane it-editor-pane ${editorTheme === "dark" ? "lc-pane--dark" : ""}`.trim()}
      aria-label="Trình soạn thảo Monaco Live Coding"
    >
      <div className="lc-pane__head">
        <div className="row stack-sm" style={{ minWidth: 0 }}>
          <span className="ir-pane-title">
            <CodeTagIcon />
            Live Coding
          </span>
          <span className="room-bar__sep" aria-hidden="true" />
          <span className="it-editor-problem-title">
            {problemDetail
              ? `#${problemDetail.id} ${problemDetail.title}`
              : session?.problemId
                ? `Bài tập #${session.problemId}`
                : `${targetProfile.role} Sandbox`}
          </span>
          <span className={`lc-diff lc-diff--${activeDiff}`}>{activeDiffMeta.label}</span>
        </div>

        <RuleTag code="BR3">Zero-trust container</RuleTag>
      </div>

      <div className="lc-pane__subbar">
        <div className="row stack-sm">
          <label className="sr-only" htmlFor="it-lang">
            Ngôn ngữ lập trình
          </label>
          <select
            id="it-lang"
            className="it-select"
            value={lang}
            onChange={(e) => handleLanguageChange(e.target.value as ProgrammingLanguage)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>

          <div className="it-font-group" role="group" aria-label="Cỡ chữ trình soạn thảo">
            <button
              type="button"
              onClick={() => adjustFontSize(-0.5)}
              aria-label="Giảm cỡ chữ"
            >
              A−
            </button>
            <span className="it-font-val">{Math.round(fontSize)}</span>
            <button
              type="button"
              onClick={() => adjustFontSize(0.5)}
              aria-label="Tăng cỡ chữ"
            >
              A+
            </button>
          </div>
        </div>

        <button
          type="button"
          className="it-theme-btn"
          onClick={toggleEditorTheme}
          aria-pressed={editorTheme === "dark"}
          title="Chuyển giao diện sáng / tối cho Monaco Editor"
        >
          <ThemeIcon dark={editorTheme === "dark"} />
          {editorTheme === "dark" ? "Sáng" : "Tối"}
        </button>
      </div>

      <div className="lc-pane__body">
        <div className="it-editor-host">
          <Suspense
            fallback={
              <div
                className="empty"
                style={{
                  color: editorTheme === "dark" ? "var(--code-ink)" : "var(--ink-2)",
                  background: editorTheme === "dark" ? "var(--code-bg)" : "var(--surface)",
                  height: "100%",
                }}
              >
                Đang tải trình soạn thảo Monaco…
              </div>
            }
          >
            <CodeEditor
              language={lang}
              value={code}
              onChange={handleCodeChange}
              fontSize={fontSize}
              readOnly={finalizing}
              themeMode={editorTheme}
            />
          </Suspense>
        </div>
      </div>

      <div className="lc-pane__foot">
        <span className="t-mono">Đã lưu snapshot nháp · {savedAt}</span>
        <span className="t-mono">
          {lineCount} dòng · {langLabel}
        </span>
      </div>
    </section>
  );

  const sandboxPane = (
    <section className="lc-pane it-sandbox-pane" aria-label="Kết quả Docker Sandbox BR3" aria-live="polite">
      <div className="lc-pane__head">
        <div className="lc-pane__tabs" role="tablist" aria-label="Chế độ xem Sandbox">
          <button
            type="button"
            role="tab"
            aria-selected={bottomTab === "result"}
            className={`lc-pane__tab ${bottomTab === "result" ? "is-active" : ""}`.trim()}
            onClick={() => setBottomTab("result")}
          >
            Kết quả Sandbox (BR3)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={bottomTab === "steps"}
            className={`lc-pane__tab ${bottomTab === "steps" ? "is-active" : ""}`.trim()}
            onClick={() => setBottomTab("steps")}
          >
            Tiến trình 7 bước
          </button>
        </div>

        {sandboxRunning ? (
          <Badge tone="brand" dot>
            Đang chạy container…
          </Badge>
        ) : sandboxResult ? (
          <Badge tone={sandboxResult.tone} dot>
            {sandboxResult.summary}
          </Badge>
        ) : (
          <span className="t-body-s c-ink2">Chưa chạy test</span>
        )}
      </div>

      <div className="lc-pane__body">
        {bottomTab === "result" ? (
          <div className="ir-pane-pad">
            <p className="it-sandbox-spec">{SANDBOX_CONSTRAINTS_SPEC}</p>

            {sandboxError && !sandboxRunning && (
              <ErrorBanner
                title="Chưa thể chạy mã trong Docker Sandbox"
                message={sandboxError}
                onRetry={() => void runInSandbox(lastRunMode)}
                retryLabel="Thử chạy lại"
              />
            )}

            {sandboxResult && !sandboxRunning ? (
              <>
                <div className="it-sandbox-metrics">
                  <span>Tổng thời gian: {sandboxResult.totalTime}</span>
                  <span>RAM đỉnh: {sandboxResult.peakMem}</span>
                  <span>Exit: {sandboxResult.exitCode}</span>
                </div>

                <div className="it-test-rows">
                  {sandboxResult.tests.map((t) => {
                    const st = TEST_STATUS_META[t.status];
                    return (
                      <div key={t.name} className="it-test-row">
                        <span className="t-body-s t-strong">{t.name}</span>
                        <div className="row stack-sm">
                          <span className="t-mono c-ink2">
                            {t.status === "tle" ? "> 3000 ms" : `${t.timeMs} ms`} ·{" "}
                            {t.memMb.toFixed(1)} MB
                          </span>
                          <Badge tone={st.tone} dot>
                            {st.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : !sandboxError ? (
              <p className="t-body-s c-ink2">
                Nhấn <strong>Run</strong> hoặc <strong>Submit</strong> trên thanh công cụ để thực
                thi mã trong Docker Sandbox cô lập. AI sẽ hỏi sâu hơn về độ phức tạp và edge case
                sau khi có kết quả.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="ir-pane-pad">
            <ol className="it-steps-list" aria-label="Tiến trình 7 bước thực thi Docker Sandbox">
              {SANDBOX_STEPS.map((label, idx) => {
                const isDone = activeStep > idx;
                const isActive = sandboxRunning && activeStep === idx;
                return (
                  <li
                    key={label}
                    className={`it-step-item ${isDone ? "is-done" : ""} ${isActive ? "is-active" : ""}`.trim()}
                  >
                    <span className="it-step-num" aria-hidden="true">
                      {isDone ? "✓" : idx + 1}
                    </span>
                    <span>{label}</span>
                  </li>
                );
              })}
            </ol>

            <div className="it-limits-row" aria-label="Giới hạn cô lập container">
              {SANDBOX_LIMITS.map((limit) => (
                <span key={limit} className="it-limit-chip">
                  {limit}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );

  const rightPane = (
    <SplitPane
      direction="vertical"
      storageKey="tech-v"
      initialRatio={0.64}
      minRatio={0.36}
      maxRatio={0.82}
      label="Điều chỉnh tỷ lệ trình soạn thảo và khung Sandbox"
      first={editorPane}
      second={sandboxPane}
    />
  );

  return (
    <div className="lc-workbench">
      <RoomTopBar
        badge="Technical · Live coding"
        title={`${targetProfile.role} ${targetProfile.level} · ${diffMeta.label}`}
        remaining={formatClock(remainingSec)}
        total={`${String(durationMin).padStart(2, "0")}:00`}
        tone={timerTone}
        centerSlot={
          <div className="lc-wb-actions" role="group" aria-label="Chạy hoặc nộp mã vào Sandbox">
            <button
              type="button"
              className="lc-wb-run"
              disabled={sandboxRunning || finalizing}
              onClick={() => void runInSandbox("run")}
            >
              {sandboxRunning && lastRunMode === "run" ? (
                <span className="spinner" aria-hidden="true" />
              ) : (
                <PlayIcon />
              )}
              Run
            </button>
            <button
              type="button"
              className="lc-wb-submit"
              disabled={sandboxRunning || finalizing}
              onClick={() => void runInSandbox("submit")}
            >
              {sandboxRunning && lastRunMode === "submit" ? (
                <span className="spinner" aria-hidden="true" />
              ) : (
                <UploadIcon />
              )}
              Submit
            </button>
          </div>
        }
        rightSlot={
          <button
            type="button"
            className="room-wb-icon-btn"
            onClick={toggleEditorTheme}
            aria-label={editorTheme === "dark" ? "Chuyển Monaco sang nền sáng" : "Chuyển Monaco sang nền tối"}
            title={editorTheme === "dark" ? "Monaco nền sáng" : "Monaco nền tối"}
          >
            <ThemeIcon dark={editorTheme === "dark"} />
          </button>
        }
        onSimulateTimeout={() => void finishSession("hard-stop")}
        onEnd={() => setConfirmOpen(true)}
      />

      <div className="lc-wb-body">
        <SplitPane
          direction="horizontal"
          storageKey="tech-h"
          initialRatio={0.4}
          minRatio={0.28}
          maxRatio={0.62}
          label="Điều chỉnh tỷ lệ phòng phỏng vấn AI và khu vực Live Coding"
          first={leftPane}
          second={rightPane}
        />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Kết thúc phiên Technical sớm?"
        confirmLabel="Kết thúc & lưu snapshot"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void finishSession("early-end");
        }}
      >
        Trình soạn thảo sẽ bị khóa ngay lập tức; bản chụp mã nguồn hiện tại, toàn bộ transcript và
        kết quả test được lưu cố định để chấm điểm độc lập (BR1, BR2).
      </ConfirmDialog>
    </div>
  );
}
