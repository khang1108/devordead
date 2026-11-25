import { Link, useNavigate } from "react-router-dom";
import { Badge, Button, Card, CardHead, PageHeader, ProgressBar, StatCard } from "../components/ui.jsx";
import { competencySummary, currentUser, dashboardStats, reports, roadmapItems } from "../data/mock.js";
import "./DashboardScreen.css";

const practiceLinks = [
  {
    to: "/practice/voice",
    title: "Luyện giọng nói",
    detail: "Indexing trong PostgreSQL · Phản hồi ≤ 2,5s",
    icon: (
      <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="7" y="2.5" width="6" height="9.5" rx="3" />
        <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5M7 17.5h6" />
      </svg>
    ),
  },
  {
    to: "/problems/001",
    title: "Two Sum",
    detail: "Bài tập lập trình · Hash map · 5 test sandbox",
    icon: (
      <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m6.5 6.5-3.5 3.5 3.5 3.5M13.5 6.5l3.5 3.5-3.5 3.5M11.2 4.5l-2.4 11" />
      </svg>
    ),
  },
  {
    to: "/interview/setup",
    title: "Phỏng vấn mô phỏng",
    detail: "HR tiếng Anh hoặc Technical Live Coding (15–45 phút)",
    icon: (
      <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17.5 2.5 9.2 10.8M17.5 2.5l-5.2 15-3.1-6.7-6.7-3.1 15-5.2Z" />
      </svg>
    ),
  },
];

const priorities = {
  high: { order: 0, label: "Ưu tiên cao", tone: "danger" },
  medium: { order: 1, label: "Ưu tiên TB", tone: "warning" },
  low: { order: 2, label: "Ưu tiên thấp", tone: "neutral" },
};

const weeklyItems = [...roadmapItems]
  .sort((a, b) => priorities[a.priority].order - priorities[b.priority].order)
  .slice(0, 3);

export default function DashboardScreen() {
  const navigate = useNavigate();
  const weakCount = competencySummary.filter((c) => c.mastery < 0.4).length;

  return (
    <div className="col stack-lg dash-screen">
      <PageHeader
        eyebrow="Tổng quan"
        title={`Chào ${currentUser.name}`}
        subtitle={
          <>
            Mục tiêu <strong>{currentUser.role} · {currentUser.level}</strong> tại{" "}
            <strong>{currentUser.targetCompany}</strong> · Còn{" "}
            <strong className="dash-tabular">{currentUser.interviewInDays} ngày</strong> tới phỏng vấn · Chuỗi{" "}
            <span className="dash-tabular">{currentUser.streakDays} ngày</span> luyện liên tiếp.
          </>
        }
        actions={
          <div className="row wrap dash-header-actions">
            <Link className="btn btn--secondary" to="/profile">
              Hồ sơ mục tiêu
            </Link>
            <Button variant="primary" onClick={() => navigate("/interview/setup")}>
              Bắt đầu phỏng vấn <span aria-hidden="true">↗</span>
            </Button>
          </div>
        }
      />

      <section className="dash-ledger" aria-label="Số liệu luyện tập">
        {dashboardStats.map((stat) => (
          <div className="dash-ledger-cell" key={stat.label}>
            <StatCard {...stat} />
          </div>
        ))}
      </section>

      <div className="grid dash-columns">
        <Card variant="flush" className="dash-panel">
          <div className="dash-panel-head">
            <CardHead title="Mức nắm năng lực">
              {weakCount > 0 && (
                <Badge tone="warning" dot>
                  {weakCount} mục dưới 40%
                </Badge>
              )}
            </CardHead>
          </div>

          <ul className="dash-rows">
            {competencySummary.map(({ name, mastery }) => {
              const isLow = mastery < 0.4;
              const pct = Math.round(mastery * 100);
              return (
                <li className="dash-row col stack-sm" key={name}>
                  <div className="row between wrap">
                    <span className="row stack-sm">
                      <span className="t-body-s t-strong">{name}</span>
                      {isLow && <span className="t-body-s c-warning">Cần ôn ưu tiên</span>}
                    </span>
                    <span className={`t-mono dash-tabular ${isLow ? "c-warning" : "c-ink2"}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="dash-bar-wrap">
                    <ProgressBar label={name} value={mastery} tone={isLow ? "warning" : "brand"} />
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="dash-panel-foot">
            <Link className="dash-link" to="/knowledge">
              Xem kho tri thức <span aria-hidden="true">→</span>
            </Link>
          </div>
        </Card>

        <Card variant="flush" className="dash-panel">
          <div className="dash-panel-head">
            <CardHead title="Luyện tiếp" />
          </div>

          <ul className="dash-rows">
            {practiceLinks.map(({ to, title, detail, icon }) => (
              <li key={to}>
                <Link className="row dash-action-row" to={to}>
                  <span className="dash-icon" aria-hidden="true">{icon}</span>
                  <span className="grow dash-item-text">
                    <span className="t-heading-s">{title}</span>
                    <span className="t-body-s c-ink2">{detail}</span>
                  </span>
                  <span className="dash-arrow" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card variant="flush" className="dash-panel">
          <div className="dash-panel-head">
            <CardHead title="Lộ trình tuần này">
              <span className="t-body-s c-ink2">3 mục ưu tiên</span>
            </CardHead>
          </div>

          <ol className="dash-rows">
            {weeklyItems.map((item) => {
              const { label, tone } = priorities[item.priority];
              return (
                <li key={item.id}>
                  <Link className="row between dash-action-row" to={item.to}>
                    <span className="dash-item-text">
                      <span className="t-body-s t-strong">{item.title}</span>
                      <span className="t-body-s c-ink2">{item.reason}</span>
                    </span>
                    <Badge tone={tone} dot>{label}</Badge>
                  </Link>
                </li>
              );
            })}
          </ol>

          <div className="dash-panel-foot">
            <Link className="dash-link" to="/roadmap">
              Xem lộ trình học <span aria-hidden="true">→</span>
            </Link>
          </div>
        </Card>

        <Card variant="flush" className="dash-panel">
          <div className="dash-panel-head">
            <CardHead title="Báo cáo gần đây" />
          </div>

          <ul className="dash-rows">
            {reports.map(({ id, type, date, duration, status, overall }) => (
              <li key={id}>
                <Link className="row between dash-action-row" to={`/reports/${id}`}>
                  <span className="dash-item-text">
                    <span className="t-body-s t-strong">{type}</span>
                    <span className="t-body-s c-ink2 dash-tabular">
                      {date} · {duration} phút
                    </span>
                  </span>
                  {status === "interrupted" ? (
                    <Badge tone="warning" dot>Gián đoạn</Badge>
                  ) : (
                    <span className="t-mono dash-score dash-tabular">
                      <strong>{overall.toFixed(1)}</strong> / 10
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <div className="dash-panel-foot">
            <Link className="dash-link" to="/reports">
              Tất cả báo cáo <span aria-hidden="true">→</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
