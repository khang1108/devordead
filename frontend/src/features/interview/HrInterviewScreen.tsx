import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SplitPane from "@shared/components/SplitPane";
import Waveform from "@shared/components/Waveform";
import { Badge, Button, ErrorBanner, ProgressBar, RuleTag } from "@shared/ui";
import { HR_INTERVIEW_PLAN, STAR_CRITERIA } from "@shared/constants";
import { getErrorMessage } from "@shared/services/apiClient";
import {
  speakText,
  startMicrophoneStream,
  type LiveMicHandle,
} from "@shared/services/audioEngine";
import { localStore } from "@shared/services/localStore";
import type {
  Difficulty,
  InterviewConfig,
  InterviewDuration,
  InterviewSession,
  SessionSnapshot,
  StarCriterion,
  TranscriptTurn,
} from "@shared/types";
import { AiAvatar, ConfirmDialog, RoomTopBar, TranscriptList } from "./components/Room";
import { interviewService } from "./interview.service";
import "./components/InterviewRoom.css";

interface HrRouteState {
  config?: InterviewConfig;
  session?: InterviewSession | null;
  offlineStudio?: boolean;
}

type AiMode = "speaking" | "listening" | "thinking";
type HrRightTab = "transcript" | "star" | "plan";

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

// UC11 Phỏng vấn HR (Behavioral · Tiếng Anh) — Full-Viewport 100vh Tiled Voice Studio
export default function HrInterviewScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state as HrRouteState | null) ?? null;

  const targetProfile = localStore.getTargetProfile();
  const session = routeState?.session ?? null;
  const durationMin: InterviewDuration = session?.duration ?? routeState?.config?.duration ?? 30;
  const difficulty: Difficulty = session?.difficulty ?? routeState?.config?.difficulty ?? "medium";
  const plan = session?.plan?.length ? session.plan : HR_INTERVIEW_PLAN;
  const sessionId = session?.sessionId;

  const [rightTab, setRightTab] = useState<HrRightTab>("transcript");
  const [remainingSec, setRemainingSec] = useState<number>(() => durationMin * 60);
  const [micRequested, setMicRequested] = useState<boolean>(true);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);

  const [turns, setTurns] = useState<TranscriptTurn[]>(() => session?.initialTurns ?? []);
  const [stageIdx, setStageIdx] = useState<number>(0);
  const [aiMode, setAiMode] = useState<AiMode>(() =>
    session?.initialTurns?.some((t) => t.who === "ai") ? "speaking" : "listening",
  );
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [draftText, setDraftText] = useState<string>("");
  const [sendingTurn, setSendingTurn] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState<boolean>(false);

  const [starChecked, setStarChecked] = useState<Record<StarCriterion["key"], boolean>>({
    S: false,
    T: false,
    A: false,
    R: false,
  });

  const micHandleRef = useRef<LiveMicHandle | null>(null);
  const cancelSpeechRef = useRef<(() => void) | null>(null);
  const finishedRef = useRef<boolean>(false);
  const turnsRef = useRef<TranscriptTurn[]>(turns);
  turnsRef.current = turns;

  const currentAiPrompt = [...turns].reverse().find((t) => t.who === "ai") ?? null;
  const starCount = Object.values(starChecked).filter(Boolean).length;
  const micActive = micRequested && Boolean(analyser);

  const stopHardware = useCallback(() => {
    cancelSpeechRef.current?.();
    cancelSpeechRef.current = null;
    micHandleRef.current?.stop();
    micHandleRef.current = null;
    setAnalyser(null);
  }, []);

  // Quản lý micro Web Audio thật (startMicrophoneStream)
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
          getErrorMessage(
            err,
            "Không thể khởi động micro. Bạn vẫn có thể nhập câu trả lời tiếng Anh ở ô bên dưới.",
          ),
        );
      });

    return () => {
      cancelled = true;
      micHandleRef.current?.stop();
      micHandleRef.current = null;
      setAnalyser(null);
    };
  }, [micRequested]);

  // Dọn dẹp TTS khi rời màn hình
  useEffect(() => {
    return () => {
      cancelSpeechRef.current?.();
      cancelSpeechRef.current = null;
    };
  }, []);

  const finishSession = useCallback(
    async (reason: "hard-stop" | "early-end") => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setFinalizing(true);
      stopHardware();

      const snapshot: SessionSnapshot = {
        sessionId,
        mode: "hr",
        duration: durationMin,
        difficulty,
        reason,
        endedAt: new Date().toISOString(),
        turns: turnsRef.current,
        reportId: null,
      };

      localStore.setLastSnapshot(snapshot);
      localStore.recordTodayPractice();

      if (sessionId) {
        try {
          const result = await interviewService.finalizeSession(sessionId, snapshot);
          if (result.reportId) {
            snapshot.reportId = result.reportId;
            localStore.setLastSnapshot(snapshot);
          }
        } catch {
          // Vẫn lưu snapshot cục bộ theo BR1 ngay cả khi mạng gián đoạn
        }
      }

      navigate("/interview/ended", { state: snapshot, replace: true });
    },
    [difficulty, durationMin, navigate, sessionId, stopHardware],
  );

  // Chuyển tự động speaking → listening nếu không phát TTS
  useEffect(() => {
    if (aiMode !== "speaking") return undefined;
    const id = window.setTimeout(() => setAiMode("listening"), 2400);
    return () => window.clearTimeout(id);
  }, [aiMode]);

  // Đồng hồ đếm ngược 1s thực tế theo BR1
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

  function toggleStar(key: StarCriterion["key"]) {
    setStarChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleRepeatQuestion() {
    if (!currentAiPrompt) return;
    cancelSpeechRef.current?.();
    setAiMode("speaking");
    cancelSpeechRef.current = speakText(currentAiPrompt.text, "en-US", () => {
      setAiMode("listening");
    });
  }

  async function handleSubmitTurn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draftText.trim();
    if (!trimmed || sendingTurn || finalizing) return;

    const candidateTurn: TranscriptTurn = {
      id: `you-${Date.now()}`,
      who: "you",
      text: trimmed,
      timestamp: nowStamp(),
    };

    setTurns((prev) => [...prev, candidateTurn]);
    setDraftText("");
    setRightTab("transcript");

    if (!sessionId) {
      setApiError(
        "Đã lưu câu trả lời vào transcript cục bộ. Khởi động Backend API để nhận câu hỏi phản hồi tự động từ AI Interviewer.",
      );
      return;
    }

    setSendingTurn(true);
    setAiMode("thinking");
    setApiError(null);
    const startedAt = performance.now();

    try {
      const res = await interviewService.sendTurn(sessionId, trimmed);
      const elapsedMs = res.latencyMs ?? Math.round(performance.now() - startedAt);
      setLatencyMs(elapsedMs);

      if (res.starCovered) {
        setStarChecked((prev) => ({ ...prev, ...res.starCovered }));
      }
      if (typeof res.stageIndex === "number") {
        setStageIdx(Math.max(0, Math.min(plan.length - 1, res.stageIndex)));
      }
      if (res.reply) {
        const aiReply: TranscriptTurn = {
          ...res.reply,
          who: "ai",
          timestamp: res.reply.timestamp || nowStamp(),
        };
        setTurns((prev) => [...prev, aiReply]);
        setAiMode("speaking");
        cancelSpeechRef.current?.();
        cancelSpeechRef.current = speakText(aiReply.text, "en-US", () => {
          setAiMode("listening");
        });
      } else {
        setAiMode("listening");
      }
    } catch (err) {
      setAiMode("listening");
      setApiError(
        `${getErrorMessage(err)} Lượt trả lời của bạn vẫn được giữ nguyên trong transcript cục bộ.`,
      );
    } finally {
      setSendingTurn(false);
    }
  }

  const timerTone = remainingSec <= 60 ? "danger" : remainingSec <= 300 ? "warn" : "normal";
  const currentStageName = plan[stageIdx] ?? plan[0] ?? "Behavioral (STAR)";
  const latencyLabel =
    latencyMs !== null ? `Phản hồi ${(latencyMs / 1000).toFixed(2)}s ≤ 2,5s` : "Phản hồi ≤ 2,5s";

  const leftPane = (
    <section className="lc-pane" aria-label="AI Interviewer tiếng Anh">
      <div className="lc-pane__head">
        <span className="ir-pane-title">AI Interviewer · English</span>
        <RuleTag code="NFR01">{latencyLabel}</RuleTag>
      </div>

      <div className="hr-studio-body">
        <div className="hr-studio-stage">
          <AiAvatar
            size={140}
            analyser={analyser}
            speaking={aiMode === "speaking"}
            listening={aiMode === "listening" && micActive}
            thinking={aiMode === "thinking" || sendingTurn}
          />

          <div className="col stack-sm" style={{ alignItems: "center" }}>
            <span className="hr-stage-tag">
              Stage {stageIdx + 1} / {plan.length} · {currentStageName} (Live captions · NFR08)
            </span>
            <p className="hr-prompt-text" lang="en" aria-live="polite">
              {currentAiPrompt
                ? `“${currentAiPrompt.text}”`
                : sessionId
                  ? "Connected to AI Interviewer. Waiting for the opening question or submit your introduction below."
                  : "Local studio active — speak into your microphone or enter an English response below to record your transcript."}
            </p>
          </div>

          <div className="room-stage__you">
            <div style={{ width: 112 }}>
              <Waveform
                analyser={analyser}
                active={micActive && aiMode === "listening"}
                bars={16}
                height={24}
                showBadge={false}
                color="var(--ink)"
                idleColor="rgba(17, 20, 24, 0.16)"
              />
            </div>
            <span className="t-body-s t-strong">
              {sendingTurn || aiMode === "thinking"
                ? "AI đang phân tích phản hồi…"
                : micActive
                  ? "Micro đang thu · Web Audio"
                  : micRequested
                    ? "Micro chưa sẵn sàng"
                    : "Micro đang tắt"}
            </span>
          </div>

          <div className="row wrap" style={{ justifyContent: "center" }}>
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
              disabled={!currentAiPrompt}
              onClick={handleRepeatQuestion}
            >
              Repeat question
            </Button>
          </div>

          {!sessionId && !apiError && (
            <div className="hr-error-slot">
              <div className="ir-local-notice" role="status">
                <span className="ir-local-notice__dot" aria-hidden="true" />
                <span>
                  Local Audio Studio (chưa kết nối Backend WSS). Micro Web Audio, quả cầu 3D,
                  checklist STAR và bộ đếm hard-stop BR1 hoạt động đầy đủ.
                </span>
              </div>
            </div>
          )}

          {micError && (
            <div className="hr-error-slot">
              <ErrorBanner
                title="Không thể thu âm từ micro"
                message={micError}
                onRetry={() => {
                  setMicRequested(false);
                  window.setTimeout(() => setMicRequested(true), 60);
                }}
                retryLabel="Thử bật lại micro"
              />
            </div>
          )}

          {apiError && (
            <div className="hr-error-slot">
              <ErrorBanner title="Trạng thái kết nối AI Interviewer" message={apiError} />
            </div>
          )}
        </div>

        <form className="hr-studio-composer" onSubmit={(e) => void handleSubmitTurn(e)}>
          <label htmlFor="hr-turn-input" className="field__label">
            Trả lời bằng tiếng Anh (STAR)
          </label>
          <div className="hr-composer-row">
            <textarea
              id="hr-turn-input"
              className="textarea grow"
              lang="en"
              placeholder="Type your English response following Situation → Task → Action → Result..."
              value={draftText}
              disabled={sendingTurn || finalizing}
              onChange={(e) => setDraftText(e.target.value)}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!draftText.trim() || sendingTurn || finalizing}
            >
              {sendingTurn && <span className="spinner" aria-hidden="true" />}
              {sendingTurn ? "Đang gửi…" : "Gửi lượt"}
            </Button>
          </div>
        </form>
      </div>

      <div className="lc-pane__foot">
        <span className="t-mono">
          {sessionId ? "WSS · Live English voice" : "Local Audio Studio"}
        </span>
        <span className="t-mono">BR1 · Hard-stop {durationMin}:00</span>
      </div>
    </section>
  );

  const rightPane = (
    <section className="lc-pane" aria-label="Transcript, STAR Tracker và Session Plan">
      <div className="lc-pane__head">
        <div className="lc-pane__tabs" role="tablist" aria-label="Chế độ xem thông tin phiên HR">
          <button
            type="button"
            role="tab"
            aria-selected={rightTab === "transcript"}
            className={`lc-pane__tab ${rightTab === "transcript" ? "is-active" : ""}`.trim()}
            onClick={() => setRightTab("transcript")}
          >
            Transcript
            <span className="ir-tab-count">{turns.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={rightTab === "star"}
            className={`lc-pane__tab ${rightTab === "star" ? "is-active" : ""}`.trim()}
            onClick={() => setRightTab("star")}
          >
            STAR Tracker
            <span className="ir-tab-count">{starCount}/4</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={rightTab === "plan"}
            className={`lc-pane__tab ${rightTab === "plan" ? "is-active" : ""}`.trim()}
            onClick={() => setRightTab("plan")}
          >
            Session Plan
            <span className="ir-tab-count">
              {stageIdx + 1}/{plan.length}
            </span>
          </button>
        </div>

        <Badge tone={starCount === 4 ? "success" : "neutral"} dot>
          STAR {starCount}/4
        </Badge>
      </div>

      <div className="lc-pane__body">
        {rightTab === "transcript" && (
          <div className="ir-pane-pad">
            <div className="row between">
              <h2 className="t-heading-s">Live transcript (English)</h2>
              <span className="t-mono c-ink2">{turns.length} turns</span>
            </div>
            <TranscriptList
              turns={turns}
              youLabel="You"
              aiLabel="AI Interviewer"
              emptyLabel="No conversation turns recorded yet. Speak into your microphone or submit an English response on the left."
            />
          </div>
        )}

        {rightTab === "star" && (
          <div className="ir-pane-pad">
            <div className="row between">
              <h2 className="t-heading-s">Cấu trúc trả lời S · T · A · R</h2>
              <Badge tone={starCount === 4 ? "success" : "brand"} dot>
                {starCount} / 4 phần
              </Badge>
            </div>

            <ProgressBar
              value={starCount / 4}
              tone={starCount === 4 ? "success" : "brand"}
              label="Mức hoàn thành cấu trúc STAR"
            />

            <p className="t-body-s c-ink2">
              Đánh dấu từng yếu tố bạn đã trình bày rõ ràng trong câu trả lời hành vi tiếng Anh.
            </p>

            <ul className="ir__star">
              {STAR_CRITERIA.map(({ key, name, vi, hint }) => {
                const checked = starChecked[key];
                return (
                  <li key={key}>
                    <button
                      type="button"
                      className={`ir__star-btn ${checked ? "is-checked" : ""}`.trim()}
                      aria-pressed={checked}
                      onClick={() => toggleStar(key)}
                    >
                      <span className="ir__star-letter">{key}</span>
                      <span className="ir__star-copy">
                        <span className="ir__star-heading">
                          <span className="t-body-s t-strong" lang="en">
                            {name}
                          </span>
                          <span className="t-body-s c-ink2">· {vi}</span>
                        </span>
                        <span className="ir__star-hint">{hint}</span>
                      </span>
                      <span className="ir__star-check">{checked ? "Đã nêu" : "Chờ"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {rightTab === "plan" && (
          <div className="ir-pane-pad">
            <div className="row between">
              <h2 className="t-heading-s">5-stage HR interview plan</h2>
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
                    <span className="t-body-s" lang="en">
                      {step}
                    </span>
                    {st === "now" && (
                      <Badge tone="brand" dot>
                        Đang hỏi
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ol>

            <div className="row wrap stack-sm">
              <RuleTag code="BR1">Hard-stop {durationMin}:00</RuleTag>
              <RuleTag code="BR4">Câu hỏi tạm trong phiên</RuleTag>
            </div>
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div className="lc-workbench">
      <RoomTopBar
        badge="HR · English"
        title={`Behavioral interview · ${targetProfile.role} ${targetProfile.level}`}
        remaining={formatClock(remainingSec)}
        total={`${String(durationMin).padStart(2, "0")}:00`}
        tone={timerTone}
        onSimulateTimeout={() => void finishSession("hard-stop")}
        onEnd={() => setConfirmOpen(true)}
      />

      <div className="lc-wb-body">
        <SplitPane
          direction="horizontal"
          storageKey="hr-h"
          initialRatio={0.44}
          minRatio={0.3}
          maxRatio={0.64}
          label="Điều chỉnh tỷ lệ khung AI Interviewer và khung Transcript / STAR"
          first={leftPane}
          second={rightPane}
        />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Kết thúc phiên HR sớm?"
        confirmLabel="Kết thúc & lưu snapshot"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void finishSession("early-end");
        }}
      >
        Transcript tiếng Anh và bằng chứng STAR đến thời điểm hiện tại sẽ được lưu để lập báo cáo
        (UC11 · A3). Bạn không thể mở lại phiên sau khi kết thúc.
      </ConfirmDialog>
    </div>
  );
}
