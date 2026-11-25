import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Badge, Callout, Card, Eyebrow, RuleTag } from "../components/ui.jsx";
import { SAMPLE_SOLUTION } from "../lib/sandbox.js";
import "./InterviewRoom.css";

function LockSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

// UC13 Kết thúc phiên & lưu Hard-Stop Snapshot (BR1) — CHỈ UI.
export default function SessionEndedScreen() {
  const { state } = useLocation();
  const type = state?.type ?? "technical";
  const timeout = (state?.reason ?? "timeout") === "timeout";
  const technical = type === "technical";
  const duration = state?.duration ?? 30;
  const capturedCode = state?.code ?? SAMPLE_SOLUTION;
  const turnsCount = state?.turnsCount ?? (technical ? 9 : 7);
  const hintsUsed = state?.hints ?? (technical ? 1 : 0);
  const passed = state?.passed ?? 4;
  const total = state?.total ?? 5;

  const [reportReady, setReportReady] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setReportReady(true), 900);
    return () => clearTimeout(id);
  }, []);

  const checks = [
    "Dừng luồng hội thoại, ghi âm micro và phát âm thanh TTS",
    technical && "Khóa trình soạn thảo Monaco (chế độ chỉ đọc — Read-only)",
    technical && `Chụp snapshot mã nguồn tại mốc ${duration}:00.000`,
    "Lưu nguyên vẹn transcript & bằng chứng vào PostgreSQL",
    technical && `Lưu kết quả chấm Sandbox cuối (${passed}/${total} test đạt)`,
  ].filter(Boolean);

  return (
    <div className="end">
      <Card className="end__card">
        {/* Thanh chứng nhận khóa phiên phẳng (biểu tượng SVG mảnh, chữ thường chuẩn câu, không emoji 🔒) */}
        <div className="end__banner">
          <span className="end__banner-lock">
            <LockSvg />
            {technical
              ? "Phiên đã đóng · Editor đã khóa & Snapshot nguyên vẹn (BR1)"
              : "Phiên đã đóng · Transcript đã niêm phong (BR1)"}
          </span>
          <span className="t-mono end__banner-meta">
            Snapshot 2211-8F4A · 22/11/2026 14:30:00 · {duration}:00
          </span>
        </div>

        <div className="end__split">
          <div className="end__main">
            <div className="row wrap stack-sm">
              <Badge tone={timeout ? "warning" : "neutral"} dot>
                {timeout ? `Hết giờ · Hard-stop ${duration}:00` : "Kết thúc chủ động"}
              </Badge>
              <RuleTag code="BR1">Không kéo dài phiên</RuleTag>
              {technical && <RuleTag code="BR2">Chấm độc lập mã &amp; lập luận</RuleTag>}
            </div>

            <h1 className="t-display-l">
              {timeout ? `Hết giờ — Phiên kết thúc đúng ${duration}:00` : "Phiên phỏng vấn đã kết thúc"}
            </h1>

            <p className="t-body-m c-ink2">
              {technical ? "Phiên Technical & Live Coding" : "Phiên HR — Behavioral (EN)"} · {duration} phút ·{" "}
              {timeout
                ? "Bộ hẹn giờ kích hoạt hard-stop đúng thời lượng đã cấu hình và lưu tức thì toàn bộ dữ liệu."
                : "Bạn đã chủ động xác nhận kết thúc phiên và niêm phong dữ liệu hiện tại."}
            </p>

            <ol className="end__checks" aria-label="Tiến trình khóa phiên và chụp snapshot (UC13)">
              {checks.map((c) => (
                <li key={c} className="end__check">
                  <span className="end__check-dot" aria-hidden="true">
                    ✓
                  </span>
                  <span className="t-body-s" style={{ color: "var(--ink)" }}>
                    {c}
                  </span>
                </li>
              ))}
              <li className={`end__check ${reportReady ? "" : "is-pending"}`}>
                <span className="end__check-dot" aria-hidden="true">
                  {reportReady ? "✓" : <span className="spinner" style={{ width: 11, height: 11 }} />}
                </span>
                <span className="t-body-s" style={{ color: "var(--ink)" }}>
                  {reportReady
                    ? "Assessment Engine đã lập xong báo cáo năng lực #r-2211"
                    : "Assessment Engine đang chấm điểm & tổng hợp báo cáo..."}
                </span>
              </li>
            </ol>

            <Callout tone="brand" title="Quy định BR1 · Chế độ Practice tách biệt">
              Bạn có thể mở lại bài tập trong chế độ <strong>Practice</strong> để viết tiếp hoặc tối ưu lời giải, nhưng mọi chỉnh sửa sau mốc hard-stop <strong>sẽ không thay đổi điểm số hay snapshot đã ghi nhận</strong> của phiên phỏng vấn này.
            </Callout>

            <div className="row wrap end__ctas">
              <Link to="/reports/r-2211" className="btn btn--primary">
                Xem báo cáo năng lực
              </Link>
              <Link to="/problems/001" className="btn btn--secondary">
                Làm tiếp ở chế độ Practice
              </Link>
              <Link to="/dashboard" className="btn btn--ghost">
                Về tổng quan
              </Link>
            </div>
          </div>

          <aside className="end__side" aria-label="Tóm tắt Snapshot đã lưu">
            <div className="row between">
              <Eyebrow className="c-ink2">
                {technical ? "Snapshot mã nguồn đã chụp" : "Trích đoạn Transcript đã lưu"}
              </Eyebrow>
              <Badge tone="neutral">Read-only · BR1</Badge>
            </div>

            {technical ? (
              <div className="end__code-frame">
                <div className="end__code-head">
                  <span className="t-mono">two_sum.py · {capturedCode.split("\n").length} dòng</span>
                  <span className="t-mono" style={{ opacity: 0.75 }}>
                    Đã khóa lúc {duration}:00
                  </span>
                </div>
                <div className="end__code">
                  <pre className="code-block">{capturedCode}</pre>
                </div>
              </div>
            ) : (
              <div className="end__code-frame">
                <div className="end__code-head">
                  <span className="t-mono">transcript_en.log</span>
                  <span className="t-mono" style={{ opacity: 0.75 }}>
                    EN-US verified
                  </span>
                </div>
                <div className="end__code">
                  <pre className="code-block" style={{ fontFamily: "var(--font-body)" }} lang="en">
                    {`[14:18:12] AI: Tell me about a time you disagreed with a teammate. How did you handle it, and what was the result?\n\n[14:19:04] You: In our 4-person capstone team, I owned the payment retry module and benchmarked PostgreSQL idempotency keys, reducing duplicate charges to 0%.`}
                  </pre>
                </div>
              </div>
            )}

            <dl className="end__kv">
              <div className="kv">
                <dt>Thời điểm niêm phong</dt>
                <dd>{timeout ? `${duration}:00.000 (Hard-stop)` : "Chủ động kết thúc"}</dd>
              </div>
              <div className="kv">
                <dt>Lượt hội thoại (Transcript)</dt>
                <dd>{turnsCount} lượt đã lưu</dd>
              </div>
              {technical && (
                <div className="kv">
                  <dt>Kết quả Sandbox cuối</dt>
                  <dd>
                    {passed} / {total} Passed
                  </dd>
                </div>
              )}
              <div className="kv">
                <dt>Gợi ý đã sử dụng</dt>
                <dd>{hintsUsed} gợi ý</dd>
              </div>
              <div className="kv">
                <dt>Đồng bộ dự phòng (NFR07)</dt>
                <dd>Redis Snapshot · An toàn</dd>
              </div>
            </dl>
          </aside>
        </div>
      </Card>
    </div>
  );
}
