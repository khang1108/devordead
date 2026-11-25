import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge, Button, Card, CardHead, ProgressBar, RuleTag } from "../components/ui.jsx";
import { AiAvatar, ConfirmDialog, RoomTopBar, TranscriptList } from "../components/Room.jsx";
import Waveform from "../components/Waveform.jsx";
import { hrPlan, hrScript } from "../data/mock.js";
import "./InterviewRoom.css";

const STAR_ITEMS = [
  { key: "S", en: "Situation", vi: "Bối cảnh dự án, quy mô nhóm & thời điểm" },
  { key: "T", en: "Task", vi: "Trách nhiệm cụ thể của cá nhân bạn" },
  { key: "A", en: "Action", vi: "Hành động trực tiếp (dùng “I”, nêu lập luận)" },
  { key: "R", en: "Result", vi: "Kết quả định lượng & bài học rút ra" },
];

const FOLLOW_UP_QUESTIONS = [
  "Thank you for sharing concrete metrics. Looking back, what would you do differently if that teammate still disagreed after seeing the benchmark?",
  "How do you prioritize tasks when two urgent production issues happen at the same time?",
];

function formatClock(sec) {
  const safe = Math.max(0, sec);
  const m = String(Math.floor(safe / 60)).padStart(2, "0");
  const s = String(safe % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// UC11 Phỏng vấn HR (Behavioral · Tiếng Anh) — CHỈ UI.
export default function HrInterviewScreen() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const durationMin = state?.duration ?? 30;

  const [remainingSec, setRemainingSec] = useState(() => (durationMin === 30 ? 696 : durationMin * 60 - 180));
  const [micOn, setMicOn] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [turns, setTurns] = useState(hrScript);
  const [stageIdx, setStageIdx] = useState(2); // Stage 3/5 Behavioral (STAR)
  const [aiMode, setAiMode] = useState("speaking"); // speaking | listening | thinking
  const [interimEn, setInterimEn] = useState("");
  const [followIdx, setFollowIdx] = useState(0);

  const [starChecked, setStarChecked] = useState({ S: true, T: true, A: false, R: false });

  const currentAiPrompt = [...turns].reverse().find((t) => t.who === "ai") ?? hrScript[hrScript.length - 1];
  const historyTurns = turns.filter((t) => t !== currentAiPrompt);
  const starCount = Object.values(starChecked).filter(Boolean).length;

  const finishSession = (reason) => {
    navigate("/interview/ended", {
      state: {
        type: "hr",
        reason,
        duration: durationMin,
        turnsCount: turns.length,
        hints: 0,
      },
    });
  };

  useEffect(() => {
    if (aiMode !== "speaking") return undefined;
    const id = setTimeout(() => setAiMode("listening"), 2200);
    return () => clearTimeout(id);
  }, [aiMode]);

  useEffect(() => {
    if (confirm) return undefined;
    const id = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [confirm]);

  useEffect(() => {
    if (remainingSec === 0) {
      finishSession("timeout");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSec]);

  const toggleStar = (key) => {
    setStarChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const simulateStarAnswer = () => {
    if (aiMode === "thinking") return;
    setMicOn(true);
    setAiMode("listening");
    setInterimEn("In our capstone booking API, a teammate wanted in-memory retries while I proposed PostgreSQL idempotency keys...");
    setStarChecked({ S: true, T: true, A: true, R: false });

    setTimeout(() => {
      setStarChecked({ S: true, T: true, A: true, R: true });
      setInterimEn("");
      setAiMode("thinking");
      const fullAnswer =
        "In our 4-person capstone team (Situation), I owned payment reliability (Task). When a teammate favored in-memory retries, I ran a failure benchmark comparing it with PostgreSQL idempotency keys (Action), reducing duplicate charges to 0% in load testing (Result).";
      const nextQ = FOLLOW_UP_QUESTIONS[followIdx % FOLLOW_UP_QUESTIONS.length];

      setTimeout(() => {
        setTurns((prev) => [...prev, { who: "you", text: fullAnswer }, { who: "ai", text: nextQ }]);
        setFollowIdx((i) => i + 1);
        setStageIdx((s) => Math.min(hrPlan.length - 1, s + 1));
        setAiMode("speaking");
      }, 900);
    }, 950);
  };

  const timerTone = remainingSec <= 300 ? "danger" : remainingSec <= 720 ? "warn" : "normal";

  return (
    <div className="room">
      <RoomTopBar
        badge="HR · English"
        title="Behavioral interview · Backend Fresher"
        remaining={formatClock(remainingSec)}
        total={`${String(durationMin).padStart(2, "0")}:00`}
        tone={timerTone}
        onSimulateTimeout={() => finishSession("timeout")}
        onEnd={() => setConfirm(true)}
      />

      <div className="room-body ir__body">
        <section className="room-stage" aria-label="Người phỏng vấn AI (Tiếng Anh)">
          <div className="room-stage__telemetry">
            <span className="room-stage__meta">WSS · TLS 1.3 (NFR03) · English STT/TTS</span>
            <RuleTag code="NFR01">Phản hồi 1,18s ≤ 2,5s</RuleTag>
          </div>

          <AiAvatar
            size={152}
            speaking={aiMode === "speaking"}
            listening={aiMode === "listening" && micOn}
            thinking={aiMode === "thinking"}
          />

          <div className="col stack-sm" style={{ alignItems: "center" }}>
            <span className="ir__stage-tag">
              Stage {stageIdx + 1} / {hrPlan.length} · {hrPlan[stageIdx]} (Live English captions · NFR08)
            </span>
            <p className="room-stage__subtitle" lang="en" aria-live="polite">
              “{currentAiPrompt.text}”
            </p>
          </div>

          <div className="room-stage__you">
            <div style={{ width: 112 }}>
              <Waveform
                active={micOn && aiMode === "listening"}
                bars={14}
                height={24}
                showBadge={false}
                color="var(--ink)"
                idleColor="rgba(17, 20, 24, 0.16)"
              />
            </div>
            <span className="t-body-s t-strong" style={{ color: "var(--ink)" }}>
              {aiMode === "thinking"
                ? "Analyzing STAR evidence..."
                : micOn
                  ? "Your turn — speaking in English"
                  : "Micro đang tắt"}
            </span>
          </div>

          <div className="row wrap" style={{ justifyContent: "center" }}>
            <Button variant="primary" size="sm" onClick={simulateStarAnswer} disabled={aiMode === "thinking"}>
              <span className="ir__rec-dot" aria-hidden="true" />
              Trả lời mẫu theo STAR (EN)
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setAiMode("speaking")}>
              Repeat question
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMicOn((v) => !v)}
              aria-pressed={!micOn}
            >
              {micOn ? "Tắt micro" : "Bật micro"}
            </Button>
          </div>

          <p className="t-body-s ir__hint">
            Phiên HR diễn ra hoàn toàn bằng tiếng Anh. Nếu bạn dừng quá ngưỡng im lặng, AI sẽ diễn đạt lại câu hỏi (UC11 · A1).
          </p>
        </section>

        {/* Cột phải hợp nhất, phân tách bằng đường 1px mảnh (không hộp lồng trong hộp, không nền xanh pastel) */}
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
                {STAR_ITEMS.map(({ key, en, vi }) => {
                  const checked = Boolean(starChecked[key]);
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        className={`ir__star-btn ${checked ? "is-checked" : ""}`}
                        aria-pressed={checked}
                        onClick={() => toggleStar(key)}
                      >
                        <span className="ir__star-letter">{key}</span>
                        <span className="col" style={{ "--gap": "1px", minWidth: 0 }}>
                          <span className="t-body-s t-strong" style={{ color: "var(--ink)" }} lang="en">
                            {en}
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
                  {stageIdx + 1} / {hrPlan.length}
                </span>
              </CardHead>
              <ol className="ir__plan">
                {hrPlan.map((step, i) => {
                  const st = i < stageIdx ? "done" : i === stageIdx ? "now" : "todo";
                  return (
                    <li key={step} className={`ir__plan-item is-${st}`}>
                      <span className="ir__plan-dot" aria-hidden="true" />
                      <span className="t-body-s" lang="en">
                        {step}
                      </span>
                      {st === "now" && <Badge tone="brand" dot>Đang hỏi</Badge>}
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="ir__side-section ir__transcript-box">
              <CardHead title="Transcript (EN)">
                <span className="t-mono c-ink2">{turns.length} turns</span>
              </CardHead>
              <TranscriptList turns={historyTurns} interim={interimEn} youLabel="You" aiLabel="AI Interviewer" />
            </div>
          </Card>

          <div className="row wrap stack-sm">
            <RuleTag code="BR1">Hard-stop {durationMin}:00</RuleTag>
            <RuleTag code="BR4">Câu hỏi tạm trong phiên</RuleTag>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Kết thúc phiên HR sớm?"
        confirmLabel="Kết thúc & lưu snapshot"
        onCancel={() => setConfirm(false)}
        onConfirm={() => finishSession("early")}
      >
        Transcript tiếng Anh và bằng chứng STAR đến thời điểm hiện tại sẽ được lưu để lập báo cáo (UC11 · A3). Bạn không thể mở lại phiên sau khi kết thúc.
      </ConfirmDialog>
    </div>
  );
}
