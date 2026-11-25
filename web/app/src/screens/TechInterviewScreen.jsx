import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge, Button, Card, CardHead, ProgressBar, RuleTag } from "../components/ui.jsx";
import { AiAvatar, ConfirmDialog, RoomTopBar, TranscriptList } from "../components/Room.jsx";
import Waveform from "../components/Waveform.jsx";
import { DIFFICULTY, LANGUAGES, problems, techPlan, techScript } from "../data/mock.js";
import { MOCK_RESULTS, SAMPLE_SOLUTION, SANDBOX_CONSTRAINTS_SPEC, TEST_STATUS } from "../lib/sandbox.js";
import "./InterviewRoom.css";

const CodeEditor = lazy(() => import("../components/CodeEditor.jsx"));

function formatClock(sec) {
  const safe = Math.max(0, sec);
  const m = String(Math.floor(safe / 60)).padStart(2, "0");
  const s = String(safe % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// UC12 Phỏng vấn kỹ thuật & Live Coding — CHỈ UI.
export default function TechInterviewScreen() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const durationMin = state?.duration ?? 30;
  const diffKey = state?.difficulty ?? "medium";
  const diffLabel = DIFFICULTY[diffKey]?.label ?? "Trung bình";

  const problem = problems[0];
  const [lang, setLang] = useState("python");
  const [fontSize, setFontSize] = useState(13.5);
  const [code, setCode] = useState(SAMPLE_SOLUTION);
  const [turns, setTurns] = useState(techScript);
  const [hints, setHints] = useState(0);
  const [reasoningTurns, setReasoningTurns] = useState(6);

  const [micOn, setMicOn] = useState(true);
  const [aiMode, setAiMode] = useState("speaking"); // speaking | listening | thinking
  const [sandboxMode, setSandboxMode] = useState(null); // null | "run" | "submit"
  const [sandboxRunning, setSandboxRunning] = useState(false);
  const [stageIdx, setStageIdx] = useState(3); // 4/5 Live coding: Two Sum
  const [remainingSec, setRemainingSec] = useState(252); // 04:12 — hiển thị rõ trạng thái < 5:00 BR1
  const [confirm, setConfirm] = useState(false);

  const currentAiPrompt = [...turns].reverse().find((t) => t.who === "ai");
  const res = sandboxMode ? MOCK_RESULTS[sandboxMode] : null;
  const passedCount = sandboxMode === "run" ? 2 : sandboxMode === "submit" ? 4 : 0;
  const totalCount = sandboxMode === "run" ? 2 : 5;

  const finishSession = (reason) => {
    navigate("/interview/ended", {
      state: {
        type: "technical",
        reason,
        duration: durationMin,
        code,
        lang,
        hints,
        turnsCount: turns.length + 4,
        passed: 4,
        total: 5,
      },
    });
  };

  useEffect(() => {
    if (aiMode !== "speaking") return undefined;
    const id = setTimeout(() => setAiMode("listening"), 2100);
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

  const askHint = () => {
    const nextHintCount = hints + 1;
    setHints(nextHintCount);
    setAiMode("speaking");
    setTurns((prev) => [
      ...prev,
      {
        who: "hint",
        text:
          nextHintCount === 1
            ? "Gợi ý #1: Với mỗi phần tử x, bạn cần tra nhanh xem phần bù (target − x) đã xuất hiện chưa. Cấu trúc nào hỗ trợ tra cứu trung bình O(1)?"
            : "Gợi ý #2: Kiểm tra `need in seen` trước khi gán `seen[x] = i` để xử lý đúng trường hợp hai phần tử trùng giá trị như nums = [3, 3], target = 6.",
      },
    ]);
  };

  const simulateThinkAloud = () => {
    setMicOn(true);
    setAiMode("thinking");
    setTimeout(() => {
      setReasoningTurns((n) => n + 1);
      setTurns((prev) => [
        ...prev,
        {
          who: "you",
          text: "Mình duyệt mảng một lần và lưu giá trị kèm chỉ số vào dictionary `seen`, nên thời gian là O(n) và bộ nhớ phụ tối đa O(n).",
        },
        {
          who: "ai",
          text: "Lập luận hợp lý. Nếu mảng có hai số bằng nhau như [3, 3] và target = 6 thì thứ tự cập nhật dictionary xử lý thế nào?",
        },
      ]);
      setAiMode("speaking");
    }, 750);
  };

  const runInSandbox = (mode) => {
    setSandboxRunning(true);
    setSandboxMode(mode);
    setTimeout(() => {
      setSandboxRunning(false);
      if (mode === "submit") {
        setStageIdx(4);
        setAiMode("speaking");
        setTurns((prev) => {
          const alreadyAsked = prev.some((t) => t.text.includes("Test 5 dữ liệu lớn"));
          if (alreadyAsked) return prev;
          return [
            ...prev,
            {
              who: "ai",
              text: "Sandbox báo 4/5 test đạt, riêng Test 5 dữ liệu lớn chạm ngưỡng 3 giây. Bạn phân tích giúp mình độ phức tạp bộ nhớ và điểm nghẽn hiện tại nhé?",
            },
          ];
        });
      }
    }, 620);
  };

  const timerTone = remainingSec <= 300 ? "danger" : remainingSec <= 720 ? "warn" : "normal";

  return (
    <div className="room">
      <RoomTopBar
        badge="Technical · Live coding"
        title={`Backend Fresher · ${diffLabel}`}
        remaining={formatClock(remainingSec)}
        total={`${String(durationMin).padStart(2, "0")}:00`}
        tone={timerTone}
        onSimulateTimeout={() => finishSession("timeout")}
        onEnd={() => setConfirm(true)}
      />

      <div className="room-body it__body">
        {/* Cột trái hợp nhất trong 1 khung phẳng duy nhất, chia bằng đường 1px */}
        <Card as="aside" className="it__left-panel" aria-label="Người phỏng vấn AI & Transcript">
          <div className="it__stage-pane">
            <div className="room-stage__telemetry">
              <span className="room-stage__meta">WSS · Live voice</span>
              <RuleTag code="NFR01">1,34s ≤ 2,5s</RuleTag>
            </div>

            <AiAvatar
              size={104}
              speaking={aiMode === "speaking"}
              listening={aiMode === "listening" && micOn}
              thinking={aiMode === "thinking" || sandboxRunning}
            />

            <p className="room-stage__label">
              {aiMode === "speaking"
                ? "AI Interviewer · Đang trao đổi"
                : aiMode === "thinking" || sandboxRunning
                  ? "Đang phân tích mã & lập luận..."
                  : micOn
                    ? "Think-aloud · Đang nghe bạn giải thích"
                    : "Micro đang tắt"}
            </p>

            <p className="room-stage__subtitle" aria-live="polite">
              “{currentAiPrompt?.text}”
            </p>

            <div className="room-stage__you">
              <div style={{ width: 92 }}>
                <Waveform
                  active={micOn && aiMode === "listening"}
                  bars={12}
                  height={22}
                  showBadge={false}
                  color="var(--ink)"
                  idleColor="rgba(17, 20, 24, 0.16)"
                />
              </div>
              <span className="t-body-s t-strong" style={{ color: "var(--ink)" }}>
                {micOn ? "Think aloud — đang thu" : "Đã tắt mic"}
              </span>
            </div>

            <div className="it__voice-actions">
              <Button variant="primary" size="sm" onClick={simulateThinkAloud} disabled={aiMode === "thinking"}>
                <span className="ir__rec-dot" aria-hidden="true" />
                Nói hướng giải O(n)
              </Button>
              <Button variant="secondary" size="sm" onClick={askHint}>
                Yêu cầu gợi ý {hints > 0 ? `(${hints})` : ""}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMicOn((v) => !v)}
                aria-pressed={!micOn}
              >
                {micOn ? "Tắt mic" : "Bật mic"}
              </Button>
            </div>
          </div>

          <div className="ir__side-section">
            <CardHead title="Kế hoạch phiên (UC12)">
              <span className="t-mono c-ink2">
                {stageIdx + 1} / {techPlan.length}
              </span>
            </CardHead>
            <ol className="ir__plan">
              {techPlan.map((step, i) => {
                const st = i < stageIdx ? "done" : i === stageIdx ? "now" : "todo";
                return (
                  <li key={step} className={`ir__plan-item is-${st}`}>
                    <span className="ir__plan-dot" aria-hidden="true" />
                    <span className="t-body-s">{step}</span>
                    {st === "now" && <Badge tone="brand" dot>Đang làm</Badge>}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="ir__side-section ir__transcript-box">
            <CardHead title="Transcript & gợi ý">
              <span className="t-mono c-ink2">{turns.length} lượt</span>
            </CardHead>
            <TranscriptList turns={turns.filter((t) => t !== currentAiPrompt)} />
          </div>
        </Card>

        {/* Cột phải: Đề bài gọn + Monaco IDE + Sổ cái Sandbox & Chấm độc lập BR2 */}
        <div className="it__right">
          <Card className="card--tight it__problem-bar">
            <div className="row between wrap">
              <div className="row wrap stack-sm">
                <span className="t-mono c-ink2">#{problem.id}</span>
                <h1 className="t-heading-s">{problem.title}</h1>
                <Badge tone="success" dot>
                  Dễ
                </Badge>
                <span className="t-body-s c-ink2">· Yêu cầu O(n) thời gian</span>
              </div>
              <span className="t-code c-ink2">nums = [2,7,11,15], target = 9 → [0,1]</span>
            </div>
            <p className="t-body-s c-ink2">{problem.description}</p>
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
                onChange={(e) => setLang(e.target.value)}
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
                  onClick={() => setFontSize((s) => Math.max(12, s - 0.5))}
                  aria-label="Giảm cỡ chữ"
                >
                  A−
                </button>
                <span className="t-mono" style={{ padding: "0 4px", fontSize: 12 }}>
                  {Math.round(fontSize)}
                </span>
                <button
                  type="button"
                  onClick={() => setFontSize((s) => Math.min(22, s + 0.5))}
                  aria-label="Tăng cỡ chữ"
                >
                  A+
                </button>
              </div>

              <span className="it__sync">Đã đồng bộ Redis · 1s trước</span>
              <span style={{ flex: 1 }} />

              <Button
                variant="secondary"
                size="sm"
                onDark
                disabled={sandboxRunning}
                onClick={() => runInSandbox("run")}
              >
                Run
              </Button>
              <Button
                variant="accent"
                size="sm"
                className="it__submit-btn"
                disabled={sandboxRunning}
                onClick={() => runInSandbox("submit")}
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
                <CodeEditor language={lang} value={code} onChange={setCode} fontSize={fontSize} />
              </Suspense>
            </div>
          </section>

          {/* Sổ cái hợp nhất Sandbox + 2 trụ cột BR2 (phân tách bằng đường 1px, không lồng hộp) */}
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
                ) : res ? (
                  <Badge tone={res.tone} dot>
                    {res.summary} · container đã hủy
                  </Badge>
                ) : (
                  <span className="t-body-s c-ink2">Chưa chạy test</span>
                )}
              </div>

              <p className="t-mono it__sandbox-spec">{SANDBOX_CONSTRAINTS_SPEC}</p>

              {res && !sandboxRunning ? (
                <div className="it__test-rows">
                  {res.tests.map((t) => {
                    const st = TEST_STATUS[t.status];
                    return (
                      <div key={t.name} className="it__test-row">
                        <span className="t-body-s t-strong" style={{ color: "var(--ink)" }}>
                          {t.name}
                        </span>
                        <div className="row stack-sm">
                          <span className="t-mono c-ink2">
                            {t.status === "tle" ? "> 3000 ms" : `${t.timeMs} ms`} · {t.memMb.toFixed(1)} MB
                          </span>
                          <Badge tone={st.tone} dot>
                            {st.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="t-body-s c-ink2">
                  Bấm <strong>Run</strong> hoặc <strong>Submit</strong> để chấm trong container cô lập. AI sẽ hỏi tiếp về độ phức tạp và edge case dựa trên kết quả chạy.
                </p>
              )}
            </div>

            <div className="it__scores-ledger">
              <div className="it__score-cell">
                <div className="row between">
                  <span className="t-body-s c-ink2">Tính đúng của mã</span>
                  <span className="t-mono c-ink2">Sandbox</span>
                </div>
                <p className="t-number">
                  {sandboxMode ? `${passedCount} / ${totalCount}` : "— / 5"}
                </p>
                <ProgressBar
                  value={sandboxMode ? passedCount / totalCount : 0}
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
                <p className="t-number">{reasoningTurns} lượt</p>
                <ProgressBar value={Math.min(1, reasoningTurns / 8)} tone="brand" label="Bằng chứng lập luận" />
                <p className="t-body-s c-ink2">
                  Đánh giá qua lời giải thích Big-O &amp; edge case
                  {hints > 0 ? ` · đã dùng ${hints} gợi ý` : ""}.
                </p>
              </div>
            </div>

            <div className="it__ledger-foot">
              <div className="row wrap stack-sm">
                <RuleTag code="BR2">Tính đúng của mã &amp; Lập luận chấm độc lập</RuleTag>
              </div>
              <Button variant="ghost" size="sm" onClick={() => finishSession("timeout")}>
                Mô phỏng chạm 00:00 (UC13) →
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Kết thúc phiên Technical sớm?"
        confirmLabel="Kết thúc & chụp snapshot"
        onCancel={() => setConfirm(false)}
        onConfirm={() => finishSession("early")}
      >
        Trình soạn thảo sẽ bị khóa ngay lập tức; bản chụp mã nguồn hiện tại, toàn bộ transcript và kết quả test được lưu cố định để chấm điểm độc lập (BR1, BR2).
      </ConfirmDialog>
    </div>
  );
}
