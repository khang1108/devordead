import { Link, useNavigate } from "react-router-dom";
import { Badge, Button, Card, CardHead, PageHeader, ProgressBar, StatCard } from "../components/ui.jsx";
import { competencySummary, currentUser, dashboardStats, reports, roadmapItems } from "../data/mock.js";
import "./DashboardScreen.css";

const practiceLinks = [
  {
    to: "/practice/voice",
    title: "Luyện giọng nói",
    detail: "Indexing trong PostgreSQL",
    icon: "♫",
  },
  { to: "/problems/001", title: "Two Sum", detail: "Bài tập lập trình", icon: "{ }" },
  {
    to: "/interview/setup",
    title: "Phỏng vấn mô phỏng",
    detail: "HR hoặc kỹ thuật",
    icon: "↗",
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

  return (
    <div className="col stack-lg">
      <div className="dash-intro">
        <PageHeader
          eyebrow="01 — TỔNG QUAN"
          title={`Chào ${currentUser.name}`}
          subtitle={
            <>
              Mục tiêu {currentUser.role} · {currentUser.level} tại {currentUser.targetCompany}.
              {" "}Còn <strong>{currentUser.interviewInDays} ngày</strong> đến phỏng vấn.
            </>
          }
          actions={
            <Button variant="accent" onClick={() => navigate("/interview/setup")}>
              Bắt đầu phỏng vấn <span aria-hidden="true">↗</span>
            </Button>
          }
        />
      </div>

      <section className="grid dash-stats" aria-label="Số liệu luyện tập">
        {dashboardStats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </section>

      <div className="grid dash-columns">
        <Card>
          <CardHead title="Mức nắm competency" />
          <ul className="col dash-list dash-mastery">
            {competencySummary.map(({ name, mastery }) => (
              <li className="col stack-sm" key={name}>
                <div className="row between">
                  <span className="t-body-s t-strong">{name}</span>
                  <span className={`t-mono ${mastery < 0.4 ? "c-warning" : "c-brand"}`}>
                    {Math.round(mastery * 100)}%
                  </span>
                </div>
                <ProgressBar label={name} value={mastery} tone={mastery < 0.4 ? "warning" : "brand"} />
              </li>
            ))}
          </ul>
          <Link className="dash-link dash-footer-link" to="/knowledge">Xem kho tri thức →</Link>
        </Card>

        <Card>
          <CardHead title="Luyện tiếp" />
          <ul className="col stack-sm dash-list">
            {practiceLinks.map(({ to, title, detail, icon }) => (
              <li key={to}>
                <Link className="row dash-practice" to={to}>
                  <span className="dash-icon" aria-hidden="true">{icon}</span>
                  <span className="grow dash-item-text">
                    <span className="t-heading-s">{title}</span>
                    <span className="t-body-s c-ink2">{detail}</span>
                  </span>
                  <span className="c-brand" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHead title="Lộ trình tuần này" />
          <ol className="dash-list">
            {weeklyItems.map((item) => {
              const { label, tone } = priorities[item.priority];
              return (
                <li className="dash-list-item" key={item.id}>
                  <Link className="row between dash-entry" to={item.to}>
                    <span className="t-body-s t-strong">{item.title}</span>
                    <Badge tone={tone}>{label}</Badge>
                  </Link>
                </li>
              );
            })}
          </ol>
          <Link className="dash-link dash-footer-link" to="/roadmap">Xem lộ trình học →</Link>
        </Card>

        <Card>
          <CardHead title="Báo cáo gần đây" />
          <ul className="dash-list">
            {reports.map(({ id, type, date, status, overall }) => (
              <li className="dash-list-item" key={id}>
                <Link className="row between dash-entry" to={`/reports/${id}`}>
                  <span className="dash-item-text">
                    <span className="t-body-s t-strong">{type}</span>
                    <span className="t-body-s c-ink2">{date}</span>
                  </span>
                  {status === "interrupted" ? (
                    <Badge tone="warning">Gián đoạn</Badge>
                  ) : (
                    <span className="t-mono dash-score">
                      <strong>{overall.toFixed(1)}</strong> / 10
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
