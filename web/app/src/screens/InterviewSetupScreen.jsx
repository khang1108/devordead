import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Callout, Card, CardHead, PageHeader, RuleTag, Segmented, Toggle } from "../components/ui.jsx";
import { currentUser, DIFFICULTY, hrPlan, techPlan } from "../data/mock.js";
import "./InterviewSetupScreen.css";

const sessionTypes = [
  {
    value: "hr",
    title: "HR — Behavioral",
    badge: "Tiếng Anh",
    detail: "Trao đổi kinh nghiệm dự án và câu hỏi hành vi theo mô hình STAR bằng tiếng Anh.",
    plan: hrPlan,
  },
  {
    value: "technical",
    title: "Technical & Live Coding",
    badge: "Sandbox",
    detail: "Hỏi đáp kiến thức nền tảng kết hợp giải bài trực tiếp và chấm độc lập mã với lập luận.",
    plan: techPlan,
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
  const [useCv, setUseCv] = useState(true);
  const [microphone, setMicrophone] = useState({ status: "idle", mode: null, message: "" });
  const [audioStatus, setAudioStatus] = useState("idle");
  const timerRef = useRef(null);

  const microphoneReady = microphone.status === "ready";
  const activeSession = sessionTypes.find(({ value }) => value === sessionType) ?? sessionTypes[1];

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  async function checkMicrophone() {
    setMicrophone({ status: "checking", mode: null, message: "" });
    const startedAt = Date.now();

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      const wait = Math.max(0, 350 - (Date.now() - startedAt));
      timerRef.current = window.setTimeout(() => {
        setMicrophone({
          status: "error",
          mode: "unavailable",
          message:
            "Trình duyệt không cung cấp thiết bị thu âm (E2). Hãy cấp quyền micro trên thanh địa chỉ hoặc bật chế độ giả lập bên dưới để tiếp tục kiểm thử.",
        });
      }, wait);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      const wait = Math.max(0, 350 - (Date.now() - startedAt));
      timerRef.current = window.setTimeout(() => {
        setMicrophone({ status: "ready", mode: "hardware", message: "" });
      }, wait);
    } catch {
      const wait = Math.max(0, 350 - (Date.now() - startedAt));
      timerRef.current = window.setTimeout(() => {
        setMicrophone({
          status: "error",
          mode: "denied",
          message:
            "Quyền truy cập micro bị từ chối hoặc chưa gắn thiết bị thu âm (E2). Mở cài đặt quyền của trình duyệt rồi thử lại, hoặc chọn giả lập để kiểm thử.",
        });
      }, wait);
    }
  }

  function simulateMicrophoneReady() {
    window.clearTimeout(timerRef.current);
    setMicrophone({ status: "ready", mode: "demo", message: "" });
  }

  function triggerDemoMicError() {
    window.clearTimeout(timerRef.current);
    setMicrophone({
      status: "error",
      mode: "demo-error",
      message:
        "Quyền truy cập micro bị từ chối (mô phỏng kịch bản E2). Hãy cấp quyền micro trong trình duyệt hoặc chọn Giả lập micro sẵn sàng.",
    });
  }

  function playTestSound() {
    setAudioStatus("playing");
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.setValueAtTime(880, now + 0.11);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.07, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
        osc.onended = () => {
          ctx.close().catch(() => {});
        };
      }
    } catch {
      // Fallback silently if headless browser blocks Web Audio API
    }

    timerRef.current = window.setTimeout(() => {
      setAudioStatus("played");
    }, 340);
  }

  return (
    <div className="col stack-lg setup-screen">
      <PageHeader
        eyebrow="Phỏng vấn mô phỏng"
        title="Cấu hình phiên phỏng vấn"
        subtitle="Chọn loại phiên, thời lượng hard-stop và xác nhận thiết bị âm thanh trước khi vào phòng."
        actions={<RuleTag code="NFR01">Độ trễ AI ≤ 2,5s</RuleTag>}
      />

      <div className="grid setup-layout">
        <div className="col setup-options">
          <Card className="setup-card">
            <CardHead title="Loại phiên" />

            <div className="grid setup-types" role="radiogroup" aria-label="Loại phiên">
              {sessionTypes.map(({ value, title, badge, detail }) => {
                const checked = sessionType === value;
                return (
                  <label className="setup-type" key={value}>
                    <input
                      className="sr-only"
                      type="radio"
                      name="setup-session-type"
                      value={value}
                      checked={checked}
                      onChange={() => setSessionType(value)}
                    />
                    <span className="col stack-sm setup-type-card">
                      <span className="row between">
                        <Badge tone={checked ? "brand" : "neutral"} dot>{badge}</Badge>
                        <span className="setup-radio-mark" aria-hidden="true" />
                      </span>
                      <span className="t-heading-s">{title}</span>
                      <span className="t-body-s c-ink2">{detail}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            <p className="t-body-s c-ink2 setup-agenda-line">
              Trình tự dự kiến: {activeSession.plan.join(" → ")}.
            </p>
          </Card>

          <Card className="setup-card" aria-label="Thời lượng, độ khó và ngữ cảnh">
            <div className="grid setup-segments">
              <div className="col stack-sm" onKeyDown={handleSegmentKeys}>
                <CardHead title="Thời lượng" />
                <Segmented
                  label="Thời lượng"
                  options={durations}
                  value={duration}
                  onChange={setDuration}
                />
              </div>
              <div className="col stack-sm" onKeyDown={handleSegmentKeys}>
                <CardHead title="Độ khó" />
                <Segmented
                  label="Độ khó"
                  options={difficulties}
                  value={difficulty}
                  onChange={setDifficulty}
                />
              </div>
            </div>

            <div className="col stack-sm setup-context-wrap">
              <div className="row between setup-context">
                <div className="col" style={{ gap: "2px" }}>
                  <span className="t-body-s t-strong">{contextLabel}</span>
                  <span className="t-body-s c-ink2">
                    {useCv
                      ? `Đang dùng CV ${currentUser.name} và JD ${currentUser.role} (${currentUser.targetCompany}).`
                      : "Phiên phỏng vấn chỉ dùng ngân hàng câu hỏi chuẩn theo vai trò."}
                  </span>
                </div>
                <Toggle label={contextLabel} checked={useCv} onChange={setUseCv} />
              </div>

              {useCv && (
                <div className="row wrap stack-sm">
                  <RuleTag code="NFR04">Mã hóa khi lưu</RuleTag>
                  <span className="t-body-s c-ink2">
                    Câu hỏi sinh riêng từ CV/JD không tự động đưa vào kho dùng chung (BR4).
                  </span>
                </div>
              )}
            </div>
          </Card>

          <Card className="setup-card">
            <CardHead title="Kiểm tra thiết bị">
              <div className="setup-microphone-status" role="status">
                {microphoneReady ? (
                  <Badge tone="success" dot>
                    Hoạt động{microphone.mode === "demo" ? " (demo)" : ""}
                  </Badge>
                ) : microphone.status === "error" ? (
                  <Badge tone="danger" dot>Chưa cấp quyền</Badge>
                ) : (
                  <Badge tone="neutral" dot>Chưa kiểm tra</Badge>
                )}
              </div>
            </CardHead>

            <div className="row wrap setup-device-actions">
              <Button
                variant="secondary"
                onClick={checkMicrophone}
                disabled={microphone.status === "checking"}
              >
                {microphone.status === "checking" && <span className="spinner" aria-hidden="true" />}
                {microphone.status === "checking" ? "Đang kiểm tra micro…" : "Kiểm tra micro"}
              </Button>

              <Button
                variant="secondary"
                onClick={playTestSound}
                disabled={audioStatus === "playing"}
              >
                {audioStatus === "playing" ? "Đang phát âm thanh…" : "Phát âm thanh thử"}
              </Button>

              {!microphoneReady ? (
                <Button variant="ghost" onClick={simulateMicrophoneReady}>
                  Giả lập micro sẵn sàng (demo)
                </Button>
              ) : (
                <Button variant="ghost" onClick={triggerDemoMicError}>
                  Thử lỗi quyền micro (E2)
                </Button>
              )}
            </div>

            {microphoneReady && (
              <p className="t-body-s c-success" role="status">
                Micro đã xác nhận hoạt động — luồng thu thử đã được ngắt ngay sau khi kiểm tra.
              </p>
            )}

            {microphone.status === "error" && (
              <div role="alert" className="col stack-sm">
                <Callout tone="danger" title="Không thể truy cập micro (E2)">
                  <p>{microphone.message}</p>
                </Callout>
                <div>
                  <Button variant="secondary" onClick={simulateMicrophoneReady}>
                    Giả lập micro sẵn sàng (demo)
                  </Button>
                </div>
              </div>
            )}

            {audioStatus === "played" && (
              <p className="t-body-s c-ink2" role="status">
                Đã phát âm thanh thử (660 Hz → 880 Hz).
              </p>
            )}
          </Card>
        </div>

        <Card className="setup-summary">
          <CardHead title="Tóm tắt phiên">
            <Badge tone={microphoneReady ? "success" : "warning"} dot>
              {microphoneReady ? "Sẵn sàng" : "Chờ micro"}
            </Badge>
          </CardHead>

          <dl className="setup-details">
            <div className="kv">
              <dt>Loại phiên</dt>
              <dd>{activeSession.title}</dd>
            </div>
            <div className="kv">
              <dt>Thời lượng</dt>
              <dd className="setup-tabular">{duration} phút ({duration}:00)</dd>
            </div>
            <div className="kv">
              <dt>Độ khó</dt>
              <dd>{DIFFICULTY[difficulty].label}</dd>
            </div>
            <div className="kv">
              <dt>Ngữ cảnh CV/JD</dt>
              <dd>{useCv ? "Có" : "Không"}</dd>
            </div>
            <div className="kv">
              <dt>Micro</dt>
              <dd className={microphoneReady ? "c-success" : "c-warning"}>
                {microphoneReady ? "Hoạt động" : "Chưa xác nhận"}
              </dd>
            </div>
          </dl>

          <Callout tone="warning">
            <div className="col stack-sm">
              <span>
                <RuleTag code="BR1">Hard-stop</RuleTag>
              </span>
              <p>
                Phiên tự kết thúc đúng <strong className="t-mono setup-tabular">{duration}:00</strong>, không kéo dài dù câu hỏi hoặc bài code đang dang dở. Hệ thống tự lưu snapshot mã và transcript ngay khi hết giờ.
              </p>
            </div>
          </Callout>

          <div className="col stack-sm">
            <Button
              variant="primary"
              block
              disabled={!microphoneReady}
              aria-describedby={microphoneReady ? undefined : "setup-mic-required"}
              onClick={() =>
                navigate(`/interview/${sessionType}`, {
                  state: { duration, difficulty, useCv },
                })
              }
            >
              Bắt đầu phỏng vấn <span aria-hidden="true">→</span>
            </Button>
            {!microphoneReady && (
              <p className="t-body-s c-ink2 setup-mic-required" id="setup-mic-required">
                Kiểm tra micro thành công để mở khóa nút bắt đầu phiên.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
