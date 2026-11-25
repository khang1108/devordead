import { Link, useLocation } from "react-router-dom";
import { Badge, Callout, Card, Eyebrow, RuleTag } from "../components/ui.jsx";
import { SAMPLE_SOLUTION } from "../lib/sandbox.js";
import "./InterviewRoom.css";

// UC13 Kết thúc phiên & lưu snapshot — CHỈ UI. state: { type: "technical" | "hr", reason: "timeout" | "early" }
export default function SessionEndedScreen() {
  const { state } = useLocation();
  const type = state?.type ?? "technical";
  const timeout = (state?.reason ?? "timeout") === "timeout";
  const technical = type === "technical";

  const checks = [
    "Dừng hội thoại, ghi âm và phát âm thanh",
    technical && "Khóa trình soạn thảo",
    technical && "Chụp snapshot mã nguồn",
    "Lưu transcript & bằng chứng",
    technical && "Lưu kết quả test",
  ].filter(Boolean);

  return (
    <div className="end">
      <Card className="end__card">
        <div className="end__main">
          <div className="row wrap stack-sm">
            <Badge tone={timeout ? "warning" : "neutral"} dot>
              {timeout ? "Hết giờ" : "Kết thúc sớm"}
            </Badge>
            <RuleTag code="BR1">Hard-stop</RuleTag>
          </div>
          <h1 className="t-display-l">{timeout ? "Hết giờ! Phiên đã kết thúc lúc 30:00" : "Phiên đã kết thúc"}</h1>
          <p className="c-ink2">
            {technical ? "Phiên Technical & Live Coding" : "Phiên HR — Behavioral (EN)"} · 30 phút · {timeout ? "kết thúc đúng thời lượng, không kéo dài." : "bạn đã chủ động kết thúc."}
          </p>

          <ol className="end__checks" aria-label="Các bước lưu phiên">
            {checks.map((c) => (
              <li key={c} className="end__check">
                <span className="end__check-dot" aria-hidden="true">
                  ✓
                </span>
                <span className="t-body-m">{c}</span>
              </li>
            ))}
            <li className="end__check is-pending">
              <span className="end__check-dot" aria-hidden="true">
                <span className="spinner" style={{ width: 12, height: 12 }} />
              </span>
              <span className="t-body-m">Đang chấm điểm & lập báo cáo…</span>
            </li>
          </ol>

          <Callout tone="success" title="Một phiên luyện nữa đã hoàn thành">
            Đây là phiên thứ 13 của bạn. Mỗi phiên đều cập nhật hồ sơ năng lực và lộ trình học.
          </Callout>

          <div className="row wrap">
            <Link to="/reports/r-2211" className="btn btn--primary">
              Xem báo cáo
            </Link>
            {technical && (
              <Link to="/problems/001" className="btn btn--secondary">
                Làm tiếp ở chế độ Practice
              </Link>
            )}
            <Link to="/dashboard" className="btn btn--ghost">
              Về tổng quan
            </Link>
          </div>
          {technical && <p className="t-body-s c-ink2">Chế độ Practice cho phép sửa tiếp bài, nhưng không thay đổi điểm của phiên này.</p>}
        </div>

        <aside className="end__side" aria-label="Dữ liệu đã lưu">
          <Eyebrow className="c-ink2">{technical ? "Snapshot mã lúc kết thúc" : "Transcript đã lưu"}</Eyebrow>
          {technical ? (
            <div className="end__code">
              <pre className="code-block">{SAMPLE_SOLUTION}</pre>
              <span className="end__lock">
                <Badge tone="neutral">Đã khóa</Badge>
              </span>
            </div>
          ) : (
            <div className="code-block" style={{ fontFamily: "var(--font-body)" }} lang="en">
              AI: Tell me about a time you disagreed with a teammate…{"\n"}You: In my capstone project, our team…
            </div>
          )}
          <dl>
            <div className="kv">
              <dt>Lượt hỏi – đáp</dt>
              <dd>{technical ? "9" : "7"}</dd>
            </div>
            {technical && (
              <div className="kv">
                <dt>Kết quả test</dt>
                <dd>4 / 5 Passed</dd>
              </div>
            )}
            <div className="kv">
              <dt>Gợi ý đã dùng</dt>
              <dd>1</dd>
            </div>
          </dl>
          <p className="t-body-s c-ink2">Nếu lưu thất bại, hệ thống dùng bản đồng bộ gần nhất trong Redis — dữ liệu không bị mất.</p>
        </aside>
      </Card>
    </div>
  );
}
