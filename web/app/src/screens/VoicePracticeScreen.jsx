import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, CardHead, PageHeader, RuleTag, Callout } from "../components/ui.jsx";
import Waveform from "../components/Waveform.jsx";
import { voiceSession } from "../data/mock.js";
import "./VoicePracticeScreen.css";

// UC05 Luyện kiến thức bằng giọng nói + UC06 Đánh giá & phản hồi tức thì — CHỈ UI.
// phase: ready (chờ ghi âm) → recording (đang ghi) → feedback (transcript + phản hồi)
export default function VoicePracticeScreen() {
  const { questions, topicName, sampleTranscript, sampleFeedback: fb } = voiceSession;
  const [index, setIndex] = useState(1);
  const [phase, setPhase] = useState("ready");
  const [followUp, setFollowUp] = useState(false);
  const [skipped, setSkipped] = useState(0);

  const question = followUp ? fb.followUp : questions[index];
  const next = () => {
    setIndex((i) => Math.min(questions.length - 1, i + 1));
    setFollowUp(false);
    setPhase("ready");
  };

  return (
    <div className="voice">
      <PageHeader
        eyebrow="03 — LUYỆN GIỌNG NÓI"
        title={topicName}
        subtitle="Nghe câu hỏi, trả lời qua micro theo lượt. Transcript và phản hồi hiện ngay sau mỗi câu trả lời."
        actions={
          <Link to="/knowledge" className="btn btn--secondary">
            Đổi topic
          </Link>
        }
      />

      <ol className="voice__steps" aria-label="Tiến độ buổi luyện">
        {questions.map((q, i) => (
          <li key={q} className={`voice__step ${i < index ? "is-done" : i === index ? "is-current" : ""}`}>
            <span className="voice__step-dot" aria-hidden="true">
              {i < index ? "✓" : i + 1}
            </span>
            <span className="t-body-s">{i < index ? "Đã trả lời" : i === index ? "Đang luyện" : `Câu ${i + 1}`}</span>
          </li>
        ))}
      </ol>

      <div className="voice__grid">
        <div className="col stack-lg voice__left">
          <Card className="voice__question">
            <div className="row between">
              <p className="t-mono c-ink2">
                {followUp ? "CÂU HỎI ĐÀO SÂU" : `CÂU ${index + 1} / ${questions.length}`}
                {skipped > 0 && ` · đã bỏ qua ${skipped}`}
              </p>
              <Badge tone="brand" dot>
                TTS · có phụ đề
              </Badge>
            </div>
            <p className="t-heading-m" aria-live="polite">
              {question}
            </p>
            <div className="row">
              <Button variant="secondary" size="sm">
                ▶ Nghe lại
              </Button>
              {!followUp && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSkipped((s) => s + 1);
                    next();
                  }}
                >
                  Bỏ qua câu này
                </Button>
              )}
            </div>
          </Card>

          <Card variant="dark" className="voice__recorder">
            <div className="row between">
              <div className="row stack-sm">
                {phase === "recording" ? <span className="pulse-dot" aria-hidden="true" /> : <span className="voice__dot-idle" aria-hidden="true" />}
                <p className="t-mono">{phase === "recording" ? "Đang ghi âm" : phase === "feedback" ? "Đã gửi câu trả lời" : "Sẵn sàng ghi âm"}</p>
              </div>
              <p className="t-number">{phase === "ready" ? "00:00" : "00:42"}</p>
            </div>
            <Waveform active={phase === "recording"} color="var(--brand)" idleColor="#3C5A6E" />
            <div className="row">
              {phase === "ready" && (
                <Button variant="accent" onClick={() => setPhase("recording")}>
                  ● Bắt đầu ghi âm
                </Button>
              )}
              {phase === "recording" && (
                <>
                  <Button variant="accent" onClick={() => setPhase("feedback")}>
                    Dừng &amp; gửi câu trả lời
                  </Button>
                  <Button variant="secondary" onDark onClick={() => setPhase("ready")}>
                    Ghi lại
                  </Button>
                </>
              )}
              {phase === "feedback" && (
                <Button variant="secondary" onDark onClick={() => setPhase("ready")}>
                  Trả lời lại câu này
                </Button>
              )}
            </div>
            <p className="t-body-s voice__mic-note">Micro: Built-in Microphone · cần cấp quyền micro cho trình duyệt.</p>
          </Card>

          <Card className="voice__transcript">
            <CardHead title="Transcript (STT)">{phase === "feedback" && <Badge tone="success">Độ tin cậy cao</Badge>}</CardHead>
            {phase === "ready" && <p className="c-ink2">Transcript sẽ hiện ở đây khi bạn bắt đầu nói.</p>}
            {phase === "recording" && (
              <p className="voice__interim">
                Khi điều kiện lọc trả về quá nhiều dòng thì planner thấy quét tuần tự rẻ hơn<span className="voice__caret" aria-hidden="true" />
              </p>
            )}
            {phase === "feedback" && <p>“{sampleTranscript}”</p>}
          </Card>
        </div>

        <Card as="aside" className="voice__feedback" aria-label="Phản hồi tức thì">
          <CardHead title="Phản hồi tức thì" />
          {phase !== "feedback" ? (
            <div className="empty voice__empty">
              {phase === "recording" ? <span className="spinner" aria-hidden="true" /> : null}
              <p>{phase === "recording" ? "Đang nghe… phản hồi sẽ có trong vài giây sau khi bạn dừng." : "Trả lời câu hỏi để nhận phản hồi về điểm đúng, điểm thiếu và câu hỏi đào sâu."}</p>
            </div>
          ) : (
            <>
              <div className="voice__score">
                <div className="row start" style={{ alignItems: "baseline", gap: 10 }}>
                  <p className="t-number">{fb.score}/10</p>
                  <p className="t-body-s c-ink2">độ chính xác kỹ thuật</p>
                </div>
                <p className="t-body-s c-success t-strong">▲ +1 so với lần luyện topic này trước đó — bạn đang tiến bộ!</p>
              </div>
              <FeedbackGroup tone="success" title="Đúng" items={fb.correct} />
              <FeedbackGroup tone="warning" title="Còn thiếu" items={fb.missing} />
              {!followUp ? (
                <Callout tone="brand" title="Câu hỏi đào sâu">
                  <p className="t-strong">{fb.followUp}</p>
                </Callout>
              ) : (
                <Callout tone="success" title="Đã trả lời câu đào sâu">
                  Lượt này đã được lưu vào hồ sơ năng lực.
                </Callout>
              )}
              <div className="col stack-sm voice__actions">
                {!followUp && (
                  <Button
                    variant="primary"
                    block
                    onClick={() => {
                      setFollowUp(true);
                      setPhase("ready");
                    }}
                  >
                    Trả lời câu đào sâu
                  </Button>
                )}
                <Button variant="secondary" block onClick={next} disabled={index === questions.length - 1 && !followUp}>
                  Câu tiếp theo →
                </Button>
              </div>
            </>
          )}
          <div className="row wrap stack-sm voice__rules">
            <RuleTag code="NFR01">Phản hồi ≤ 2,5 giây</RuleTag>
            <RuleTag code="BR4">Câu đào sâu chỉ dùng tạm</RuleTag>
          </div>
        </Card>
      </div>
    </div>
  );
}

function FeedbackGroup({ tone, title, items }) {
  return (
    <div className="col stack-sm">
      <Badge tone={tone}>{title}</Badge>
      <ul className="voice__list">
        {items.map((it) => (
          <li key={it} className="t-body-s">
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
