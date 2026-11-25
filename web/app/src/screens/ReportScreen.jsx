import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge, Button, Callout, Card, CardHead, Field, PageHeader, ProgressBar, RuleTag, Tabs } from "../components/ui.jsx";
import { reports, techScript } from "../data/mock.js";
import "./ReportScreen.css";

const evidenceTabs = [
  { value: "transcript", label: "Transcript" },
  { value: "snapshot", label: "Snapshot mã" },
  { value: "tests", label: "Kết quả test" },
];

const testCaseTelemetry = [
  { name: "Ví dụ chuẩn (nums = [2,7,11,15])", time: "12 ms", memory: "18.4 MB" },
  { name: "Cặp số ở giữa mảng", time: "14 ms", memory: "18.6 MB" },
  { name: "Phần tử trùng nhau (nums = [3,3])", time: "11 ms", memory: "18.5 MB" },
  { name: "Mảng có số âm và giá trị biên", time: "19 ms", memory: "19.1 MB" },
  { name: "Mảng lớn sát giới hạn (n = 10⁴)", time: "> 3000 ms", memory: "24.8 MB" },
];

// Lưu yêu cầu đã gửi giữa các lần chuyển màn trong phiên demo.
let submittedReviews = {};

const twoSum = `function twoSum(nums, target) {
  const seen = new Map();

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement), i];
    }
    seen.set(nums[i], i);
  }
}`;

function ScoreLedgerCell({ label, score, tone = "brand", badge, note }) {
  return (
    <div className="rep-score-cell col stack-sm">
      <div className="row between wrap">
        <h3 className="t-body-s t-strong c-ink2">{label}</h3>
        {badge}
      </div>
      <p className="t-number rep-tabular">
        {score.toFixed(1)} <span className="t-body-s c-ink2">/ 10</span>
      </p>
      <div className="rep-bar-wrap">
        <ProgressBar label={label} value={score / 10} tone={tone} />
      </div>
      {note && <p className="t-body-s c-ink2">{note}</p>}
    </div>
  );
}

