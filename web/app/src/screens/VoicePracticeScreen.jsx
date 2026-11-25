import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Callout, Card, CardHead, PageHeader, ProgressBar, RuleTag } from "../components/ui.jsx";
import { AiAvatar } from "../components/Room.jsx";
import Waveform from "../components/Waveform.jsx";
import { voiceSession } from "../data/mock.js";
import "./VoicePracticeScreen.css";

// Dữ liệu phản hồi chi tiết cho đủ 5 câu hỏi của topic Indexing (câu 2 dùng nguyên bản từ mock.js)
const QUESTION_PACKS = [
  {
    transcript:
      "B-Tree trong PostgreSQL là cây cân bằng nhiều nhánh, các trang lá liên kết đôi và lưu ctid trỏ tới heap tuple nên tìm kiếm theo khóa hoặc khoảng chỉ mất O(log n) lần đọc trang.",
    feedback: {
      score: 8,
      latency: "1,28s",
      correct: [
        "Nêu đúng cấu trúc cây cân bằng đa nhánh và độ phức tạp O(log n)",
        "Giải thích chính xác vai trò ctid và danh sách liên kết ở tầng lá cho range scan",
      ],
      missing: ["Chưa đề cập kích thước trang 8 KB mặc định giúp giảm chiều cao cây (thường chỉ 3–4 tầng)"],
      followUp: "Vì sao Index-Only Scan đôi khi vẫn phải đọc Visibility Map của bảng heap?",
    },
  },
  {
    transcript: voiceSession.sampleTranscript,
    feedback: {
      ...voiceSession.sampleFeedback,
      latency: "1,42s",
    },
  },
  {
    transcript:
      "Composite index (a, b) sắp xếp theo cột a trước rồi mới tới b, nên nếu truy vấn chỉ lọc theo b thì PostgreSQL khó đi thẳng từ gốc mà thường phải quét rộng hơn hoặc chọn Seq Scan.",
    feedback: {
      score: 7.5,
      latency: "1,35s",
      correct: [
        "Hiểu đúng nguyên tắc thứ tự tiền tố (leftmost prefix) của composite index (a, b)",
        "Nhận diện được planner thường chuyển sang Seq Scan khi thiếu điều kiện trên cột dẫn đầu",
      ],
      missing: ["Có thể nêu thêm trường hợp Bitmap Index Scan hoặc tạo thêm index đơn trên cột b nếu truy vấn tần suất cao"],
      followUp: "Nếu truy vấn có dạng WHERE a = 10 ORDER BY b DESC LIMIT 20 thì index (a, b) giúp tối ưu bước nào?",
    },
  },
  {
    transcript:
      "Mình nhìn vào EXPLAIN ANALYZE từ nút trong ra ngoài, so sánh estimated rows với actual rows và xem actual time cũng như số trang Buffers shared read/hit ở từng bước.",
    feedback: {
      score: 8.5,
      latency: "1,19s",
      correct: [
        "So sánh estimated rows và actual rows để phát hiện sai lệch thống kê",
        "Theo dõi actual time cùng chỉ số Buffers shared hit/read rất sát thực tế vận hành",
      ],
      missing: ["Cần chú ý trường loops (nhân với actual time) trong Nested Loop để không đọc nhầm chi phí thật"],
      followUp: "Khi thấy Rows Removed by Filter rất lớn trên một nút Index Scan, bạn sẽ tối ưu index như thế nào?",
    },
  },
  {
    transcript:
      "Thêm quá nhiều index sẽ làm chậm các lệnh INSERT, UPDATE, DELETE vì mỗi lần ghi dữ liệu phải cập nhật thêm các cây index và tốn thêm bộ nhớ đệm trong shared_buffers.",
    feedback: {
      score: 7.5,
      latency: "1,31s",
      correct: [
        "Phân tích đúng chi phí write amplification trên INSERT/UPDATE/DELETE",
        "Liên hệ được việc tranh chấp vùng nhớ cache (shared_buffers) khi index phình to",
      ],
      missing: ["Trong PostgreSQL, UPDATE cột được đánh index còn làm mất tối ưu HOT (Heap-Only Tuple) update"],
      followUp: "Làm sao để kiểm tra những index nào trong production gần như không bao giờ được dùng?",
    },
  },
];

function formatSeconds(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function SpeakerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="3 6 6.5 6 10.5 2.5 10.5 13.5 6.5 10 3 10" />
      <path d="M13 5.5a3.5 3.5 0 0 1 0 5" />
    </svg>
  );
}

