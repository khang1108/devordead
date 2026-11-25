import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, CardHead } from "../components/ui.jsx";
import { AiAvatar, ConfirmDialog, RoomTopBar, TranscriptList } from "../components/Room.jsx";
import Waveform from "../components/Waveform.jsx";
import { hrPlan, hrScript } from "../data/mock.js";
import "./InterviewRoom.css";

const STAR = [
  ["S", "Situation", "Bối cảnh: dự án, đội nhóm, thời điểm"],
  ["T", "Task", "Nhiệm vụ / vai trò của bạn"],
  ["A", "Action", "Bạn đã làm gì — dùng “I”, không phải “we”"],
  ["R", "Result", "Kết quả, con số, bài học rút ra"],
];

// UC11 Phỏng vấn HR (tiếng Anh) — CHỈ UI.
export default function HrInterviewScreen() {
  const navigate = useNavigate();
  const [micOn, setMicOn] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const current = hrScript[hrScript.length - 1];
  const history = hrScript.slice(0, -1);

  return (
    <div className="room">
      <RoomTopBar badge="HR · English" title="Behavioral interview · Backend Fresher" remaining="11:36" total="30:00" tone="warn" onEnd={() => setConfirm(true)} />

      <div className="room-body ir__body">
        <section className="room-stage" aria-label="Người phỏng vấn AI">
          <AiAvatar speaking />
          <p className="t-mono room-stage__label">AI Interviewer · đang hỏi</p>
          <p className="room-stage__subtitle" lang="en">
            “{current.text}”
          </p>
          <div className="room-stage__you">
            <div style={{ width: 120 }}>
              <Waveform active={micOn} bars={14} height={26} color="var(--brand)" idleColor="#3C5A6E" />
            </div>
            <span className="t-body-s t-strong">{micOn ? "Your turn — listening (English)" : "Micro đang tắt"}</span>
          </div>
          <div className="row">
            <Button variant="secondary" onDark size="sm">
              Repeat the question
            </Button>
            <Button variant="ghost" onDark size="sm" onClick={() => setMicOn((v) => !v)} aria-pressed={!micOn}>
              {micOn ? "Tắt micro" : "Bật micro"}
            </Button>
          </div>
          <p className="t-body-s ir__hint">Hãy trả lời bằng tiếng Anh. Nếu bạn im lặng quá lâu, AI sẽ diễn đạt lại câu hỏi.</p>
        </section>

        <aside className="ir__side" aria-label="Thông tin phiên">
          <Card className="card--tight">
            <CardHead title="Kế hoạch phiên">
              <span className="t-body-s c-ink2">3 / 5</span>
            </CardHead>
            <ol className="ir__plan">
              {hrPlan.map((step, i) => {
                const state = i < 2 ? "done" : i === 2 ? "now" : "todo";
                return (
                  <li key={step} className={`ir__plan-item is-${state}`}>
                    <span className="ir__plan-dot" aria-hidden="true" />
                    <span className="t-body-s">{step}</span>
                    {state === "now" && <Badge tone="brand">Đang hỏi</Badge>}
                    {state === "done" && <span className="sr-only">(đã xong)</span>}
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card variant="soft" className="card--tight">
            <p className="t-mono c-brand">Gợi ý trả lời theo STAR</p>
            <ul className="ir__star">
              {STAR.map(([l, en, vi]) => (
                <li key={l}>
                  <span className="ir__star-letter">{l}</span>
                  <span className="col" style={{ "--gap": "0px" }}>
                    <span className="t-body-s t-strong" lang="en">
                      {en}
                    </span>
                    <span className="t-body-s c-ink2">{vi}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="card--tight ir__transcript">
            <CardHead title="Transcript (EN)" />
            <TranscriptList turns={history} youLabel="You" aiLabel="AI" />
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Kết thúc phiên sớm?"
        confirmLabel="Kết thúc & lưu"
        onCancel={() => setConfirm(false)}
        onConfirm={() => navigate("/interview/ended", { state: { type: "hr", reason: "early" } })}
      >
        Transcript và bằng chứng đến thời điểm này sẽ được lưu, rồi hệ thống lập báo cáo. Không thể tiếp tục phiên sau khi kết thúc.
      </ConfirmDialog>
    </div>
  );
}
