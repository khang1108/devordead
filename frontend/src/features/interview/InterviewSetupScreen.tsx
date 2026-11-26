import { useState, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import StudyCalendar from "@shared/components/StudyCalendar";
import {
  Badge,
  Button,
  Callout,
  ErrorBanner,
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

interface TrackOption {
  value: InterviewMode;
  title: string;
  meta: string;
  detail: string;
  plan: readonly string[];
}

const ASSESSMENT_TRACKS: readonly TrackOption[] = [
  {
    value: "hr",
    title: "HR — Behavioral (EN)",
    meta: "Tiếng Anh · STAR Framework · 5 chặng",
    detail:
      "Trao đổi kinh nghiệm dự án và câu hỏi hành vi bằng tiếng Anh theo cấu trúc Situation, Task, Action, Result.",
    plan: HR_INTERVIEW_PLAN,
  },
  {
    value: "technical",
    title: "Technical & Live Coding",
    meta: "Monaco IDE · Docker Sandbox BR3 · Chấm độc lập BR2",
    detail:
      "Hỏi đáp kiến thức nền tảng kết hợp giải bài trực tiếp trong Monaco IDE; chấm độc lập tính đúng của mã và lập luận.",
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

const CONTEXT_LABEL = "Dùng CV/JD làm ngữ cảnh";

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
  const activeTrack =
    ASSESSMENT_TRACKS.find((item) => item.value === sessionType) ?? ASSESSMENT_TRACKS[1]!;

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
      : `Đang dùng hồ sơ mục tiêu ${targetProfile.role} (${targetProfile.level}${targetProfile.targetCompany ? ` · ${targetProfile.targetCompany}` : ""}). Tải thêm CV/JD tại trang Hồ sơ.`
    : "Chỉ dùng ngân hàng câu hỏi chuẩn theo vai trò và độ khó đã chọn.";

  return (
    <div className="setup-screen">
      {/* Calm LeetCode Mock Assessment utility header */}
      <header className="setup-header">
        <div className="setup-header__top">
          <div className="setup-header__copy">
            <h1 className="t-display-l">Phỏng vấn mô phỏng</h1>
            <p className="t-body-s c-ink2">
              Chọn vòng đánh giá, thời lượng hard-stop và kiểm tra thiết bị âm thanh trước khi vào phòng.
            </p>
          </div>
          <RuleTag code="NFR01">Độ trễ AI ≤ 2,5s</RuleTag>
        </div>

        <nav className="setup-quick-links" aria-label="Liên kết nhanh">
          <Link to="/reports" className="setup-quick-link">
            Xem báo cáo trước đây
          </Link>
          <span className="setup-quick-sep" aria-hidden="true">
            |
          </span>
          <Link to="/profile" className="setup-quick-link">
            Hồ sơ &amp; CV/JD
          </Link>
        </nav>
      </header>

      {startError && (
        <ErrorBanner
          title="Chưa thể khởi tạo phiên phỏng vấn từ máy chủ API"
          message={startError}
          onRetry={handleStartInterview}
          retryLabel="Thử khởi tạo lại"
          actions={
            <Button variant="primary" size="sm" onClick={handleOpenLocalStudio}>
              Mở phòng cục bộ (Local Studio)
            </Button>
          }
        />
      )}

      <div className="lc-workspace setup-workspace">
        <div className="lc-workspace__main">
          {/* 2 Flat Assessment Track Cards */}
          <section aria-labelledby="setup-tracks-heading">
            <h2 id="setup-tracks-heading" className="sr-only">
              Chọn vòng phỏng vấn mô phỏng
            </h2>
            <div className="setup-tracks" role="radiogroup" aria-label="Loại vòng phỏng vấn">
              {ASSESSMENT_TRACKS.map((track) => {
                const checked = sessionType === track.value;
                return (
                  <label className="setup-track" key={track.value}>
                    <input
                      className="sr-only"
                      type="radio"
                      name="setup-session-type"
                      value={track.value}
                      checked={checked}
                      onChange={() => setSessionType(track.value)}
                    />
                    <span className="setup-track__card">
                      <span className="setup-track__top">
                        <span className="setup-track__meta">{track.meta}</span>
                        <span className="setup-radio-mark" aria-hidden="true" />
                      </span>

                      <span className="setup-track__title">{track.title}</span>
                      <span className="t-body-s c-ink2 setup-track__detail">{track.detail}</span>

                      <span className="setup-track__stages">
                        {track.plan.join(" → ")}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Unified Pane: Cấu hình phiên + Kiểm tra thiết bị */}
          <section className="lc-pane setup-pane" aria-label="Cấu hình phiên và kiểm tra thiết bị">
            <div className="lc-pane__head">
              <span className="setup-pane__title">Cấu hình phiên &amp; kiểm tra thiết bị</span>
              {microphoneReady ? (
                <Badge tone="success" dot>
                  Micro sẵn sàng
                </Badge>
              ) : microphone.status === "error" ? (
                <Badge tone="danger" dot>
                  Lỗi micro (E2)
                </Badge>
              ) : (
                <Badge tone="neutral" dot>
                  Chưa kiểm tra micro
                </Badge>
              )}
            </div>

            <div className="setup-pane__section">
              <div className="setup-segments">
                <div className="col stack-sm" onKeyDown={handleSegmentKeys}>
                  <span className="field__label">Thời lượng phiên</span>
                  <Segmented
                    label="Thời lượng phiên"
                    options={DURATIONS}
                    value={duration}
                    onChange={setDuration}
                  />
                </div>

                <div className="col stack-sm" onKeyDown={handleSegmentKeys}>
                  <span className="field__label">Độ khó câu hỏi</span>
                  <Segmented
                    label="Độ khó câu hỏi"
                    options={DIFFICULTIES}
                    value={difficulty}
                    onChange={setDifficulty}
                  />
                </div>
              </div>

              <div className="setup-context-block">
                <div className="row between setup-context-row">
                  <div className="col" style={{ gap: "2px", minWidth: 0 }}>
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
            </div>

            <div className="setup-pane__section setup-pane__section--bordered">
              <div className="row between wrap stack-sm">
                <div className="col" style={{ gap: "2px" }}>
                  <h2 className="t-heading-s">Kiểm tra thiết bị</h2>
                  <p className="t-body-s c-ink2">
                    Xác nhận quyền Microphone (Web Audio API) và loa trước khi bắt đầu tính giờ.
                  </p>
                </div>
                <div className="row wrap setup-device-actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void checkMicrophone()}
                    disabled={microphone.status === "checking"}
                  >
                    {microphone.status === "checking" && (
                      <span className="spinner" aria-hidden="true" />
                    )}
                    {microphone.status === "checking" ? "Đang kiểm tra…" : "Kiểm tra micro"}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void handlePlayTestSound()}
                    disabled={audioStatus === "playing"}
                  >
                    {audioStatus === "playing" ? "Đang phát…" : "Phát âm thanh thử"}
                  </Button>
                </div>
              </div>

              {microphoneReady && (
                <p className="t-body-s c-success" role="status">
                  Micro đã xác nhận hoạt động ({microphone.deviceLabel}) — luồng thu thử đã được
                  ngắt ngay sau khi kiểm tra.
                </p>
              )}

              {microphone.status === "error" && (
                <div role="alert">
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
            </div>
          </section>
        </div>

        {/* Sticky 280px Right Rail: Pre-flight Summary + StudyCalendar */}
        <aside className="lc-rail-right" aria-label="Tóm tắt phiên và lịch luyện tập">
          <section className="lc-pane setup-pane setup-summary-pane">
            <div className="lc-pane__head">
              <span className="setup-pane__title">Tóm tắt phiên</span>
              <Badge tone={microphoneReady ? "success" : "warning"} dot>
                {microphoneReady ? "Sẵn sàng" : "Chờ micro"}
              </Badge>
            </div>

            <div className="setup-summary__body">
              <dl className="setup-details">
                <div className="kv">
                  <dt>Vòng</dt>
                  <dd>{activeTrack.title}</dd>
                </div>
                <div className="kv">
                  <dt>Mục tiêu</dt>
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
                  <dd className={`lc-diff lc-diff--${difficulty}`}>
                    {DIFFICULTY_META[difficulty].label}
                  </dd>
                </div>
                <div className="kv">
                  <dt>CV/JD</dt>
                  <dd className="setup-details__ellipsis" title={cvDraft.file?.name || undefined}>
                    {useCv ? (cvDraft.file ? cvDraft.file.name : "Hồ sơ mục tiêu") : "Không dùng"}
                  </dd>
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
                    Phiên tự kết thúc đúng{" "}
                    <strong className="t-mono setup-tabular">{duration}:00</strong> và tự niêm phong
                    snapshot mã, transcript ngay khi hết giờ.
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

                {startError && (
                  <Button variant="secondary" size="sm" block onClick={handleOpenLocalStudio}>
                    Vào phòng cục bộ (Local Studio)
                  </Button>
                )}

                {!microphoneReady && (
                  <p className="t-body-s c-ink2 setup-mic-required" id="setup-mic-required">
                    Kiểm tra micro thành công để mở khóa nút bắt đầu.
                  </p>
                )}
              </div>
            </div>
          </section>

          <StudyCalendar />
        </aside>
      </div>
    </div>
  );
}
