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

const testCases = [
  "Ví dụ chuẩn",
  "Cặp số ở giữa mảng",
  "Phần tử trùng nhau",
  "Mảng có số âm",
  "Mảng lớn sát giới hạn",
];

// Giữ yêu cầu đã gửi khi điều hướng giữa các màn trong phiên demo.
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

function Score({ label, score, note, children, className = "" }) {
  return (
    <div className={`rep-score col stack-sm ${className}`}>
      <h3 className="t-mono">{label}</h3>
      <p className="t-number">{score.toFixed(1)} <span className="t-body-s c-ink2">/ 10</span></p>
      {children}
      {note && <p className="t-body-s c-ink2">{note}</p>}
    </div>
  );
}

function Evidence({ correctness }) {
  const [tab, setTab] = useState("transcript");

  return (
    <Card>
      <CardHead title="Bằng chứng từ phiên" />
      <Tabs tabs={evidenceTabs} value={tab} onChange={setTab} label="Bằng chứng đánh giá" />
      {tab === "transcript" && (
        <ol className="rep-transcript col" role="list">
          {techScript.map(({ who, text }) => (
            <li key={text} className="rep-message" data-speaker={who}>
              <p className="t-mono c-brand">{who === "ai" ? "Người phỏng vấn AI" : "Bạn"}</p>
              <p className="t-body-s">{text}</p>
            </li>
          ))}
        </ol>
      )}
      {tab === "snapshot" && (
        <div className="col stack-sm">
          <p className="t-mono c-ink2">Two Sum · JavaScript · Bản dùng hash map</p>
          <pre className="code-block rep-code"><code>{twoSum}</code></pre>
        </div>
      )}
      {tab === "tests" && (
        <div className="col stack-sm">
          <p className="t-body-s c-ink2">Bản chạy đầu tiên đạt {correctness.passed}/{correctness.total} ca kiểm thử. Test 5 vượt giới hạn thời gian khi dùng vòng lặp lồng nhau.</p>
          <table className="table rep-tests">
            <thead><tr><th scope="col">Ca kiểm thử</th><th scope="col">Kết quả</th></tr></thead>
            <tbody>
              {testCases.map((test, index) => (
                <tr key={test}>
                  <td><strong>Test {index + 1}</strong> · {test}</td>
                  <td>
                    {index < correctness.passed ? (
                      <Badge tone="success" dot>Đạt</Badge>
                    ) : (
                      <Badge tone="warning" dot className="rep-table-badge">TLE · Quá thời gian</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function ReviewForm({ competency, sending, onCancel, onSubmit }) {
  const reasonInput = useRef(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => reasonInput.current?.focus(), []);

  function submit(event) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Nhập lý do yêu cầu đánh giá lại.");
      reasonInput.current?.focus();
      return;
    }
    onSubmit(competency.id, trimmed);
  }

  return (
    <form className="rep-review col" onSubmit={submit} noValidate aria-busy={sending}>
      <h3 className="t-mono c-brand">Yêu cầu đánh giá lại</h3>
      <p className="t-heading-s">{competency.name}</p>
      <Field
        ref={reasonInput}
        label="Lý do (bắt buộc)"
        multiline
        required
        placeholder="Mô tả phần đánh giá bạn muốn xem xét lại."
        value={reason}
        error={error}
        disabled={sending}
        onChange={(event) => {
          setReason(event.target.value);
          setError("");
        }}
      />
      <div className="row wrap stack-sm">
        <Button variant="accent" type="submit" disabled={sending}>
          {sending && <span className="spinner" aria-hidden="true" />}
          {sending ? "Đang gửi…" : "Gửi yêu cầu"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={sending}>Hủy</Button>
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
    { label: "Điểm mạnh", points: report.strengths, tone: "strength" },
    { label: "Cần cải thiện", points: report.weaknesses, tone: "improve" },
    { label: "Đề xuất", points: report.suggestions, tone: "suggest" },
  ];

  function submitReview(id, reason) {
    setLastRequested(id);
    onSubmit(id, reason);
  }

  return (
    <>
      <Card>
        <CardHead title="Điểm đánh giá"><RuleTag code="BR2">Chấm độc lập</RuleTag></CardHead>
        <div className="rep-scores grid">
          <Score label="Tổng quan" score={report.overall} className="rep-score-overall" />
          <Score label="Tính đúng của mã" score={report.correctness.score} note={report.correctness.note}>
            <div><Badge tone="brand">{report.correctness.passed}/{report.correctness.total} test đạt</Badge></div>
          </Score>
          <Score label="Lập luận" score={report.reasoning.score} note={report.reasoning.note} />
        </div>
      </Card>
      <Card className="rep-competencies">
        <CardHead title="Năng lực theo tiêu chí" />
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
          {lastRequested && requests[lastRequested] ? "Đã gửi yêu cầu đánh giá lại. Yêu cầu đang xử lý." : ""}
        </p>
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
            {report.competencies.map((item) => (
              <tr key={item.id} role="row" data-active={activeTarget?.id === item.id}>
                <th scope="row" role="rowheader">{item.name}</th>
                <td role="cell">
                  <span className="t-mono rep-score-label">{item.score.toFixed(1)} / 10</span>
                  <ProgressBar label={`Điểm ${item.name}`} value={item.score / 10} />
                </td>
                <td role="cell">{item.evidence}</td>
                <td role="cell">
                  <div className="col stack-sm">
                    {requests[item.id] && <Badge tone="brand" dot className="rep-review-state">Đang xử lý</Badge>}
                    <Button
                      variant="secondary"
                      className="rep-review-button"
                      disabled={Boolean(requests[item.id]) || Boolean(sendingId)}
                      aria-label={`Yêu cầu đánh giá lại: ${item.name}`}
                      onClick={(event) => {
                        reviewTrigger.current = event.currentTarget;
                        setTarget(item);
                      }}
                    >
                      Yêu cầu đánh giá lại
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="rep-summaries grid">
        {summaries.map(({ label, points, tone }) => (
          <Card key={label} variant="tight" className={`rep-summary rep-summary-${tone}`}>
            <CardHead title={label} />
            <ul className="col stack-sm">{points.map((point) => <li key={point} className="t-body-s">{point}</li>)}</ul>
          </Card>
        ))}
      </div>
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
    if (sending || reviews[report.id]?.[competencyId]) return;
    const reportId = report.id;
    setSending({ reportId, competencyId });
    timeout.current = window.setTimeout(() => {
      submittedReviews = {
        ...submittedReviews,
        [reportId]: { ...submittedReviews[reportId], [competencyId]: reason },
      };
      setReviews(submittedReviews);
      setSending(null);
    }, 1000);
  }

  return (
    <div className="rep-screen col stack-lg">
      <PageHeader
        eyebrow="06 — BÁO CÁO NĂNG LỰC"
        title="Báo cáo năng lực"
        subtitle="Xem điểm, nhận xét và bằng chứng theo từng phiên phỏng vấn."
      />
      <div className="rep-layout grid stack-lg">
        <Card variant="tight" className="rep-history">
          <CardHead title="Lịch sử phiên" />
          <nav aria-label="Báo cáo theo phiên" className="col stack-sm">
            {reports.map((item) => (
              <Link key={item.id} className="rep-report-link col stack-sm" to={`/reports/${item.id}`} aria-current={report?.id === item.id ? "page" : undefined}>
                <span className="t-strong">{item.type}</span>
                <span className="row wrap between stack-sm">
                  <span className="t-mono c-ink2">{item.date}</span>
                  {item.status === "interrupted" ? (
                    <Badge tone="warning" dot>Gián đoạn</Badge>
                  ) : (
                    <Badge tone="brand">{item.overall.toFixed(1)} / 10</Badge>
                  )}
                </span>
              </Link>
            ))}
          </nav>
        </Card>

        <div className="rep-detail col">
          {report ? (
            <>
              <Card className="rep-session">
                <p className="t-mono c-brand">Chi tiết phiên</p>
                <h2 className="t-heading-m">{report.type}</h2>
                <p className="t-body-s c-ink2">{report.date} · {report.duration} phút</p>
              </Card>
              {report.status === "interrupted" ? (
                <Callout tone="warning">Phiên bị gián đoạn — kết quả không tính vào hồ sơ năng lực</Callout>
              ) : report.competencies ? (
                <FullReport
                  key={report.id}
                  report={report}
                  requests={reviews[report.id] ?? {}}
                  sendingId={sending?.reportId === report.id ? sending.competencyId : null}
                  onSubmit={submitReview}
                />
              ) : (
                <Card>
                  <CardHead title="Điểm đánh giá" />
                  <Score label="Tổng quan" score={report.overall} note="Bản minh họa: chi tiết chỉ có ở báo cáo 22/11" className="rep-score-overall" />
                </Card>
              )}
            </>
          ) : (
            <Card><p className="empty" role="status">Không tìm thấy báo cáo. Hãy chọn một phiên trong lịch sử.</p></Card>
          )}
          <Link className="rep-roadmap t-strong" to="/roadmap">Xem lộ trình học →</Link>
        </div>
      </div>
    </div>
  );
}
