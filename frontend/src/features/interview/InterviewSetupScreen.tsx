import { useState, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHead,
  ErrorBanner,
  PageHeader,
  RuleTag,
  Segmented,
  Toggle,
} from "@shared/ui";
import { DIFFICULTY_META, HR_INTERVIEW_PLAN, TECH_INTERVIEW_PLAN } from "@shared/constants";
import { getErrorMessage } from "@shared/services/apiClient";
import { playTestTone, testMicrophonePermission } from "@shared/services/audioEngine";
import { localStore } from "@shared/services/localStore";
import type { Difficulty, InterviewConfig, InterviewDuration, InterviewMode } from "@shared/types";
import { interviewService } from "./interview.service";
import "./InterviewSetupScreen.css";

interface SessionTypeOption {
  value: InterviewMode;
  title: string;
  badge: string;
  detail: string;
  plan: readonly string[];
}

const SESSION_TYPES: readonly SessionTypeOption[] = [
  {
    value: "hr",
    title: "HR — Behavioral",
    badge: "Tiếng Anh",
    detail: "Trao đổi kinh nghiệm dự án và câu hỏi hành vi theo mô hình STAR bằng tiếng Anh.",
    plan: HR_INTERVIEW_PLAN,
  },
  {
    value: "technical",
    title: "Technical & Live Coding",
    badge: "Sandbox",
    detail: "Hỏi đáp kiến thức nền tảng kết hợp giải bài trực tiếp và chấm độc lập mã với lập luận.",
    plan: TECH_INTERVIEW_PLAN,
  },
];

const DURATIONS: readonly { value: InterviewDuration; label: string }[] = [
  { value: 15, label: "15 phút" },
  { value: 30, label: "30 phút" },
  { value: 45, label: "45 phút" },
];

const DIFFICULTIES: readonly { value: Difficulty; label: string }[] = (
  ["easy", "medium", "hard"] as const
).map((value) => ({ value, label: DIFFICULTY_META[value].label }));

const CONTEXT_LABEL = "Dùng CV/JD đã tải làm ngữ cảnh";

interface MicState {
  status: "idle" | "checking" | "ready" | "error";
  deviceLabel: string;
  message: string;
}

function handleSegmentKeys(event: KeyboardEvent<HTMLDivElement>) {
  const options = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="radio"]'),
  );
  const target = event.target as HTMLButtonElement | null;
  const index = target ? options.indexOf(target) : -1;
  const count = options.length;
  if (index === -1 || count === 0) return;

  const keyMap: Record<string, number> = {
    ArrowLeft: (index - 1 + count) % count,
    ArrowUp: (index - 1 + count) % count,
    ArrowRight: (index + 1) % count,
    ArrowDown: (index + 1) % count,
    Home: 0,
    End: count - 1,
  };
  const nextIndex = keyMap[event.key];
  if (nextIndex === undefined) return;

  event.preventDefault();
  const nextEl = options[nextIndex];
  nextEl?.focus();
  nextEl?.click();
}

