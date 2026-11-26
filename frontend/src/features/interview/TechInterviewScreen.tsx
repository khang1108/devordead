import { lazy, Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge, Button, Card, CardHead, ErrorBanner, ProgressBar, RuleTag } from "@shared/ui";
import Waveform from "@shared/components/Waveform";
import {
  DEFAULT_CODE_TEMPLATES,
  DIFFICULTY_META,
  LANGUAGES,
  SANDBOX_CONSTRAINTS_SPEC,
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

// UC12 Phỏng vấn kỹ thuật & Live Coding
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
  const [voiceError, setVoiceError] = useState<string | null>(() =>
    !sessionId
      ? "Phòng đang chạy chế độ cục bộ (chưa kết nối Backend AI Interviewer). Monaco IDE, micro Web Audio và bộ đếm BR1 đang hoạt động."
      : null,
  );

  const [sandboxRunning, setSandboxRunning] = useState<boolean>(false);
  const [sandboxResult, setSandboxResult] = useState<SandboxExecutionResult | null>(null);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [lastRunMode, setLastRunMode] = useState<SandboxRunMode>("run");
  const [finalizing, setFinalizing] = useState<boolean>(false);

  const micHandleRef = useRef<LiveMicHandle | null>(null);
  const finishedRef = useRef<boolean>(false);

  const latestRef = useRef({
    turns,
    code,
    lang,
    sandboxResult,
  });
  latestRef.current = { turns, code, lang, sandboxResult };

  const currentAiPrompt = [...turns].reverse().find((t) => t.who === "ai") ?? null;
  const historyTurns = currentAiPrompt ? turns.filter((t) => t !== currentAiPrompt) : turns;
  const youTurnsCount = turns.filter((t) => t.who === "you").length;
  const micActive = micRequested && Boolean(analyser);

  const passedCount = sandboxResult
    ? sandboxResult.tests.filter((t) => t.status === "passed").length
    : 0;
  const totalCount = sandboxResult ? sandboxResult.tests.length : 0;

  const stopHardware = useCallback(() => {
    micHandleRef.current?.stop();
    micHandleRef.current = null;
    setAnalyser(null);
  }, []);

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
    setLastRunMode(mode);
    setSandboxRunning(true);
    setSandboxError(null);

    try {
      const result =
        mode === "submit"
          ? await codingService.submitSolution(problemId, lang, code)
          : await codingService.runSampleTests(problemId, lang, code);
      setSandboxResult(result);
      if (mode === "submit") {
        setStageIdx((prev) => Math.max(prev, Math.min(plan.length - 1, 3)));
      }
    } catch (err) {
      setSandboxError(getErrorMessage(err));
    } finally {
      setSandboxRunning(false);
    }
  }

  const timerTone = remainingSec <= 60 ? "danger" : remainingSec <= 300 ? "warn" : "normal";
  const latencyLabel =
    latencyMs !== null ? `${(latencyMs / 1000).toFixed(2)}s ≤ 2,5s` : "Ngưỡng ≤ 2,5s";

  return (
    <div className="room">
      <RoomTopBar
        badge="Technical · Live coding"
        title={`${targetProfile.role} ${targetProfile.level} · ${diffMeta.label}`}
        remaining={formatClock(remainingSec)}
        total={`${String(durationMin).padStart(2, "0")}:00`}
        tone={timerTone}
        onSimulateTimeout={() => void finishSession("hard-stop")}
        onEnd={() => setConfirmOpen(true)}
      />

      <div className="room-body it__body">
        <Card as="aside" className="it__left-panel" aria-label="Người phỏng vấn AI & Transcript">
          <div className="it__stage-pane">
            <div className="room-stage__telemetry">
              <span className="room-stage__meta">
                {sessionId ? "WSS · Live voice" : "Local Studio · Web Audio"}
              </span>
              <RuleTag code="NFR01">{latencyLabel}</RuleTag>
            </div>

            <AiAvatar
              size={104}
              analyser={analyser}
              speaking={aiMode === "speaking"}
              listening={aiMode === "listening" && micActive}
              thinking={aiMode === "thinking" || sandboxRunning || sendingTurn}
            />

            <p className="room-stage__label">
              {aiMode === "speaking"
                ? "AI Interviewer · Đang trao đổi"
                : aiMode === "thinking" || sandboxRunning || sendingTurn
                  ? "Đang phân tích mã & lập luận..."
                  : micActive
                    ? "Think-aloud · Micro đang thu"
                    : "Micro đang tắt"}
            </p>

            <p className="room-stage__subtitle" aria-live="polite">
              {currentAiPrompt
                ? `“${currentAiPrompt.text}”`
                : "Trình bày hướng tiếp cận, độ phức tạp Big-O và các edge case khi bạn viết mã bên phải."}
            </p>

            <div className="room-stage__you">
              <div style={{ width: 92 }}>
                <Waveform
                  analyser={analyser}
                  active={micActive && aiMode === "listening"}
                  bars={12}
                  height={22}
                  showBadge={false}
                  color="var(--ink)"
                  idleColor="rgba(17, 20, 24, 0.16)"
                />
              </div>
              <span className="t-body-s t-strong" style={{ color: "var(--ink)" }}>
                {micActive ? "Think aloud — đang thu" : "Đã tắt mic"}
              </span>
            </div>

            <div className="it__voice-actions">
              <Button
                variant="secondary"
                size="sm"
                disabled={requestingHint || finalizing}
                onClick={() => void handleRequestHint()}
              >
                {requestingHint && <span className="spinner" aria-hidden="true" />}
                Yêu cầu gợi ý {hintsUsed > 0 ? `(${hintsUsed})` : ""}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMicRequested((v) => !v)}
                aria-pressed={!micRequested}
              >
                {micRequested ? "Tắt mic" : "Bật mic"}
              </Button>
            </div>

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

            <form className="it__composer" onSubmit={(e) => void handleSendTurn(e)}>
              <label htmlFor="it-turn-input" className="field__label">
                Gửi lập luận think-aloud
              </label>
              <div className="it__composer-row">
                <input
                  id="it-turn-input"
                  className="input grow"
                  type="text"
                  placeholder="Giải thích thuật toán, độ phức tạp O(...)..."
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
                  Gửi
                </Button>
              </div>
            </form>
          </div>

          <div className="ir__side-section">
            <CardHead title="Kế hoạch phiên (UC12)">
              <span className="t-mono c-ink2">
                {stageIdx + 1} / {plan.length}
              </span>
            </CardHead>
            <ol className="ir__plan">
              {plan.map((step, i) => {
                const st = i < stageIdx ? "done" : i === stageIdx ? "now" : "todo";
                return (
                  <li key={step} className={`ir__plan-item is-${st}`}>
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
          </div>

          <div className="ir__side-section ir__transcript-box">
            <CardHead title="Transcript & gợi ý">
              <span className="t-mono c-ink2">{turns.length} lượt</span>
            </CardHead>
            <TranscriptList turns={historyTurns} />
          </div>
        </Card>

        <div className="it__right">
          <Card className="card--tight it__problem-bar">
            <div className="row between wrap">
              <div className="row wrap stack-sm">
                <span className="t-mono c-ink2">
                  {problemDetail ? `#${problemDetail.id}` : session?.problemId ? `#${session.problemId}` : "Live Sandbox"}
                </span>
                <h1 className="t-heading-s">
                  {problemDetail?.title ??
                    (session?.problemId
                      ? `Bài tập lập trình #${session.problemId}`
                      : `Không gian Live Coding · ${targetProfile.role}`)}
                </h1>
                <Badge tone={(problemDetail ? DIFFICULTY_META[problemDetail.difficulty] : diffMeta).tone} dot>
                  {(problemDetail ? DIFFICULTY_META[problemDetail.difficulty] : diffMeta).label}
                </Badge>
              </div>
              <RuleTag code="BR3">Zero-trust container</RuleTag>
            </div>
            <p className="t-body-s c-ink2">
              {problemDetail?.description ??
                (session?.problemId
                  ? "Viết lời giải trong trình soạn thảo Monaco và chạy kiểm thử trong Docker Sandbox cô lập."
                  : "Trình soạn thảo Monaco đã sẵn sàng. Khi kết nối Backend API, đề bài và bộ test của phiên sẽ được nạp tự động.")}
            </p>
          </Card>

          <section className="it__editor" aria-label="Trình soạn thảo Monaco trong phiên phỏng vấn">
            <div className="it__toolbar">
              <label className="sr-only" htmlFor="it-lang">
                Ngôn ngữ
              </label>
              <select
                id="it-lang"
                className="it__select"
                value={lang}
                onChange={(e) => handleLanguageChange(e.target.value as ProgrammingLanguage)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>

              <div className="it__font" role="group" aria-label="Cỡ chữ">
                <button
                  type="button"
                  onClick={() => adjustFontSize(-0.5)}
                  aria-label="Giảm cỡ chữ"
                >
                  A−
                </button>
                <span className="t-mono" style={{ padding: "0 4px", fontSize: 12 }}>
                  {Math.round(fontSize)}
                </span>
                <button
                  type="button"
                  onClick={() => adjustFontSize(0.5)}
                  aria-label="Tăng cỡ chữ"
                >
                  A+
                </button>
              </div>

              <span className="it__sync">Đã lưu cục bộ · {savedAt}</span>
              <span style={{ flex: 1 }} />

              <Button
                variant="secondary"
                size="sm"
                onDark
                disabled={sandboxRunning || finalizing}
                onClick={() => void runInSandbox("run")}
              >
                Run
              </Button>
              <Button
                variant="accent"
                size="sm"
                className="it__submit-btn"
                disabled={sandboxRunning || finalizing}
                onClick={() => void runInSandbox("submit")}
              >
                Submit
              </Button>
            </div>

            <div className="it__monaco">
              <Suspense
                fallback={
                  <div className="empty" style={{ color: "var(--code-ink)", height: "100%" }}>
                    Đang tải trình soạn thảo...
                  </div>
                }
              >
                <CodeEditor
                  language={lang}
                  value={code}
                  onChange={handleCodeChange}
                  fontSize={fontSize}
                  readOnly={finalizing}
                />
              </Suspense>
            </div>
          </section>

          <Card className="it__ledger-card" aria-live="polite">
            <div className="it__sandbox-pane">
              <div className="row between wrap">
                <div className="row wrap stack-sm">
                  <h2 className="t-heading-s">Kết quả Sandbox</h2>
                  <RuleTag code="BR3">Zero-trust</RuleTag>
                </div>
                {sandboxRunning ? (
                  <Badge tone="brand" dot>
                    Đang chạy container...
                  </Badge>
                ) : sandboxResult ? (
                  <Badge tone={sandboxResult.tone} dot>
                    {sandboxResult.summary}
                  </Badge>
                ) : (
                  <span className="t-body-s c-ink2">Chưa chạy test</span>
                )}
              </div>

              <p className="t-mono it__sandbox-spec">{SANDBOX_CONSTRAINTS_SPEC}</p>

              {sandboxError && !sandboxRunning && (
                <ErrorBanner
                  title="Chưa thể chạy mã trong Docker Sandbox"
                  message={sandboxError}
                  onRetry={() => void runInSandbox(lastRunMode)}
                  retryLabel="Thử chạy lại"
                />
              )}

              {sandboxResult && !sandboxRunning ? (
                <div className="it__test-rows">
                  {sandboxResult.tests.map((t) => {
                    const st = TEST_STATUS_META[t.status];
                    return (
                      <div key={t.name} className="it__test-row">
                        <span className="t-body-s t-strong" style={{ color: "var(--ink)" }}>
                          {t.name}
                        </span>
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
              ) : !sandboxError ? (
                <p className="t-body-s c-ink2">
                  Bấm <strong>Run</strong> hoặc <strong>Submit</strong> để thực thi mã trong
                  container cô lập. AI sẽ hỏi tiếp về độ phức tạp và edge case dựa trên kết quả chạy.
                </p>
              ) : null}
            </div>

            <div className="it__scores-ledger">
              <div className="it__score-cell">
                <div className="row between">
                  <span className="t-body-s c-ink2">Tính đúng của mã</span>
                  <span className="t-mono c-ink2">Sandbox</span>
                </div>
                <p className="t-number">
                  {sandboxResult && totalCount > 0 ? `${passedCount} / ${totalCount}` : "—"}
                </p>
                <ProgressBar
                  value={totalCount > 0 ? passedCount / totalCount : 0}
                  tone="success"
                  label="Tỉ lệ test case vượt qua"
                />
                <p className="t-body-s c-ink2">Đo khách quan từ bộ test case tự động.</p>
              </div>

              <div className="it__score-cell">
                <div className="row between">
                  <span className="t-body-s c-ink2">Lập luận thuật toán</span>
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

            <div className="it__ledger-foot">
              <div className="row wrap stack-sm">
                <RuleTag code="BR2">Tính đúng của mã &amp; Lập luận chấm độc lập</RuleTag>
              </div>
              <Button variant="ghost" size="sm" onClick={() => void finishSession("hard-stop")}>
                Kích hoạt hard-stop 00:00 (UC13) →
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Kết thúc phiên Technical sớm?"
        confirmLabel="Kết thúc & chụp snapshot"
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
