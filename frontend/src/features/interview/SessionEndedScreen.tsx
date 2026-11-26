import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogoMark } from "@shared/components/Logo";
import { TEST_STATUS_META } from "@shared/constants";
import { Badge, Callout, EmptyState, RuleTag } from "@shared/ui";
import { localStore } from "@shared/services/localStore";
import type { ProgrammingLanguage, SessionSnapshot } from "@shared/types";
import { TranscriptList } from "./components/Room";
import "./components/room.css";
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

type SnapshotTab = "code" | "transcript" | "tests";

// UC13 Kết thúc phiên & lưu Hard-Stop Snapshot (BR1) — Full-Viewport Workbench Summary
export default function SessionEndedScreen() {
  const location = useLocation();
  const stateSnapshot = location.state as SessionSnapshot | null;
  const snapshot: SessionSnapshot | null = stateSnapshot ?? localStore.getLastSnapshot();
  const technical = snapshot?.mode === "technical";

  const [activeTab, setActiveTab] = useState<SnapshotTab>(() => (technical ? "code" : "transcript"));
  const effectiveTab: SnapshotTab = technical ? activeTab : "transcript";

  // Đảm bảo ngày luyện tập hôm nay luôn được ghi nhận trên StudyCalendar khi hoàn tất phiên
  useEffect(() => {
    if (snapshot) {
      localStore.recordTodayPractice();
    }
  }, [snapshot]);

  const headerTitle = snapshot
    ? technical
      ? snapshot.problemTitle || "Technical & Live Coding"
      : "HR — Behavioral (EN)"
    : "Bản chụp phiên phỏng vấn";

  if (!snapshot) {
    return (
      <div className="lc-workbench">
        <header className="lc-wb-bar room-wb-bar">
          <div className="lc-wb-bar__left">
            <Link to="/dashboard" className="room-wb-brand" aria-label="Về tổng quan">
              <LogoMark size={22} />
            </Link>
            <span className="room-bar__sep" aria-hidden="true" />
            <Badge tone="neutral" dot>
              BR1 · Hard-stop Snapshot
            </Badge>
            <p className="room-bar__title">{headerTitle}</p>
          </div>
          <div className="lc-wb-bar__center" />
          <div className="lc-wb-bar__right">
            <Link to="/dashboard" className="lc-wb-back">
              Về tổng quan
            </Link>
          </div>
        </header>

        <div className="lc-wb-body end-wb-body">
          <div className="lc-pane end-empty-pane">
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
      </div>
    );
  }

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
    ...(technical ? [`Đã chụp snapshot mã nguồn (${codeLines} dòng) tại mốc kết thúc`] : []),
    `Đã lưu nguyên vẹn ${turns.length} lượt transcript`,
    ...(technical && sandboxResult && passedTests !== null && totalTests !== null
      ? [`Đã lưu kết quả Sandbox cuối (${passedTests}/${totalTests} test đạt)`]
      : []),
    snapshot.reportId
      ? `Báo cáo năng lực #${snapshot.reportId} đã được khởi tạo`
      : "Bản chụp đã được niêm phong cục bộ; báo cáo chi tiết sẽ đồng bộ khi Backend sẵn sàng",
  ];

  return (
    <div className="lc-workbench">
      <header className="lc-wb-bar room-wb-bar">
        <div className="lc-wb-bar__left">
          <Link to="/dashboard" className="room-wb-brand" aria-label="Về trang tổng quan">
            <LogoMark size={22} />
          </Link>
          <span className="room-bar__sep" aria-hidden="true" />
          <Badge tone={isHardStop ? "warning" : "neutral"} dot className="room-bar__badge">
            BR1 · Hard-stop Snapshot
          </Badge>
          <p className="room-bar__title" title={headerTitle}>
            {headerTitle}
          </p>
        </div>

        <div className="lc-wb-bar__center" />

        <div className="lc-wb-bar__right">
          <span className="t-mono c-ink2">
            {snapshot.sessionId ? `Phiên #${snapshot.sessionId}` : "Bản chụp cục bộ"} · {duration}:00
          </span>
          <Link to="/dashboard" className="lc-wb-back">
            Về tổng quan
          </Link>
        </div>
      </header>

      <main className="lc-wb-body end-wb-body">
        <div className="end-grid">
          {/* Left Pane: Hard-Stop Certificate & Next Actions */}
          <section className="lc-pane" aria-label="Chứng nhận khóa phiên và lưu snapshot">
            <div className="lc-pane__head">
              <span className="ir-pane-title">
                <LockSvg />
                {technical
                  ? "Editor đã khóa & Snapshot nguyên vẹn"
                  : "Transcript đã niêm phong"}
              </span>
              <RuleTag code="BR1">Không kéo dài phiên</RuleTag>
            </div>

            <div className="lc-pane__body">
              <div className="end-pane-body">
                <div className="row wrap stack-sm">
                  <Badge tone={isHardStop ? "warning" : "neutral"} dot>
                    {isHardStop ? `Hết giờ · Hard-stop ${duration}:00` : "Kết thúc chủ động"}
                  </Badge>
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
                    : "Bạn đã chủ động xác nhận kết thúc phiên và niêm phong toàn bộ dữ liệu hiện tại."}
                </p>

                <ol
                  className="end__checks"
                  aria-label="Tiến trình khóa phiên và chụp snapshot (UC13)"
                >
                  {checks.map((item) => (
                    <li key={item} className="end__check">
                      <span className="end__check-dot" aria-hidden="true">
                        ✓
                      </span>
                      <span className="t-body-s">{item}</span>
                    </li>
                  ))}
                </ol>

                <Callout tone="brand" title="Quy định BR1 · Chế độ Practice tách biệt">
                  Bạn có thể mở lại bài tập trong chế độ <strong>Practice</strong> để viết tiếp hoặc
                  tối ưu lời giải, nhưng mọi chỉnh sửa sau mốc hard-stop{" "}
                  <strong>sẽ không thay đổi điểm số hay snapshot đã ghi nhận</strong> của phiên
                  phỏng vấn này.
                </Callout>

                <div className="end__ctas">
                  <Link to={reportHref} className="btn btn--primary">
                    Xem báo cáo năng lực
                  </Link>
                  <Link to="/problems/sandbox" className="btn btn--secondary">
                    Làm tiếp ở chế độ Practice
                  </Link>
                  <Link to="/interview/setup" className="btn btn--ghost">
                    Phiên mới
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Right Pane: Captured Code, Transcript Summary & Test Results */}
          <section className="lc-pane" aria-label="Dữ liệu Snapshot đã niêm phong">
            <div className="lc-pane__head">
              <div className="lc-pane__tabs" role="tablist" aria-label="Nội dung Snapshot">
                {technical && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={effectiveTab === "code"}
                    className={`lc-pane__tab ${effectiveTab === "code" ? "is-active" : ""}`.trim()}
                    onClick={() => setActiveTab("code")}
                  >
                    Mã nguồn (Read-only)
                    <span className="ir-tab-count">{codeLines}</span>
                  </button>
                )}

                <button
                  type="button"
                  role="tab"
                  aria-selected={effectiveTab === "transcript"}
                  className={`lc-pane__tab ${effectiveTab === "transcript" ? "is-active" : ""}`.trim()}
                  onClick={() => setActiveTab("transcript")}
                >
                  Transcript
                  <span className="ir-tab-count">{turns.length}</span>
                </button>

                {technical && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={effectiveTab === "tests"}
                    className={`lc-pane__tab ${effectiveTab === "tests" ? "is-active" : ""}`.trim()}
                    onClick={() => setActiveTab("tests")}
                  >
                    Kết quả test
                    {totalTests !== null && passedTests !== null && (
                      <span className="ir-tab-count">
                        {passedTests}/{totalTests}
                      </span>
                    )}
                  </button>
                )}
              </div>

              <Badge tone="neutral">Read-only · BR1</Badge>
            </div>

            <div className="lc-pane__body">
              <div className="end-pane-body">
                {effectiveTab === "code" && technical && (
                  <div className="end__code-frame">
                    <div className="end__code-head">
                      <span className="t-mono">
                        {fileName} · {codeLines} dòng
                      </span>
                      <span className="t-mono" style={{ opacity: 0.72 }}>
                        Read-only
                      </span>
                    </div>
                    <div className="end__code">
                      <pre className="code-block">
                        {capturedCode || "// Không có mã nguồn nào được nhập trong phiên này."}
                      </pre>
                    </div>
                  </div>
                )}

                {effectiveTab === "transcript" && (
                  <TranscriptList
                    turns={turns}
                    youLabel={technical ? "Bạn" : "You"}
                    aiLabel="AI Interviewer"
                    emptyLabel="Không có lượt hội thoại nào được ghi nhận trong phiên này."
                  />
                )}

                {effectiveTab === "tests" && technical && (
                  <div className="col stack-sm">
                    {sandboxResult ? (
                      <>
                        <div className="row between wrap stack-sm">
                          <span className="t-body-s t-strong">{sandboxResult.title}</span>
                          <Badge tone={sandboxResult.tone} dot>
                            {sandboxResult.summary}
                          </Badge>
                        </div>
                        <div className="it-test-rows">
                          {sandboxResult.tests.map((t) => {
                            const st = TEST_STATUS_META[t.status];
                            return (
                              <div key={t.name} className="it-test-row">
                                <span className="t-body-s t-strong">{t.name}</span>
                                <div className="row stack-sm">
                                  <span className="t-mono c-ink2">
                                    {t.status === "tle" ? "> 3000 ms" : `${t.timeMs} ms`} ·{" "}
                                    {t.memMb.toFixed(1)} MB
                                  </span>
                                  <Badge tone={st.tone} dot>
                                    {st.label}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <p className="t-body-s c-ink2">
                        Chưa có lượt chạy Docker Sandbox nào được thực hiện trong phiên này.
                      </p>
                    )}
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
              </div>
            </div>

            <div className="lc-pane__foot">
              <span className="t-mono">
                {snapshot.sessionId ? `Snapshot #${snapshot.sessionId}` : "Local Snapshot"}
              </span>
              <span className="t-mono">{formatDateTime(snapshot.endedAt)}</span>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
