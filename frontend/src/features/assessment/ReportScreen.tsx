import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Callout,
  EmptyState,
  ErrorBanner,
  Field,
  PageHeader,
  ProgressBar,
  RuleTag,
  Skeleton,
} from "@shared/ui";
import { TEST_STATUS_META } from "@shared/constants";
import { getErrorMessage } from "@shared/services/apiClient";
import type { EvaluationReport, ProgressTone, ReportCompetency } from "@shared/types";
import { assessmentService } from "./assessment.service";
import "./ReportScreen.css";

type EvidenceTab = "transcript" | "snapshot" | "tests";

const EVIDENCE_TABS: readonly { value: EvidenceTab; label: string }[] = [
  { value: "transcript", label: "Transcript" },
  { value: "snapshot", label: "Snapshot mã" },
  { value: "tests", label: "Kết quả test" },
];

interface ScoreLedgerCellProps {
  label: string;
  score: number | null;
  tone?: ProgressTone;
  badge?: ReactNode;
  note?: string;
}

function ScoreLedgerCell({ label, score, tone = "brand", badge, note }: ScoreLedgerCellProps) {
  return (
    <div className="rep-score-cell col stack-sm">
      <div className="row between wrap">
        <h3 className="t-body-s t-strong c-ink2">{label}</h3>
        {badge}
      </div>
      <p className="t-number rep-tabular">
        {score !== null ? (
          <>
            {score.toFixed(1)} <span className="t-body-s c-ink2">/ 10</span>
          </>
        ) : (
          "—"
        )}
      </p>
      <div className="rep-bar-wrap">
        <ProgressBar label={label} value={score !== null ? score / 10 : 0} tone={tone} />
      </div>
      {note && <p className="t-body-s c-ink2">{note}</p>}
    </div>
  );
}

