import { lazy, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, CardHead, ProgressBar, RuleTag } from "../components/ui.jsx";
import { AiAvatar, ConfirmDialog, RoomTopBar, TranscriptList } from "../components/Room.jsx";
import Waveform from "../components/Waveform.jsx";
import { problems, techPlan, techScript } from "../data/mock.js";
import { MOCK_RESULTS, SAMPLE_SOLUTION, TEST_STATUS } from "../lib/sandbox.js";
import "./InterviewRoom.css";

const CodeEditor = lazy(() => import("../components/CodeEditor.jsx"));

// UC12 Phỏng vấn kỹ thuật & Live Coding — CHỈ UI.
export default function TechInterviewScreen() {
  const navigate = useNavigate();
  const problem = problems[0];
  const [code, setCode] = useState(SAMPLE_SOLUTION);
  const [turns, setTurns] = useState(techScript);
  const [hints, setHints] = useState(0);
  const [ran, setRan] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const res = MOCK_RESULTS.submit;
  const current = [...turns].reverse().find((t) => t.who === "ai");

  const askHint = () => {
    setHints((h) => h + 1);
    setTurns((t) => [...t, { who: "hint", text: "Gợi ý định hướng: với mỗi phần tử x, bạn cần tra nhanh xem target − x đã xuất hiện chưa. Cấu trúc nào tra cứu O(1)?" }]);
  };

  return (
    <div className="room">
      <RoomTopBar badge="Technical · Live coding" title="Backend Fresher · Trung bình" remaining="04:12" total="30:00" tone="danger" onEnd={() => setConfirm(true)} />

      <div className="room-body it__body">
        <div className="it__left">
          <section className="room-stage it__stage" aria-label="Người phỏng vấn AI">
            <AiAvatar speaking />
            <p className="t-mono room-stage__label">AI Interviewer · đang hỏi</p>
            <p className="room-stage__subtitle">“{current?.text}”</p>
            <div className="room-stage__you">
              <div style={{ width: 96 }}>
                <Waveform active bars={12} height={24} idleColor="#3C5A6E" />
              </div>
              <span className="t-body-s t-strong">Think aloud — đang nghe</span>
            </div>
            <Button variant="secondary" onDark size="sm" onClick={askHint}>
              Yêu cầu gợi ý {hints > 0 && `(${hints})`}
            </Button>
          </section>

          <Card className="card--tight">
            <CardHead title="Kế hoạch phiên">
              <span className="t-body-s c-ink2">4 / 5</span>
            </CardHead>
            <ol className="ir__plan">
              {techPlan.map((step, i) => {
                const state = i < 3 ? "done" : i === 3 ? "now" : "todo";
                return (
                  <li key={step} className={`ir__plan-item is-${state}`}>
                    <span className="ir__plan-dot" aria-hidden="true" />
                    <span className="t-body-s">{step}</span>
                    {state === "now" && <Badge tone="brand">Đang làm</Badge>}
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card className="card--tight ir__transcript">
            <CardHead title="Transcript" />
            <TranscriptList turns={turns.filter((t) => t !== current)} />
          </Card>
        </div>

        <div className="it__right">
          <Card className="card--tight">
            <div className="row between wrap">
              <div className="row">
                <span className="t-mono c-ink2">Live coding</span>
                <span className="t-heading-s">{problem.title}</span>
                <Badge tone="success">Dễ</Badge>
              </div>
              <span className="t-body-s c-ink2">Trả về chỉ số hai phần tử có tổng bằng target — yêu cầu O(n).</span>
            </div>
          </Card>

          <section className="it__editor" aria-label="Trình soạn thảo trong phiên">
            <div className="it__toolbar">
              <Badge tone="brand">Python 3</Badge>
              <span className="t-mono" style={{ color: "#9FB6C6" }}>
                Đồng bộ mã · 2 giây trước
              </span>
              <span style={{ flex: 1 }} />
              <Button variant="secondary" size="sm" onDark onClick={() => setRan(true)}>
                ▶ Run
              </Button>
              <Button variant="accent" size="sm" onClick={() => setRan(true)}>
                Submit
              </Button>
            </div>
            <div className="it__monaco">
              <Suspense fallback={<div className="empty" style={{ color: "var(--code-ink)", height: "100%" }}>Đang tải trình soạn thảo…</div>}>
                <CodeEditor value={code} onChange={setCode} />
              </Suspense>
            </div>
          </section>

          <Card className="card--tight" aria-live="polite">
            <CardHead title="Kết quả sandbox">
              {ran ? <Badge tone={res.tone}>{res.summary}</Badge> : <span className="t-body-s c-ink2">Chưa chạy</span>}
            </CardHead>
            {ran ? (
              <div className="row wrap stack-sm">
                {res.tests.map((t) => (
                  <Badge key={t.name} tone={TEST_STATUS[t.status].tone}>
                    {t.name.replace(" (dữ liệu lớn)", "")} · {TEST_STATUS[t.status].label}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="t-body-s c-ink2">Bấm Run/Submit để chấm trong sandbox. AI sẽ hỏi tiếp về độ phức tạp và edge case dựa trên kết quả.</p>
            )}
          </Card>

          <div className="it__scores">
            <Card className="card--tight it__score">
              <div className="row between">
                <p className="t-mono c-ink2">Tính đúng của mã</p>
                <span className="t-body-s c-ink2">từ test case</span>
              </div>
              <p className="t-number">{ran ? "4 / 5" : "— / 5"}</p>
              <ProgressBar value={ran ? 0.8 : 0} tone="success" label="Tỉ lệ test passed" />
            </Card>
            <Card className="card--tight it__score">
              <div className="row between">
                <p className="t-mono c-ink2">Lập luận</p>
                <span className="t-body-s c-ink2">theo rubric</span>
              </div>
              <p className="t-number">6 lượt</p>
              <p className="t-body-s c-ink2">Đang thu thập bằng chứng{hints > 0 ? ` · đã dùng ${hints} gợi ý` : ""}</p>
            </Card>
          </div>
          <div className="row wrap stack-sm">
            <RuleTag code="BR2">Chấm độc lập mã & lập luận</RuleTag>
            <RuleTag code="BR3">Mã chạy trong sandbox</RuleTag>
            <RuleTag code="NFR01">AI phản hồi ≤ 2,5 giây</RuleTag>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Kết thúc phiên sớm?"
        confirmLabel="Kết thúc & lưu snapshot"
        onCancel={() => setConfirm(false)}
        onConfirm={() => navigate("/interview/ended", { state: { type: "technical", reason: "early" } })}
      >
        Trình soạn thảo sẽ bị khóa; mã nguồn hiện tại, transcript và kết quả test được lưu để chấm điểm.
      </ConfirmDialog>
    </div>
  );
}
