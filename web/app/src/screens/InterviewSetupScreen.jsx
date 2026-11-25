import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Callout, Card, CardHead, PageHeader, RuleTag, Segmented, Toggle } from "../components/ui.jsx";
import { DIFFICULTY } from "../data/mock.js";
import "./InterviewSetupScreen.css";

const sessionTypes = [
  {
    value: "hr",
    title: "HR — Behavioral",
    badge: "TIẾNG ANH",
    detail: "Kinh nghiệm dự án và câu hỏi tình huống theo STAR.",
  },
  {
    value: "technical",
    title: "Technical & Live Coding",
    badge: "SANDBOX",
    detail: "Kiến thức nền tảng và giải bài tập lập trình trực tiếp.",
  },
];

const durations = [15, 30, 45].map((value) => ({ value, label: `${value} phút` }));
const difficulties = Object.entries(DIFFICULTY).map(([value, { label }]) => ({ value, label }));
const contextLabel = "Dùng CV/JD đã tải làm ngữ cảnh";

function handleSegmentKeys(event) {
  const options = Array.from(event.currentTarget.querySelectorAll('button[role="radio"]'));
  const index = options.indexOf(event.target);
  const count = options.length;
  const next = {
    ArrowLeft: (index - 1 + count) % count,
    ArrowUp: (index - 1 + count) % count,
    ArrowRight: (index + 1) % count,
    ArrowDown: (index + 1) % count,
    Home: 0,
    End: count - 1,
  }[event.key];

  if (index === -1 || next === undefined) return;
  event.preventDefault();
  options[next].focus();
  options[next].click();
}

export default function InterviewSetupScreen() {
  const navigate = useNavigate();
  const [sessionType, setSessionType] = useState("technical");
  const [duration, setDuration] = useState(30);
  const [difficulty, setDifficulty] = useState("medium");
  const [useCv, setUseCv] = useState(false);
  const [microphone, setMicrophone] = useState({ status: "idle" });
  const [audioStatus, setAudioStatus] = useState("idle");
  const microphoneReady = microphone.status === "ready";

  // CHỈ UI: không truy cập micro/loa thật — chỉ chuyển trạng thái hiển thị (checking → ready).
  // Trạng thái "error" (E2) vẫn được giữ trong giao diện để backend/tích hợp sau này dùng.
  function checkMicrophone() {
    setMicrophone({ status: "checking" });
    setTimeout(() => setMicrophone({ status: "ready" }), 900);
  }

  function playTestSound() {
    setAudioStatus("playing");
    setTimeout(() => setAudioStatus("played"), 700);
  }

  return (
    <div className="col stack-lg">
      <PageHeader
        eyebrow="05 — PHỎNG VẤN MÔ PHỎNG"
        title="Cấu hình phiên phỏng vấn"
        subtitle="Chọn nội dung, thời lượng và kiểm tra thiết bị trước khi vào phiên."
      />

      <div className="grid setup-layout">
        <div className="col setup-options">
          <Card>
            <CardHead title="Loại phiên" />
            <div className="grid setup-types" role="radiogroup" aria-label="Loại phiên">
              {sessionTypes.map(({ value, title, badge, detail }) => (
                <label className="setup-type" key={value}>
                  <input
                    className="sr-only"
                    type="radio"
                    name="setup-session-type"
                    value={value}
                    checked={sessionType === value}
                    onChange={() => setSessionType(value)}
                  />
                  <span className="col stack-sm setup-type-card">
                    <span className="row between">
                      <Badge tone="brand">{badge}</Badge>
                      <span className="setup-radio-mark" aria-hidden="true" />
                    </span>
                    <span className="t-heading-s">{title}</span>
                    <span className="t-body-s c-ink2">{detail}</span>
                  </span>
                </label>
              ))}
            </div>
          </Card>

          <Card aria-label="Thời lượng, độ khó và ngữ cảnh">
            <div className="grid setup-segments">
              <div className="col stack-sm" onKeyDown={handleSegmentKeys}>
                <CardHead title="Thời lượng" />
                <Segmented label="Thời lượng" options={durations} value={duration} onChange={setDuration} />
              </div>
              <div className="col stack-sm" onKeyDown={handleSegmentKeys}>
                <CardHead title="Độ khó" />
                <Segmented label="Độ khó" options={difficulties} value={difficulty} onChange={setDifficulty} />
              </div>
            </div>
            <div className="row between setup-context">
              <span className="t-body-s t-strong">{contextLabel}</span>
              <Toggle label={contextLabel} checked={useCv} onChange={setUseCv} />
            </div>
          </Card>

          <Card>
            <CardHead title="Kiểm tra thiết bị" />
            <div className="row wrap setup-device-actions">
              <Button variant="secondary" onClick={checkMicrophone} disabled={microphone.status === "checking"}>
                {microphone.status === "checking" && <span className="spinner" aria-hidden="true" />}
                {microphone.status === "checking" ? "Đang kiểm tra micro…" : "Kiểm tra micro"}
              </Button>
              <Button variant="secondary" onClick={playTestSound} disabled={audioStatus === "playing"}>
                {audioStatus === "playing" ? "Đang phát âm thanh…" : "Phát âm thanh thử"}
              </Button>
              <div className="setup-microphone-status" role="status">
                {microphoneReady && <Badge tone="success" dot>HOẠT ĐỘNG</Badge>}
              </div>
            </div>
            {microphone.status === "error" && (
              <div role="alert">
                <Callout tone="danger" title="Không thể truy cập micro">
                  {microphone.message}
                </Callout>
              </div>
            )}
            {audioStatus === "error" && (
              <div role="alert">
                <Callout tone="danger">Không phát được âm thanh thử. Kiểm tra cài đặt âm thanh của trình duyệt rồi thử lại.</Callout>
              </div>
            )}
            {audioStatus === "played" && (
              <p className="t-body-s c-ink2" role="status">Đã phát âm thanh thử.</p>
            )}
          </Card>
        </div>

        <Card className="setup-summary">
          <CardHead title="Tóm tắt phiên" />
          <dl className="setup-details">
            <div className="kv">
              <dt>Loại phiên</dt>
              <dd>{sessionTypes.find(({ value }) => value === sessionType).title}</dd>
            </div>
            <div className="kv">
              <dt>Thời lượng</dt>
              <dd>{duration} phút</dd>
            </div>
            <div className="kv">
              <dt>Độ khó</dt>
              <dd>{DIFFICULTY[difficulty].label}</dd>
            </div>
            <div className="kv">
              <dt>Ngữ cảnh CV/JD</dt>
              <dd>{useCv ? "Có" : "Không"}</dd>
            </div>
          </dl>

          <Callout tone="warning">
            <div className="col stack-sm">
              <span><RuleTag code="BR1">HARD-STOP</RuleTag></span>
              <p>Phiên tự kết thúc đúng <strong>{duration}:00</strong>, không kéo dài dù câu hỏi hoặc bài code đang dang dở.</p>
            </div>
          </Callout>

          <div className="col stack-sm">
            <Button
              variant="accent"
              block
              disabled={!microphoneReady}
              aria-describedby={microphoneReady ? undefined : "setup-mic-required"}
              onClick={() => navigate(`/interview/${sessionType}`, { state: { duration, difficulty, useCv } })}
            >
              Bắt đầu phỏng vấn <span aria-hidden="true">→</span>
            </Button>
            {!microphoneReady && (
              <p className="t-body-s c-ink2 setup-mic-required" id="setup-mic-required">
                Kiểm tra micro thành công để bắt đầu phiên.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