function EvidenceSection({ report }: { report: EvaluationReport }) {
  const [tab, setTab] = useState<EvidenceTab>("transcript");
  const transcript = report.transcript ?? [];
  const codeSnapshot = report.codeSnapshot ?? "";
  const testResults = report.testResults ?? [];

  return (
    <section className="lc-pane rep-pane" aria-label="Bằng chứng từ phiên">
      <div className="lc-pane__head">
        <div className="lc-pane__tabs" role="tablist" aria-label="Bằng chứng đánh giá">
          {EVIDENCE_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              className={`lc-pane__tab ${tab === t.value ? "is-active" : ""}`.trim()}
              onClick={() => setTab(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <RuleTag code="BR1">Snapshot nguyên vẹn</RuleTag>
      </div>

      <div className="lc-pane__body rep-pane-body">
        {tab === "transcript" &&
          (transcript.length > 0 ? (
            <ol className="rep-transcript" role="list">
              {transcript.map(({ id, who, text, timestamp }, idx) => (
                <li key={id ?? `${who}-${idx}`} className="rep-turn">
                  <div className="row between">
                    <span className="t-body-s t-strong">
                      {who === "ai"
                        ? "Người phỏng vấn AI"
                        : who === "hint"
                          ? "Gợi ý định hướng"
                          : "Bạn"}
                    </span>
                    <span className="t-mono c-ink2 rep-tabular">
                      {timestamp ?? `#${String(idx + 1).padStart(2, "0")}`}
                    </span>
                  </div>
                  <p className="t-body-s c-ink2">{text}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="t-body-s c-ink2">
              Chưa có bản ghi transcript đính kèm trong báo cáo này.
            </p>
          ))}

        {tab === "snapshot" &&
          (codeSnapshot ? (
            <div className="col stack-sm">
              <p className="t-mono c-ink2">
                Snapshot mã nguồn · {report.type} ({report.duration}:00)
              </p>
              <pre className="code-block rep-code">
                <code>{codeSnapshot}</code>
              </pre>
            </div>
          ) : (
            <p className="t-body-s c-ink2">Phiên này không có snapshot mã nguồn.</p>
          ))}

        {tab === "tests" &&
          (testResults.length > 0 ? (
            <div className="col stack-sm">
              {report.correctness && (
                <p className="t-body-s c-ink2">
                  Chấm tự động trong Docker Sandbox đạt{" "}
                  <strong className="rep-tabular">
                    {report.correctness.passed}/{report.correctness.total}
                  </strong>{" "}
                  ca kiểm thử.
                </p>
              )}
              <div className="rep-table-scroll">
                <table className="table rep-tests">
                  <thead>
                    <tr>
                      <th scope="col">Ca kiểm thử</th>
                      <th scope="col">Thời gian</th>
                      <th scope="col">Bộ nhớ</th>
                      <th scope="col">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResults.map((tc, index) => {
                      const meta = TEST_STATUS_META[tc.status];
                      const diffClass =
                        tc.status === "passed"
                          ? "lc-diff--easy"
                          : tc.status === "tle" || tc.status === "mle"
                            ? "lc-diff--medium"
                            : "lc-diff--hard";
                      return (
                        <tr key={tc.name}>
                          <td>
                            <strong className="rep-tabular">Test {index + 1}</strong> · {tc.name}
                          </td>
                          <td className="t-mono c-ink2 rep-tabular">
                            {tc.status === "tle" ? "> 3000 ms" : `${tc.timeMs} ms`}
                          </td>
                          <td className="t-mono c-ink2 rep-tabular">{tc.memMb.toFixed(1)} MB</td>
                          <td>
                            <span className={`lc-diff ${diffClass}`}>{meta.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="t-body-s c-ink2">Phiên này không có dữ liệu kiểm thử Sandbox.</p>
          ))}
      </div>
    </section>
  );
}

interface ReviewFormProps {
  competency: ReportCompetency;
  sending: boolean;
  submitError: string | null;
  onCancel: () => void;
  onSubmit: (competencyId: string, reason: string) => void;
}

function ReviewForm({ competency, sending, submitError, onCancel, onSubmit }: ReviewFormProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    document.getElementById("rep-review-reason")?.focus();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Vui lòng nhập lý do yêu cầu đánh giá lại (E1).");
      document.getElementById("rep-review-reason")?.focus();
      return;
    }
    onSubmit(competency.id, trimmed);
  }

  return (
    <form className="rep-review col" onSubmit={submit} noValidate aria-busy={sending}>
      <div className="row between wrap">
        <div>
          <p className="t-body-s c-ink2">Yêu cầu đánh giá lại (UC16)</p>
          <h3 className="t-heading-s">
            {competency.name}{" "}
            <span className="t-mono c-ink2 rep-tabular">
              ({competency.score.toFixed(1)} / 10)
            </span>
          </h3>
        </div>
        <RuleTag code="BR2">Chấm độc lập</RuleTag>
      </div>

      <p className="t-body-s c-ink2">Bằng chứng hiện tại: “{competency.evidence}”</p>

      {submitError && (
        <ErrorBanner title="Chưa thể gửi yêu cầu đánh giá lại" message={submitError} />
      )}

      <Field
        id="rep-review-reason"
        label="Lý do (bắt buộc)"
        multiline
        required
        placeholder="Nêu rõ mốc hội thoại hoặc đoạn mã cần được xem xét lại…"
        value={reason}
        error={error}
        disabled={sending}
        onChange={(event) => {
          setReason(event.target.value);
          setError("");
        }}
      />

      <div className="row wrap stack-sm">
        <Button variant="primary" size="sm" type="submit" disabled={sending}>
          {sending && <span className="spinner" aria-hidden="true" />}
          {sending ? "Đang gửi…" : "Gửi yêu cầu"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={sending}>
          Hủy
        </Button>
      </div>
    </form>
  );
}

interface FullReportProps {
  report: EvaluationReport;
  requests: Record<string, string>;
  sendingId: string | null;
  submitError: string | null;
  onSubmit: (competencyId: string, reason: string) => void;
}

function FullReport({ report, requests, sendingId, submitError, onSubmit }: FullReportProps) {
  const [target, setTarget] = useState<ReportCompetency | null>(null);
  const [lastRequested, setLastRequested] = useState<string | null>(null);
  const reviewTrigger = useRef<HTMLButtonElement | null>(null);

  const activeTarget =
    target && !requests[target.id] && target.reevaluationStatus !== "pending" ? target : null;

  const competencies = report.competencies ?? [];
  const summaries = [
    { label: "Điểm mạnh", points: report.strengths ?? [] },
    { label: "Cần cải thiện", points: report.weaknesses ?? [] },
    { label: "Đề xuất", points: report.suggestions ?? [] },
  ].filter((s) => s.points.length > 0);

  function submitReview(id: string, reason: string) {
    setLastRequested(id);
    onSubmit(id, reason);
  }

  return (
    <>
      <section className="lc-pane rep-pane" aria-label="Điểm đánh giá">
        <div className="lc-pane__head">
          <span className="rep-pane-title">Điểm đánh giá</span>
          <RuleTag code="BR2">Chấm độc lập</RuleTag>
        </div>

        <div className="rep-scores-ledger">
          <ScoreLedgerCell
            label="Tổng quan"
            score={report.overall}
            tone="brand"
            note="Tổng hợp từ các tiêu chí đánh giá độc lập của phiên."
          />
          <ScoreLedgerCell
            label="Tính đúng của mã"
            score={report.correctness ? report.correctness.score : null}
            tone="success"
            badge={
              report.correctness ? (
                <Badge tone="success" dot>
                  {report.correctness.passed}/{report.correctness.total} test đạt
                </Badge>
              ) : (
                <Badge tone="neutral">Không áp dụng</Badge>
              )
            }
            note={
              report.correctness?.note ??
              "Chỉ áp dụng cho phiên Technical có bài lập trình trong Sandbox."
            }
          />
          <ScoreLedgerCell
            label="Lập luận"
            score={report.reasoning ? report.reasoning.score : null}
            tone="brand"
            note={report.reasoning?.note ?? "Đánh giá độc lập dựa trên transcript và lập luận."}
          />
        </div>
      </section>

      {competencies.length > 0 && (
        <section className="lc-pane rep-pane rep-competencies" aria-label="Năng lực theo tiêu chí">
          <div className="lc-pane__head">
            <span className="rep-pane-title">Năng lực theo tiêu chí</span>
            <span className="t-body-s c-ink2">Mỗi tiêu chí tối đa 1 yêu cầu (E2)</span>
          </div>

          {activeTarget && (
            <ReviewForm
              key={activeTarget.id}
              competency={activeTarget}
              sending={sendingId === activeTarget.id}
              submitError={submitError}
              onCancel={() => {
                setTarget(null);
                reviewTrigger.current?.focus();
              }}
              onSubmit={submitReview}
            />
          )}

          <p className="sr-only" role="status">
            {lastRequested && requests[lastRequested]
              ? "Đã gửi yêu cầu đánh giá lại. Yêu cầu đang xử lý."
              : ""}
          </p>

          <div className="rep-table-scroll">
            <table className="table rep-competency-table" role="table">
              <thead role="rowgroup">
                <tr role="row">
                  <th scope="col" role="columnheader">
                    Năng lực
                  </th>
                  <th scope="col" role="columnheader">
                    Điểm
                  </th>
                  <th scope="col" role="columnheader">
                    Bằng chứng
                  </th>
                  <th scope="col" role="columnheader">
                    Đánh giá lại
                  </th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {competencies.map((item) => {
                  const submittedReason = requests[item.id];
                  const isPending =
                    Boolean(submittedReason) || item.reevaluationStatus === "pending";
                  const barTone: ProgressTone =
                    item.score < 6 ? "warning" : item.score >= 8 ? "success" : "brand";
                  return (
                    <tr key={item.id} role="row" data-active={activeTarget?.id === item.id}>
                      <th scope="row" role="rowheader">
                        {item.name}
                      </th>
                      <td role="cell">
                        <span className="t-mono rep-score-label rep-tabular">
                          {item.score.toFixed(1)} / 10
                        </span>
                        <div className="rep-bar-wrap">
                          <ProgressBar
                            label={`Điểm ${item.name}`}
                            value={item.score / 10}
                            tone={barTone}
                          />
                        </div>
                      </td>
                      <td role="cell">
                        <p className="rep-evidence-quote">{item.evidence}</p>
                        {submittedReason && (
                          <p className="t-body-s c-ink2 rep-submitted-note">
                            Lý do đã gửi: “{submittedReason}”
                          </p>
                        )}
                      </td>
                      <td role="cell">
                        <div className="col stack-sm">
                          {isPending && (
                            <Badge tone="brand" dot className="rep-review-state">
                              Đang xử lý
                            </Badge>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            className="rep-review-button"
                            disabled={isPending || Boolean(sendingId)}
                            aria-label={`Yêu cầu đánh giá lại: ${item.name}`}
                            onClick={(event) => {
                              reviewTrigger.current = event.currentTarget;
                              setTarget(item);
                            }}
                          >
                            {isPending ? "Đã gửi yêu cầu" : "Yêu cầu đánh giá lại"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {summaries.length > 0 && (
        <section className="lc-pane rep-pane" aria-label="Nhận xét tổng hợp">
          <div className="lc-pane__head">
            <span className="rep-pane-title">Nhận xét tổng hợp</span>
          </div>
          <div className="rep-summaries-ledger">
            {summaries.map(({ label, points }) => (
              <div key={label} className="rep-summary-col col stack-sm">
                <h3 className="t-body-s t-strong">{label}</h3>
                <ul className="col stack-sm">
                  {points.map((point) => (
                    <li key={point} className="t-body-s c-ink2">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <EvidenceSection report={report} />
    </>
  );
}

// UC14, UC16 — Báo cáo năng lực & yêu cầu đánh giá lại
export default function ReportScreen() {
  const { id } = useParams<{ id?: string }>();

  const [reports, setReports] = useState<EvaluationReport[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [listError, setListError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState<number>(0);

  const [detail, setDetail] = useState<EvaluationReport | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<Record<string, Record<string, string>>>({});
  const [sending, setSending] = useState<{ reportId: string; competencyId: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const retryList = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingList(true);
    setListError(null);

    void assessmentService
      .getReports(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setReports(items);
          setLoadingList(false);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setListError(getErrorMessage(err));
          setLoadingList(false);
        }
      });

    return () => controller.abort();
  }, [reloadTick]);

  const activeId = id ?? reports[0]?.id ?? null;
  const listMatch = activeId ? (reports.find((item) => item.id === activeId) ?? null) : null;

  useEffect(() => {
    if (!activeId) {
      setDetail(null);
      setDetailError(null);
      setLoadingDetail(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoadingDetail(true);
    setDetailError(null);
    setSubmitError(null);

    void assessmentService
      .getReportById(activeId, controller.signal)
      .then((full) => {
        if (!controller.signal.aborted) {
          setDetail(full);
          setLoadingDetail(false);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setDetail(listMatch);
          setDetailError(listMatch ? null : getErrorMessage(err));
          setLoadingDetail(false);
        }
      });

    return () => controller.abort();
  }, [activeId, listMatch, reloadTick]);

  const activeReport = detail && detail.id === activeId ? detail : listMatch;

  async function submitReview(competencyId: string, reason: string) {
    if (!activeReport || sending || reviews[activeReport.id]?.[competencyId]) return;
    const reportId = activeReport.id;
    setSending({ reportId, competencyId });
    setSubmitError(null);

    try {
      await assessmentService.requestReevaluation(reportId, { competencyId, reason });
      setReviews((prev) => ({
        ...prev,
        [reportId]: { ...(prev[reportId] ?? {}), [competencyId]: reason },
      }));
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="rep-screen col stack-lg">
      <PageHeader
        eyebrow="Đánh giá năng lực"
        title="Báo cáo năng lực"
        subtitle="Xem điểm chấm độc lập, bằng chứng từ phiên phỏng vấn và yêu cầu xem xét lại kết quả."
        actions={
          <Link className="btn btn--secondary" to="/roadmap">
            Xem lộ trình học <span aria-hidden="true">→</span>
          </Link>
        }
      />

      {listError && (
        <ErrorBanner
          title="Chưa tải được danh sách báo cáo"
          message={listError}
          onRetry={retryList}
        />
      )}

      {loadingList ? (
        <div className="rep-layout">
          <section className="lc-pane rep-pane rep-history">
            <div className="lc-pane__head">
              <span className="rep-pane-title">Lịch sử phiên</span>
              <Skeleton width={28} height={14} />
            </div>
            <div className="rep-pane-body col stack-sm">
              <Skeleton width="100%" height={46} />
              <Skeleton width="100%" height={46} />
              <Skeleton width="100%" height={46} />
            </div>
          </section>
          <div className="rep-detail col">
            <section className="lc-pane rep-pane">
              <div className="lc-pane__head">
                <Skeleton width="28%" height={14} />
              </div>
              <div className="rep-pane-body col stack-sm">
                <Skeleton width="52%" height={22} />
                <Skeleton width="100%" height={84} />
              </div>
            </section>
          </div>
        </div>
      ) : !listError && reports.length === 0 ? (
        <EmptyState
          title="Chưa có báo cáo năng lực nào"
          description="Hoàn thành phiên phỏng vấn mô phỏng đầu tiên (HR hoặc Technical Live Coding) để hệ thống tổng hợp báo cáo đánh giá độc lập theo quy định BR2."
          actions={
            <Link to="/interview/setup" className="btn btn--primary">
              Bắt đầu phỏng vấn mô phỏng
            </Link>
          }
        />
      ) : reports.length > 0 ? (
        <div className="rep-layout">
          <aside className="lc-pane rep-pane rep-history" aria-label="Lịch sử phiên phỏng vấn">
            <div className="lc-pane__head">
              <span className="rep-pane-title">Lịch sử phiên</span>
              <span className="t-mono c-ink2 rep-tabular">{reports.length}</span>
            </div>

            <nav aria-label="Báo cáo theo phiên" className="lc-list rep-history-list">
              {reports.map((item) => {
                const isCurrent = activeReport?.id === item.id;
                return (
                  <Link
                    key={item.id}
                    className="lc-list__row rep-report-link"
                    to={`/reports/${item.id}`}
                    aria-current={isCurrent ? "page" : undefined}
                    aria-selected={isCurrent}
                  >
                    <span className="rep-report-title">{item.type}</span>
                    <span className="row wrap between stack-sm">
                      <span className="t-body-s c-ink2 rep-tabular">
                        {item.date} · {item.duration}p
                      </span>
                      {item.status === "interrupted" || item.overall === null ? (
                        <span className="lc-diff lc-diff--medium">Gián đoạn</span>
                      ) : (
                        <span className="t-mono c-ink2 rep-tabular">
                          {item.overall.toFixed(1)} / 10
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          <div className="rep-detail col">
            {detailError && (
              <ErrorBanner
                title="Không thể tải chi tiết báo cáo"
                message={detailError}
                onRetry={retryList}
              />
            )}

            {loadingDetail && !activeReport ? (
              <section className="lc-pane rep-pane">
                <div className="lc-pane__head">
                  <Skeleton width="35%" height={14} />
                </div>
                <div className="rep-pane-body col stack-sm">
                  <Skeleton width="60%" height={24} />
                  <Skeleton width="100%" height={120} />
                </div>
              </section>
            ) : activeReport ? (
              <>
                <section className="lc-pane rep-pane" aria-label="Thông tin phiên báo cáo">
                  <div className="lc-pane__head">
                    <span className="t-mono c-ink2 rep-tabular">Phiên #{activeReport.id}</span>
                    {activeReport.status === "interrupted" ? (
                      <Badge tone="warning" dot>
                        Gián đoạn
                      </Badge>
                    ) : (
                      <Badge tone="success" dot>
                        Hoàn tất
                      </Badge>
                    )}
                  </div>
                  <div className="rep-session-body">
                    <h2 className="t-heading-m">{activeReport.type}</h2>
                    <p className="t-body-s c-ink2 rep-tabular">
                      {activeReport.date} · Thời lượng {activeReport.duration} phút
                    </p>
                  </div>
                </section>

                {activeReport.status === "interrupted" ? (
                  <Callout tone="warning" title="Phiên phỏng vấn gián đoạn (A2)">
                    <p>
                      Phiên bị gián đoạn — kết quả không tính vào hồ sơ năng lực và không làm thay
                      đổi lộ trình học thích ứng.
                    </p>
                  </Callout>
                ) : (
                  <FullReport
                    key={activeReport.id}
                    report={activeReport}
                    requests={reviews[activeReport.id] ?? {}}
                    sendingId={sending?.reportId === activeReport.id ? sending.competencyId : null}
                    submitError={submitError}
                    onSubmit={(compId, reason) => void submitReview(compId, reason)}
                  />
                )}
              </>
            ) : (
              <section className="lc-pane rep-pane">
                <p className="empty" role="status">
                  Không tìm thấy báo cáo theo mã đã chọn. Hãy chọn một phiên trong lịch sử bên trái.
                </p>
              </section>
            )}

            <Link className="rep-roadmap t-strong" to="/roadmap">
              Xem lộ trình học <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