// UC05 Luyện kiến thức bằng giọng nói + UC06 Đánh giá & phản hồi tức thì — CHỈ UI.
export default function VoicePracticeScreen() {
  const { questions, topicName } = voiceSession;
  const [index, setIndex] = useState(1);
  const [phase, setPhase] = useState("ready"); // ready | recording | evaluating | feedback
  const [followUp, setFollowUp] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [completed, setCompleted] = useState(() => new Set([0]));
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const pack = QUESTION_PACKS[index] || QUESTION_PACKS[1];
  const fb = pack.feedback;
  const currentQuestion = followUp ? fb.followUp : questions[index];

  const transcriptText = followUp
    ? "Mình tạo expression index trực tiếp trên biểu thức hàm: CREATE INDEX idx_users_lower_email ON users (lower(email)); khi đó planner khớp đúng biểu thức trong mệnh đề WHERE."
    : pack.transcript;

  useEffect(() => {
    if (phase !== "recording") return undefined;
    const id = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (!ttsPlaying) return undefined;
    const id = setTimeout(() => setTtsPlaying(false), 2400);
    return () => clearTimeout(id);
  }, [ttsPlaying]);

  useEffect(() => {
    if (phase !== "evaluating") return undefined;
    const id = setTimeout(() => {
      setPhase("feedback");
      setCompleted((prev) => new Set(prev).add(index));
    }, 850);
    return () => clearTimeout(id);
  }, [phase, index]);

  const startRecording = () => {
    setTtsPlaying(false);
    setElapsedSec(0);
    setPhase("recording");
  };

  const stopAndEvaluate = () => {
    if (elapsedSec === 0) setElapsedSec(38);
    setPhase("evaluating");
  };

  const selectQuestion = (nextIdx) => {
    setIndex(nextIdx);
    setFollowUp(false);
    setElapsedSec(0);
    setPhase("ready");
  };

  const nextQuestion = () => {
    const nextIdx = Math.min(questions.length - 1, index + 1);
    selectQuestion(nextIdx);
  };

  const interimWords = transcriptText.slice(0, Math.min(transcriptText.length, 48 + elapsedSec * 14));

  return (
    <div className="voice">
      <PageHeader
        eyebrow="Luyện giọng nói · UC05, UC06"
        title={topicName}
        subtitle="Nghe câu hỏi mở, trả lời theo lượt qua micro và nhận phân tích rubric tức thì kèm câu hỏi đào sâu."
        actions={
          <div className="row wrap stack-sm">
            <RuleTag code="BR4">Ngân hàng đã duyệt</RuleTag>
            <Link to="/knowledge" className="btn btn--secondary btn--sm">
              Đổi chủ đề
            </Link>
          </div>
        }
      />

      {/* Dải 1–5 câu hỏi gọn trên 1 thanh viền mảnh 1px duy nhất */}
      <ol className="voice__stepper" aria-label="Tiến độ 5 câu hỏi">
        {questions.map((q, i) => {
          const isDone = completed.has(i) && i !== index;
          const isCurrent = i === index;
          return (
            <li key={q} className="voice__stepper-cell">
              <button
                type="button"
                onClick={() => selectQuestion(i)}
                aria-current={isCurrent ? "step" : undefined}
                className={`voice__step ${isDone ? "is-done" : isCurrent ? "is-current" : ""}`}
              >
                <span className="voice__step-dot" aria-hidden="true">
                  {isDone ? "✓" : i + 1}
                </span>
                <span className="voice__step-label">
                  Câu {i + 1}
                  <span className="voice__step-sub">
                    {isDone ? " · Đã xong" : isCurrent ? (followUp ? " · Đào sâu" : " · Đang mở") : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="voice__grid">
        <div className="col voice__left">
          {/* Câu hỏi + Quả cầu Matte-Pearl AI trên nền sáng */}
          <Card className="voice__question">
            <div className="voice__stage-row">
              <div className="voice__orb-wrap">
                <AiAvatar
                  size={92}
                  speaking={ttsPlaying}
                  listening={phase === "recording"}
                  thinking={phase === "evaluating"}
                />
                <span className="voice__orb-caption">
                  {ttsPlaying
                    ? "Đang đọc TTS"
                    : phase === "recording"
                      ? "Đang lắng nghe"
                      : phase === "evaluating"
                        ? "Đang chấm..."
                        : "AI sẵn sàng"}
                </span>
              </div>

              <div className="col grow voice__prompt">
                <div className="row between wrap stack-sm">
                  <div className="row wrap stack-sm">
                    <Badge tone={followUp ? "warning" : "brand"} dot>
                      {followUp ? "Câu hỏi đào sâu" : `Câu ${index + 1} / ${questions.length}`}
                    </Badge>
                    <span className="t-body-s c-ink2">Có phụ đề TTS (NFR08)</span>
                    {skipped > 0 && <span className="t-body-s c-ink2">· Đã bỏ qua {skipped}</span>}
                  </div>
                </div>

                <h2 className="t-heading-m voice__q-text" aria-live="polite">
                  {currentQuestion}
                </h2>

                <div className="row wrap stack-sm">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setTtsPlaying((v) => !v)}
                    aria-pressed={ttsPlaying}
                  >
                    <SpeakerIcon />
                    {ttsPlaying ? "Đang phát câu hỏi..." : "Nghe câu hỏi (TTS)"}
                  </Button>
                  {!followUp && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSkipped((s) => s + 1);
                        nextQuestion();
                      }}
                    >
                      Bỏ qua câu này
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Bàn thu âm Studio nền sáng (#FFFFFF + giếng sóng #F6F7F8 viền mảnh 1px) */}
          <Card className="voice__recorder">
            <div className="row between wrap">
              <div className="row stack-sm">
                <span
                  className={`voice__status-dot ${
                    phase === "recording" ? "is-rec" : phase === "feedback" ? "is-done" : ""
                  }`}
                  aria-hidden="true"
                />
                <p className="t-heading-s">
                  {phase === "recording"
                    ? "Đang thu âm lượt trả lời"
                    : phase === "evaluating"
                      ? "Đang nhận dạng STT & phân tích rubric..."
                      : phase === "feedback"
                        ? `Đã chấm xong · Phản hồi ${fb.latency}`
                        : "Thu âm theo lượt (Turn-based)"}
                </p>
              </div>
              <p className="t-mono voice__timer">
                {phase === "ready" ? "00:00" : formatSeconds(elapsedSec || 42)}
              </p>
            </div>

            <div className="voice__wave-well">
              <Waveform
                active={phase === "recording"}
                height={52}
                color="var(--ink)"
                idleColor="rgba(17, 20, 24, 0.14)"
                latencyLabel="Phản hồi ≤ 2,5s"
              />
            </div>

            <div className="row between wrap">
              <div className="row wrap stack-sm">
                {phase === "ready" && (
                  <>
                    <Button variant="primary" onClick={startRecording}>
                      <span className="voice__rec-dot" aria-hidden="true" />
                      Bắt đầu ghi âm
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setElapsedSec(42);
                        setPhase("evaluating");
                      }}
                    >
                      Chấm thử bản trả lời mẫu
                    </Button>
                  </>
                )}
                {phase === "recording" && (
                  <>
                    <Button variant="primary" onClick={stopAndEvaluate}>
                      Dừng &amp; gửi câu trả lời
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setElapsedSec(0);
                        setPhase("ready");
                      }}
                    >
                      Hủy &amp; ghi lại (A1)
                    </Button>
                  </>
                )}
                {phase === "evaluating" && (
                  <Button variant="secondary" disabled>
                    <span className="spinner" aria-hidden="true" /> Đang đánh giá câu trả lời...
                  </Button>
                )}
                {phase === "feedback" && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setElapsedSec(0);
                      setPhase("ready");
                    }}
                  >
                    Trả lời lại câu này
                  </Button>
                )}
              </div>

              <span className="t-body-s c-ink2">HTTPS/WSS mã hóa (NFR03)</span>
            </div>
          </Card>

          {/* Bản ghi giọng nói (STT) */}
          <Card className="voice__transcript">
            <CardHead title="Bản ghi giọng nói (STT)">
              {phase === "feedback" ? (
                <Badge tone="success" dot>
                  Độ tin cậy 98%
                </Badge>
              ) : phase === "recording" ? (
                <Badge tone="brand" dot>
                  Đang nhận dạng
                </Badge>
              ) : (
                <Badge tone="neutral">Chờ ghi âm</Badge>
              )}
            </CardHead>

            {phase === "ready" && (
              <p className="t-body-m c-ink2">
                Bấm <strong>Bắt đầu ghi âm</strong> để trả lời bằng lời. Hệ thống chuyển giọng nói thành văn bản và đối chiếu với đáp án tham chiếu của chủ đề.
              </p>
            )}
            {phase === "recording" && (
              <p className="t-body-m voice__interim">
                “{interimWords}…”
                <span className="voice__caret" aria-hidden="true" />
              </p>
            )}
            {phase === "evaluating" && (
              <p className="t-body-m c-ink2">“{transcriptText}” — đang đối chiếu với tiêu chí kỹ thuật...</p>
            )}
            {phase === "feedback" && <p className="t-body-m voice__final-transcript">“{transcriptText}”</p>}
          </Card>
        </div>

        {/* Cột phải: Đánh giá & phản hồi tức thì (UC06 — phẳng, phân tách bằng đường 1px) */}
        <Card as="aside" className="voice__feedback" aria-label="Đánh giá & phản hồi" aria-live="polite">
          <CardHead title="Đánh giá & phản hồi (UC06)">
            {phase === "feedback" && <Badge tone="success" dot>{fb.latency} ≤ 2,5s</Badge>}
          </CardHead>

          {phase !== "feedback" ? (
            <div className="empty voice__empty">
              {phase === "evaluating" || phase === "recording" ? <span className="spinner" aria-hidden="true" /> : null}
              <p className="t-heading-s">
                {phase === "evaluating"
                  ? "Đang phân tích điểm đúng & điểm thiếu..."
                  : phase === "recording"
                    ? "Đang ghi nhận câu trả lời..."
                    : "Chưa có dữ liệu đánh giá"}
              </p>
              <p className="t-body-s c-ink2">
                Sau mỗi lượt trả lời, hệ thống chỉ rõ ý đúng (✓), phần còn thiếu (!) và đặt câu hỏi đào sâu để rèn phản xạ phỏng vấn.
              </p>
            </div>
          ) : (
            <div className="col voice__fb-body">
              <div className="voice__score-row">
                <div className="row between">
                  <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
                    <p className="t-number">{fb.score}/10</p>
                    <p className="t-body-s c-ink2">độ chính xác kỹ thuật</p>
                  </div>
                  <span className="t-body-s c-success t-strong">+1,0 so với phiên trước</span>
                </div>
                <ProgressBar value={fb.score / 10} tone="success" label="Điểm độ chính xác kỹ thuật" />
              </div>

              <FeedbackGroup
                tone="success"
                marker="✓"
                title="Điểm đúng về kỹ thuật"
                items={
                  followUp
                    ? [
                        "Dùng đúng cú pháp expression index trên lower(email)",
                        "Giải thích được điều kiện khớp biểu thức trong WHERE để planner chọn Index Scan",
                      ]
                    : fb.correct
                }
              />

              <FeedbackGroup
                tone="warning"
                marker="!"
                title="Cần bổ sung"
                items={
                  followUp
                    ? ["Có thể cân nhắc thêm kiểu citext hoặc chuẩn hóa dữ liệu ngay lúc ghi để giảm chi phí tính hàm"]
                    : fb.missing
                }
              />

              <div className="voice__followup-section">
                {!followUp ? (
                  <Callout tone="brand" title="Câu hỏi đào sâu (Follow-up)">
                    <p className="t-body-s t-strong" style={{ color: "var(--ink)" }}>
                      {fb.followUp}
                    </p>
                  </Callout>
                ) : (
                  <Callout tone="success" title="Đã hoàn thành câu đào sâu">
                    Bằng chứng của lượt chính và lượt đào sâu đã được lưu vào hồ sơ năng lực.
                  </Callout>
                )}
              </div>

              <div className="col stack-sm voice__actions">
                {!followUp && (
                  <Button
                    variant="primary"
                    block
                    onClick={() => {
                      setFollowUp(true);
                      setElapsedSec(0);
                      setPhase("ready");
                      setTtsPlaying(true);
                    }}
                  >
                    Trả lời câu đào sâu
                  </Button>
                )}
                <Button
                  variant="secondary"
                  block
                  onClick={nextQuestion}
                  disabled={index === questions.length - 1 && !followUp}
                >
                  {index < questions.length - 1 ? `Sang câu ${index + 2} / ${questions.length}` : "Đã ở câu cuối"}
                </Button>
              </div>
            </div>
          )}

          <div className="row wrap stack-sm voice__rules">
            <RuleTag code="NFR01">Phản hồi ≤ 2,5s</RuleTag>
            <RuleTag code="BR4">Câu đào sâu chỉ dùng tạm</RuleTag>
          </div>
        </Card>
      </div>
    </div>
  );
}

function FeedbackGroup({ tone, marker, title, items }) {
  return (
    <div className="voice__rubric-section">
      <p className="voice__rubric-heading">{title}</p>
      <ul className={`voice__rubric voice__rubric--${tone}`}>
        {items.map((it) => (
          <li key={it} className="voice__rubric-item">
            <span className="voice__rubric-mark" aria-hidden="true">
              {marker}
            </span>
            <span className="t-body-s" style={{ color: "var(--ink)" }}>
              {it}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