function Evidence({ correctness }) {
  const [tab, setTab] = useState("transcript");

  return (
    <Card className="rep-card">
      <CardHead title="Bằng chứng từ phiên">
        <RuleTag code="BR1">Snapshot nguyên vẹn</RuleTag>
      </CardHead>

      <Tabs tabs={evidenceTabs} value={tab} onChange={setTab} label="Bằng chứng đánh giá" />

      {tab === "transcript" && (
        <ol className="rep-transcript" role="list">
          {techScript.map(({ who, text }, idx) => (
            <li key={text} className="rep-turn">
              <div className="row between">
                <span className="t-body-s t-strong">
                  {who === "ai" ? "Người phỏng vấn AI" : "Bạn"}
                </span>
                <span className="t-mono c-ink2 rep-tabular">#0{idx + 1}</span>
              </div>
              <p className="t-body-s c-ink2">{text}</p>
            </li>
          ))}
        </ol>
      )}

      {tab === "snapshot" && (
        <div className="col stack-sm">
          <p className="t-mono c-ink2">solution.js · JavaScript · Two Sum (30:00)</p>
          <pre className="code-block rep-code"><code>{twoSum}</code></pre>
        </div>
      )}

      {tab === "tests" && (
        <div className="col stack-sm">
          <p className="t-body-s c-ink2">
            Chấm tự động trong Docker Sandbox đạt{" "}
            <strong className="rep-tabular">{correctness.passed}/{correctness.total}</strong> ca kiểm thử. Test 5 vượt ngưỡng 3 giây (TLE) ở bản đầu dùng vòng lặp lồng nhau.
          </p>
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
                {testCaseTelemetry.map((tc, index) => (
                  <tr key={tc.name}>
                    <td>
                      <strong className="rep-tabular">Test {index + 1}</strong> · {tc.name}
                    </td>
                    <td className="t-mono c-ink2 rep-tabular">{tc.time}</td>
                    <td className="t-mono c-ink2 rep-tabular">{tc.memory}</td>
                    <td>
                      {index < correctness.passed ? (
                        <Badge tone="success" dot>Đạt</Badge>
                      ) : (
                        <Badge tone="warning" dot className="rep-table-badge">
                          TLE · Quá thời gian
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

function ReviewForm({ competency, sending, onCancel, onSubmit }) {
  const reasonInput = useRef(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    reasonInput.current?.focus();
  }, []);

  function submit(event) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Vui lòng nhập lý do yêu cầu đánh giá lại (E1).");
      reasonInput.current?.focus();
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
            <span className="t-mono c-ink2 rep-tabular">({competency.score.toFixed(1)} / 10)</span>
          </h3>
        </div>
        <RuleTag code="BR2">Chấm độc lập</RuleTag>
      </div>

      <p className="t-body-s c-ink2">Bằng chứng hiện tại: “{competency.evidence}”</p>

      <Field
        ref={reasonInput}
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
        <Button variant="primary" type="submit" disabled={sending}>
          {sending && <span className="spinner" aria-hidden="true" />}
          {sending ? "Đang gửi…" : "Gửi yêu cầu"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={sending}>
          Hủy
        </Button>
      </div>
    </form>
  );
}

function FullReport({ report, requests, sendingId, onSubmit }) {
  const [target, setTarget] = useState(null);
  const [lastRequested, setLastRequested] = useState(null);
  const reviewTrigger = useRef(null);
  const activeTarget = target && !requests[target.id] ? target : null;

  const summaries = [
    { label: "Điểm mạnh", points: report.strengths },
    { label: "Cần cải thiện", points: report.weaknesses },
    { label: "Đề xuất", points: report.suggestions },
  ];

  function submitReview(id, reason) {
    setLastRequested(id);
    onSubmit(id, reason);
  }

  return (
    <>
      <Card variant="flush" className="rep-card">
        <div className="rep-section-head">
          <CardHead title="Điểm đánh giá">
            <RuleTag code="BR2">Chấm độc lập</RuleTag>
          </CardHead>
        </div>

        <div className="rep-scores-ledger">
          <ScoreLedgerCell
            label="Tổng quan"
            score={report.overall}
            tone="brand"
            note="Tổng hợp từ kết quả thực thi mã và khả năng lập luận."
          />
          <ScoreLedgerCell
            label="Tính đúng của mã"
            score={report.correctness.score}
            tone="success"
            badge={
              <Badge tone="success" dot>
                {report.correctness.passed}/{report.correctness.total} test đạt
              </Badge>
            }
            note={report.correctness.note}
          />
          <ScoreLedgerCell
            label="Lập luận"
            score={report.reasoning.score}
            tone="brand"
            note={report.reasoning.note}
          />
        </div>
      </Card>

      <Card variant="flush" className="rep-competencies rep-card">
        <div className="rep-section-head">
          <CardHead title="Năng lực theo tiêu chí">
            <span className="t-body-s c-ink2">Mỗi tiêu chí tối đa 1 yêu cầu (E2)</span>
          </CardHead>
        </div>

        {activeTarget && (
          <ReviewForm
            key={activeTarget.id}
            competency={activeTarget}
            sending={sendingId === activeTarget.id}
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
                <th scope="col" role="columnheader">Năng lực</th>
                <th scope="col" role="columnheader">Điểm</th>
                <th scope="col" role="columnheader">Bằng chứng</th>
                <th scope="col" role="columnheader">Đánh giá lại</th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {report.competencies.map((item) => {
                const submittedReason = requests[item.id];
                const barTone =
                  item.score < 6 ? "warning" : item.score >= 8 ? "success" : "brand";
                return (
                  <tr key={item.id} role="row" data-active={activeTarget?.id === item.id}>
                    <th scope="row" role="rowheader">{item.name}</th>
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
                        {submittedReason && (
                          <Badge tone="brand" dot className="rep-review-state">
                            Đang xử lý
                          </Badge>
                        )}
                        <Button
                          variant="secondary"
                          className="rep-review-button"
                          disabled={Boolean(submittedReason) || Boolean(sendingId)}
                          aria-label={`Yêu cầu đánh giá lại: ${item.name}`}
                          onClick={(event) => {
                            reviewTrigger.current = event.currentTarget;
                            setTarget(item);
                          }}
                        >
                          {submittedReason ? "Đã gửi yêu cầu" : "Yêu cầu đánh giá lại"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card variant="flush" className="rep-card">
        <div className="rep-summaries-ledger">
          {summaries.map(({ label, points }) => (
            <div key={label} className="rep-summary-col col stack-sm">
              <h3 className="t-body-s t-strong">{label}</h3>
              <ul className="col stack-sm">
                {points.map((point) => (
                  <li key={point} className="t-body-s c-ink2">{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Evidence correctness={report.correctness} />
    </>
  );
}

export default function ReportScreen() {
  const { id } = useParams();
  const report = id ? reports.find((item) => item.id === id) : reports[0];
  const [reviews, setReviews] = useState(() => submittedReviews);
  const [sending, setSending] = useState(null);
  const timeout = useRef(null);

  useEffect(() => () => window.clearTimeout(timeout.current), []);

  function submitReview(competencyId, reason) {
    if (!report || sending || reviews[report.id]?.[competencyId]) return;
    const reportId = report.id;
    setSending({ reportId, competencyId });
    timeout.current = window.setTimeout(() => {
      submittedReviews = {
        ...submittedReviews,
        [reportId]: { ...submittedReviews[reportId], [competencyId]: reason },
      };
      setReviews(submittedReviews);
      setSending(null);
    }, 900);
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

      <div className="rep-layout grid stack-lg">
        <Card variant="flush" className="rep-history rep-card">
          <div className="rep-history-head">
            <CardHead title="Lịch sử phiên">
              <span className="t-body-s c-ink2 rep-tabular">{reports.length}</span>
            </CardHead>
          </div>

          <nav aria-label="Báo cáo theo phiên" className="rep-history-list">
            {reports.map((item) => {
              const isCurrent = report?.id === item.id;
              return (
                <Link
                  key={item.id}
                  className="rep-report-link col stack-sm"
                  to={`/reports/${item.id}`}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  <span className="t-strong">{item.type}</span>
                  <span className="row wrap between stack-sm">
                    <span className="t-body-s c-ink2 rep-tabular">
                      {item.date} · {item.duration}p
                    </span>
                    {item.status === "interrupted" ? (
                      <Badge tone="warning" dot>Gián đoạn</Badge>
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
        </Card>

        <div className="rep-detail col">
          {report ? (
            <>
              <Card className="rep-session rep-card">
                <div className="row between wrap">
                  <span className="t-mono c-ink2 rep-tabular">#{report.id}</span>
                  {report.status === "interrupted" ? (
                    <Badge tone="warning" dot>Gián đoạn</Badge>
                  ) : (
                    <Badge tone="success" dot>Hoàn tất</Badge>
                  )}
                </div>
                <h2 className="t-heading-m">{report.type}</h2>
                <p className="t-body-s c-ink2 rep-tabular">
                  {report.date} · Thời lượng {report.duration} phút
                </p>
              </Card>

              {report.status === "interrupted" ? (
                <Callout tone="warning" title="Phiên phỏng vấn gián đoạn (A2)">
                  <p>
                    Phiên bị gián đoạn — kết quả không tính vào hồ sơ năng lực và không làm thay đổi lộ trình học thích ứng.
                  </p>
                </Callout>
              ) : report.competencies ? (
                <FullReport
                  key={report.id}
                  report={report}
                  requests={reviews[report.id] ?? {}}
                  sendingId={sending?.reportId === report.id ? sending.competencyId : null}
                  onSubmit={submitReview}
                />
              ) : (
                <Card variant="flush" className="rep-card">
                  <div className="rep-section-head">
                    <CardHead title="Điểm đánh giá" />
                  </div>
                  <div className="rep-single-score">
                    <ScoreLedgerCell
                      label="Tổng quan"
                      score={report.overall}
                      tone="brand"
                      note="Bản minh họa: chi tiết chỉ có ở báo cáo 22/11."
                    />
                    <div className="rep-single-cta">
                      <Link className="btn btn--secondary" to="/reports/r-2211">
                        Mở báo cáo chi tiết 22/11 <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card className="rep-card">
              <p className="empty" role="status">
                Không tìm thấy báo cáo. Hãy chọn một phiên trong lịch sử bên trái.
              </p>
            </Card>
          )}

          <Link className="rep-roadmap t-strong" to="/roadmap">
            Xem lộ trình học <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
