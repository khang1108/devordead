import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge, Button, Card, CardHead, ErrorBanner, ProgressBar, RuleTag } from "@shared/ui";
import Waveform from "@shared/components/Waveform";
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

// UC11 Phỏng vấn HR (Behavioral · Tiếng Anh)
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
  const [apiError, setApiError] = useState<string | null>(() =>
    !sessionId
      ? "Phiên đang chạy ở chế độ cục bộ (chưa có kết nối Backend AI Interviewer). Micro, sóng âm, quả cầu 3D, checklist STAR và bộ đếm hard-stop BR1 vẫn hoạt động đầy đủ."
      : null,
  );
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
  const historyTurns = currentAiPrompt ? turns.filter((t) => t !== currentAiPrompt) : turns;
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
            "Không thể khởi động micro. Bạn vẫn có thể nhập câu trả lời bằng bàn phím bên dưới.",
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
    latencyMs !== null ? `Phản hồi ${(latencyMs / 1000).toFixed(2)}s ≤ 2,5s` : "Ngưỡng ≤ 2,5s";

  return (
    <div className="room">
      <RoomTopBar
        badge="HR · English"
        title={`Behavioral interview · ${targetProfile.role} ${targetProfile.level}`}
        remaining={formatClock(remainingSec)}
        total={`${String(durationMin).padStart(2, "0")}:00`}
        tone={timerTone}
        onSimulateTimeout={() => void finishSession("hard-stop")}
        onEnd={() => setConfirmOpen(true)}
      />

      <div className="room-body ir__body">
        <section className="room-stage" aria-label="Người phỏng vấn AI (Tiếng Anh)">
          <div className="room-stage__telemetry">
            <span className="room-stage__meta">
              {sessionId
                ? `WSS · ${interviewService.getInterviewWsUrl(sessionId)}`
                : "Local Audio Studio · Chưa kết nối máy chủ WSS"}
            </span>
            <RuleTag code="NFR01">{latencyLabel}</RuleTag>
          </div>

          <AiAvatar
            size={152}
            analyser={analyser}
            speaking={aiMode === "speaking"}
            listening={aiMode === "listening" && micActive}
            thinking={aiMode === "thinking" || sendingTurn}
          />

          <div className="col stack-sm" style={{ alignItems: "center" }}>
            <span className="ir__stage-tag">
              Stage {stageIdx + 1} / {plan.length} · {currentStageName} (Live English captions · NFR08)
            </span>
            <p className="room-stage__subtitle" lang="en" aria-live="polite">
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
                bars={14}
                height={24}
                showBadge={false}
                color="var(--ink)"
                idleColor="rgba(17, 20, 24, 0.16)"
              />
            </div>
            <span className="t-body-s t-strong" style={{ color: "var(--ink)" }}>
              {sendingTurn || aiMode === "thinking"
                ? "AI đang phân tích phản hồi..."
                : micActive
                  ? "Micro đang thu · Web Audio live"
                  : micRequested
                    ? "Micro chưa sẵn sàng"
                    : "Micro đang tắt"}
            </span>
          </div>

          <div className="row wrap" style={{ justifyContent: "center" }}>
            <Button
              variant="secondary"
              size="sm"
              disabled={!currentAiPrompt}
              onClick={handleRepeatQuestion}
            >
              Repeat question
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMicRequested((v) => !v)}
              aria-pressed={!micRequested}
            >
              {micRequested ? "Tắt micro" : "Bật micro"}
            </Button>
          </div>

          {micError && (
            <div className="ir__error-slot">
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
            <div className="ir__error-slot">
              <ErrorBanner title="Trạng thái kết nối AI Interviewer" message={apiError} />
            </div>
          )}

          <form className="ir__composer" onSubmit={(e) => void handleSubmitTurn(e)}>
            <label htmlFor="hr-turn-input" className="field__label">
              Gửi lượt trả lời (Tiếng Anh · STAR)
            </label>
            <div className="ir__composer-row">
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
                {sendingTurn ? "Đang gửi..." : "Gửi lượt"}
              </Button>
            </div>
          </form>

          <p className="t-body-s ir__hint">
            Phiên HR diễn ra bằng tiếng Anh. Khi đồng hồ chạm 00:00, hệ thống tự động niêm phong
            transcript theo quy định hard-stop (BR1).
          </p>
        </section>

        <aside className="ir__side" aria-label="Tiến độ phiên & khung STAR">
          <Card className="ir__unified-side">
            <div className="ir__side-section">
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
              <ul className="ir__star">
                {STAR_CRITERIA.map(({ key, name, vi, hint }) => {
                  const checked = starChecked[key];
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        className={`ir__star-btn ${checked ? "is-checked" : ""}`}
                        aria-pressed={checked}
                        title={hint}
                        onClick={() => toggleStar(key)}
                      >
                        <span className="ir__star-letter">{key}</span>
                        <span
                          className="col"
                          style={{ "--gap": "1px", minWidth: 0 } as CSSProperties}
                        >
                          <span className="t-body-s t-strong" style={{ color: "var(--ink)" }} lang="en">
                            {name}
                          </span>
                          <span className="t-body-s c-ink2">{vi}</span>
                        </span>
                        <span className="ir__star-check">{checked ? "Đã nêu" : "Chờ"}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="ir__side-section">
              <CardHead title="Kế hoạch phiên">
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
            </div>

            <div className="ir__side-section ir__transcript-box">
              <CardHead title="Transcript (EN)">
                <span className="t-mono c-ink2">{turns.length} turns</span>
              </CardHead>
              <TranscriptList
                turns={historyTurns}
                youLabel="You"
                aiLabel="AI Interviewer"
                emptyLabel="Chưa có lượt hội thoại nào."
              />
            </div>
          </Card>

          <div className="row wrap stack-sm">
            <RuleTag code="BR1">Hard-stop {durationMin}:00</RuleTag>
            <RuleTag code="BR4">Câu hỏi tạm trong phiên</RuleTag>
          </div>
        </aside>
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