export default function InterviewSetupScreen() {
  const navigate = useNavigate();
  const targetProfile = localStore.getTargetProfile();
  const cvDraft = localStore.getCvDraft();

  const [sessionType, setSessionType] = useState<InterviewMode>("technical");
  const [duration, setDuration] = useState<InterviewDuration>(30);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [useCv, setUseCv] = useState<boolean>(Boolean(cvDraft.file || cvDraft.jdText.trim()));
  const [microphone, setMicrophone] = useState<MicState>({
    status: "idle",
    deviceLabel: "",
    message: "",
  });
  const [audioStatus, setAudioStatus] = useState<"idle" | "playing" | "played" | "error">("idle");
  const [audioError, setAudioError] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const microphoneReady = microphone.status === "ready";
  const activeSession =
    SESSION_TYPES.find((item) => item.value === sessionType) ?? SESSION_TYPES[1]!;

  async function checkMicrophone() {
    setMicrophone({ status: "checking", deviceLabel: "", message: "" });
    try {
      const result = await testMicrophonePermission();
      setMicrophone({
        status: "ready",
        deviceLabel: result.deviceLabel,
        message: "",
      });
    } catch (err) {
      const raw = getErrorMessage(
        err,
        "Không thể truy cập thiết bị micro trên trình duyệt hiện tại.",
      );
      setMicrophone({
        status: "error",
        deviceLabel: "",
        message: `${raw} (E2). Hãy cấp quyền Microphone trên thanh địa chỉ trình duyệt (biểu tượng ổ khóa), kiểm tra thiết bị thu âm đã kết nối rồi nhấn “Kiểm tra micro” lại.`,
      });
    }
  }

  async function handlePlayTestSound() {
    setAudioStatus("playing");
    setAudioError("");
    try {
      await playTestTone();
      window.setTimeout(() => {
        setAudioStatus("played");
      }, 420);
    } catch (err) {
      setAudioStatus("error");
      setAudioError(
        getErrorMessage(err, "Không thể phát âm thanh thử qua Web Audio API trên trình duyệt này."),
      );
    }
  }

  async function handleStartInterview() {
    if (!microphoneReady || starting) return;
    const config: InterviewConfig = {
      mode: sessionType,
      duration,
      difficulty,
      useCv,
    };

    setStarting(true);
    setStartError(null);
    try {
      const session = await interviewService.createSession(config);
      navigate(`/interview/${sessionType}`, {
        state: { config, session, offlineStudio: false },
      });
    } catch (err) {
      setStartError(getErrorMessage(err));
    } finally {
      setStarting(false);
    }
  }

  function handleOpenLocalStudio() {
    const config: InterviewConfig = {
      mode: sessionType,
      duration,
      difficulty,
      useCv,
    };
    navigate(`/interview/${sessionType}`, {
      state: { config, session: null, offlineStudio: true },
    });
  }

  const cvContextDescription = useCv
    ? cvDraft.file
      ? `Đang dùng CV ${cvDraft.file.name} cùng mục tiêu ${targetProfile.role} (${targetProfile.level}${targetProfile.targetCompany ? ` · ${targetProfile.targetCompany}` : ""}).`
      : `Đang dùng ngữ cảnh mục tiêu ${targetProfile.role} (${targetProfile.level}${targetProfile.targetCompany ? ` · ${targetProfile.targetCompany}` : ""}). Bạn có thể tải tệp CV tại mục Hồ sơ mục tiêu.`
    : "Phiên phỏng vấn chỉ dùng ngân hàng câu hỏi chuẩn theo vai trò.";

  return (
    <div className="col stack-lg setup-screen">
      <PageHeader
        eyebrow="Phỏng vấn mô phỏng"
        title="Cấu hình phiên phỏng vấn"
        subtitle="Chọn loại phiên, thời lượng hard-stop và xác nhận thiết bị âm thanh trước khi vào phòng."
        actions={<RuleTag code="NFR01">Độ trễ AI ≤ 2,5s</RuleTag>}
      />

      {startError && (
        <ErrorBanner
          title="Chưa thể khởi tạo phiên phỏng vấn từ máy chủ"
          message={startError}
          onRetry={handleStartInterview}
          retryLabel="Thử khởi tạo lại"
          actions={
            <Button variant="primary" size="sm" onClick={handleOpenLocalStudio}>
              Mở phòng cục bộ (kiểm thử thiết bị/IDE)
            </Button>
          }
        />
      )}

      <div className="grid setup-layout">
        <div className="col setup-options">
          <Card className="setup-card">
            <CardHead title="Loại phiên" />

            <div className="grid setup-types" role="radiogroup" aria-label="Loại phiên">
              {SESSION_TYPES.map(({ value, title, badge, detail }) => {
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
                        <Badge tone={checked ? "brand" : "neutral"} dot>
                          {badge}
                        </Badge>
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
                  options={DURATIONS}
                  value={duration}
                  onChange={setDuration}
                />
              </div>
              <div className="col stack-sm" onKeyDown={handleSegmentKeys}>
                <CardHead title="Độ khó" />
                <Segmented
                  label="Độ khó"
                  options={DIFFICULTIES}
                  value={difficulty}
                  onChange={setDifficulty}
                />
              </div>
            </div>

            <div className="col stack-sm setup-context-wrap">
              <div className="row between setup-context">
                <div className="col" style={{ gap: "2px" }}>
                  <span className="t-body-s t-strong">{CONTEXT_LABEL}</span>
                  <span className="t-body-s c-ink2">{cvContextDescription}</span>
                </div>
                <Toggle label={CONTEXT_LABEL} checked={useCv} onChange={setUseCv} />
              </div>

              {useCv && (
                <div className="row wrap stack-sm">
                  <RuleTag code="NFR04">Mã hóa khi lưu</RuleTag>
                  <span className="t-body-s c-ink2">
                    Câu hỏi sinh riêng từ CV/JD không tự động đưa vào kho dùng chung (BR4).{" "}
                    {!cvDraft.file && (
                      <Link to="/profile" className="c-brand">
                        Cập nhật CV/JD →
                      </Link>
                    )}
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
                    Hoạt động
                  </Badge>
                ) : microphone.status === "error" ? (
                  <Badge tone="danger" dot>
                    Chưa cấp quyền
                  </Badge>
                ) : (
                  <Badge tone="neutral" dot>
                    Chưa kiểm tra
                  </Badge>
                )}
              </div>
            </CardHead>

            <div className="row wrap setup-device-actions">
              <Button
                variant="secondary"
                onClick={() => void checkMicrophone()}
                disabled={microphone.status === "checking"}
              >
                {microphone.status === "checking" && <span className="spinner" aria-hidden="true" />}
                {microphone.status === "checking" ? "Đang kiểm tra micro…" : "Kiểm tra micro"}
              </Button>

              <Button
                variant="secondary"
                onClick={() => void handlePlayTestSound()}
                disabled={audioStatus === "playing"}
              >
                {audioStatus === "playing" ? "Đang phát âm thanh…" : "Phát âm thanh thử"}
              </Button>
            </div>

            {microphoneReady && (
              <p className="t-body-s c-success" role="status">
                Micro đã xác nhận hoạt động ({microphone.deviceLabel}) — luồng thu thử đã được ngắt ngay sau khi kiểm tra.
              </p>
            )}

            {microphone.status === "error" && (
              <div role="alert" className="col stack-sm">
                <Callout tone="danger" title="Không thể truy cập micro (E2)">
                  <p>{microphone.message}</p>
                </Callout>
              </div>
            )}

            {audioStatus === "played" && (
              <p className="t-body-s c-ink2" role="status">
                Đã phát âm báo thử qua loa (C5 → E5 · Web Audio API).
              </p>
            )}

            {audioStatus === "error" && audioError && (
              <p className="t-body-s c-accent" role="alert">
                {audioError}
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
              <dt>Vai trò mục tiêu</dt>
              <dd>
                {targetProfile.role} · {targetProfile.level}
              </dd>
            </div>
            <div className="kv">
              <dt>Thời lượng</dt>
              <dd className="setup-tabular">
                {duration} phút ({duration}:00)
              </dd>
            </div>
            <div className="kv">
              <dt>Độ khó</dt>
              <dd>{DIFFICULTY_META[difficulty].label}</dd>
            </div>
            <div className="kv">
              <dt>Ngữ cảnh CV/JD</dt>
              <dd>{useCv ? (cvDraft.file ? cvDraft.file.name : "Hồ sơ mục tiêu") : "Không"}</dd>
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
                Phiên tự kết thúc đúng <strong className="t-mono setup-tabular">{duration}:00</strong>,
                không kéo dài dù câu hỏi hoặc bài code đang dang dở. Hệ thống tự lưu snapshot mã và
                transcript ngay khi hết giờ.
              </p>
            </div>
          </Callout>

          <div className="col stack-sm">
            <Button
              variant="primary"
              block
              disabled={!microphoneReady || starting}
              aria-describedby={microphoneReady ? undefined : "setup-mic-required"}
              onClick={() => void handleStartInterview()}
            >
              {starting && <span className="spinner" aria-hidden="true" />}
              {starting ? "Đang khởi tạo phiên…" : "Bắt đầu phỏng vấn"}
              {!starting && <span aria-hidden="true">→</span>}
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
