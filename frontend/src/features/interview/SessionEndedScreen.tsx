import { Link, useLocation } from "react-router-dom";
import { Badge, Callout, Card, EmptyState, Eyebrow, RuleTag } from "@shared/ui";
import { localStore } from "@shared/services/localStore";
import type { ProgrammingLanguage, SessionSnapshot } from "@shared/types";
import "./components/InterviewRoom.css";

function LockSvg() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

const LANG_EXT: Record<ProgrammingLanguage, string> = {
  python: "solution.py",
  javascript: "solution.js",
  cpp: "solution.cpp",
  java: "Solution.java",
};

function formatDateTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(parsed);
}

// UC13 Kết thúc phiên & lưu Hard-Stop Snapshot (BR1)
export default function SessionEndedScreen() {
  const location = useLocation();
  const stateSnapshot = location.state as SessionSnapshot | null;
  const snapshot: SessionSnapshot | null = stateSnapshot ?? localStore.getLastSnapshot();

  if (!snapshot) {
    return (
      <div className="end">
        <div className="end__empty-wrap">
          <EmptyState
            title="Chưa có bản chụp phiên phỏng vấn nào"
            description="Trang này hiển thị chứng nhận hard-stop (BR1), snapshot mã nguồn và transcript ngay sau khi bạn kết thúc một phiên phỏng vấn HR hoặc Technical."
            actions={
              <>
                <Link to="/interview/setup" className="btn btn--primary">
                  Thiết lập phiên phỏng vấn
                </Link>
                <Link to="/dashboard" className="btn btn--secondary">
                  Về tổng quan
                </Link>
              </>
            }
          />
        </div>
      </div>
    );
  }

  const technical = snapshot.mode === "technical";
  const isHardStop = snapshot.reason === "hard-stop";
  const duration = snapshot.duration;
  const capturedCode = snapshot.code ?? "";
  const codeLines = capturedCode ? capturedCode.split("\n").length : 0;
  const turns = snapshot.turns ?? [];
  const hintsUsed = turns.filter((t) => t.who === "hint").length;
  const sandboxResult = snapshot.sandboxResult ?? null;
  const passedTests = sandboxResult
    ? sandboxResult.tests.filter((t) => t.status === "passed").length
    : null;
  const totalTests = sandboxResult ? sandboxResult.tests.length : null;
  const reportHref = snapshot.reportId ? `/reports/${snapshot.reportId}` : "/reports";
  const fileName = snapshot.language ? LANG_EXT[snapshot.language] : "solution.txt";

  const checks: string[] = [
    "Đã dừng luồng hội thoại, micro Web Audio và phát âm thanh TTS",
    ...(technical ? ["Đã khóa trình soạn thảo Monaco (chế độ chỉ đọc — Read-only)"] : []),
    ...(technical
      ? [`Đã chụp snapshot mã nguồn (${codeLines} dòng) tại mốc kết thúc`]
      : []),
    `Đã lưu nguyên vẹn ${turns.length} lượt transcript`,
    ...(technical && sandboxResult && passedTests !== null && totalTests !== null
      ? [`Đã lưu kết quả Sandbox cuối (${passedTests}/${totalTests} test đạt)`]
      : []),
    snapshot.reportId
      ? `Báo cáo năng lực #${snapshot.reportId} đã được khởi tạo`
      : "Bản chụp đã được niêm phong cục bộ; báo cáo chi tiết sẽ đồng bộ khi Backend sẵn sàng",
  ];

  const transcriptPreview =
    turns.length > 0
      ? turns
          .map((t) => {
            const label = t.who === "ai" ? "AI" : t.who === "hint" ? "Hint" : "You";
            const prefix = t.timestamp ? `[${t.timestamp}] ` : "";
            return `${prefix}${label}: ${t.text}`;
          })
          .join("\n\n")
      : "Không có lượt hội thoại nào được ghi nhận trong phiên này.";

  return (
    <div className="end">
      <Card className="end__card">
        <div className="end__banner">
          <span className="end__banner-lock">
            <LockSvg />
            {technical
              ? "Phiên đã đóng · Editor đã khóa & Snapshot nguyên vẹn (BR1)"
              : "Phiên đã đóng · Transcript đã niêm phong (BR1)"}
          </span>
          <span className="t-mono end__banner-meta">
            {snapshot.sessionId ? `Phiên #${snapshot.sessionId}` : "Bản chụp cục bộ"} ·{" "}
            {formatDateTime(snapshot.endedAt)} · {duration}:00
          </span>
        </div>

        <div className="end__split">
          <div className="end__main">
            <div className="row wrap stack-sm">
              <Badge tone={isHardStop ? "warning" : "neutral"} dot>
                {isHardStop ? `Hết giờ · Hard-stop ${duration}:00` : "Kết thúc chủ động"}
              </Badge>
              <RuleTag code="BR1">Không kéo dài phiên</RuleTag>
              {technical && <RuleTag code="BR2">Chấm độc lập mã &amp; lập luận</RuleTag>}
            </div>

            <h1 className="t-display-l">
              {isHardStop
                ? `Hết giờ — Phiên kết thúc đúng ${duration}:00`
                : "Phiên phỏng vấn đã kết thúc"}
            </h1>

            <p className="t-body-m c-ink2">
              {technical ? "Phiên Technical & Live Coding" : "Phiên HR — Behavioral (EN)"} ·{" "}
              {duration} phút ·{" "}
              {isHardStop
                ? "Bộ hẹn giờ đã kích hoạt hard-stop đúng thời lượng đã cấu hình và lưu tức thì toàn bộ dữ liệu."
                : "Bạn đã chủ động xác nhận kết thúc phiên và niêm phong dữ liệu hiện tại."}
            </p>

            <ol className="end__checks" aria-label="Tiến trình khóa phiên và chụp snapshot (UC13)">
              {checks.map((item) => (
                <li key={item} className="end__check">
                  <span className="end__check-dot" aria-hidden="true">
                    ✓
                  </span>
                  <span className="t-body-s" style={{ color: "var(--ink)" }}>
                    {item}
                  </span>
                </li>
              ))}
            </ol>

            <Callout tone="brand" title="Quy định BR1 · Chế độ Practice tách biệt">
              Bạn có thể mở lại bài tập trong chế độ <strong>Practice</strong> để viết tiếp hoặc tối
              ưu lời giải, nhưng mọi chỉnh sửa sau mốc hard-stop{" "}
              <strong>sẽ không thay đổi điểm số hay snapshot đã ghi nhận</strong> của phiên phỏng
              vấn này.
            </Callout>

            <div className="row wrap end__ctas">
              <Link to={reportHref} className="btn btn--primary">
                Xem báo cáo năng lực
              </Link>
              <Link to="/problems/sandbox" className="btn btn--secondary">
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
                {technical ? "Snapshot mã nguồn đã chụp" : "Transcript đã niêm phong"}
              </Eyebrow>
              <Badge tone="neutral">Read-only · BR1</Badge>
            </div>

            {technical ? (
              <div className="end__code-frame">
                <div className="end__code-head">
                  <span className="t-mono">
                    {fileName} · {codeLines} dòng
                  </span>
                  <span className="t-mono" style={{ opacity: 0.75 }}>
                    Đã khóa
                  </span>
                </div>
                <div className="end__code">
                  <pre className="code-block">
                    {capturedCode || "// Không có mã nguồn nào được nhập trong phiên này."}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="end__code-frame">
                <div className="end__code-head">
                  <span className="t-mono">transcript_en.log</span>
                  <span className="t-mono" style={{ opacity: 0.75 }}>
                    {turns.length} lượt
                  </span>
                </div>
                <div className="end__code">
                  <pre className="code-block" style={{ fontFamily: "var(--font-body)" }} lang="en">
                    {transcriptPreview}
                  </pre>
                </div>
              </div>
            )}

            <dl className="end__kv">
              <div className="kv">
                <dt>Hình thức kết thúc</dt>
                <dd>{isHardStop ? `${duration}:00 (Hard-stop)` : "Chủ động kết thúc"}</dd>
              </div>
              <div className="kv">
                <dt>Thời điểm niêm phong</dt>
                <dd>{formatDateTime(snapshot.endedAt)}</dd>
              </div>
              <div className="kv">
                <dt>Lượt hội thoại (Transcript)</dt>
                <dd>{turns.length} lượt đã lưu</dd>
              </div>
              {technical && (
                <div className="kv">
                  <dt>Kết quả Sandbox cuối</dt>
                  <dd>
                    {sandboxResult && passedTests !== null && totalTests !== null
                      ? `${passedTests} / ${totalTests} Passed (${sandboxResult.summary})`
                      : "Chưa chạy test"}
                  </dd>
                </div>
              )}
              <div className="kv">
                <dt>Gợi ý đã sử dụng</dt>
                <dd>{hintsUsed} gợi ý</dd>
              </div>
            </dl>
          </aside>
        </div>
      </Card>
    </div>
  );
}
