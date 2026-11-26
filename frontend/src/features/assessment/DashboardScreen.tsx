import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardHead,
  EmptyState,
  ErrorBanner,
  PageHeader,
  ProgressBar,
  Skeleton,
  StatCard,
} from "@shared/ui";
import { getErrorMessage } from "@shared/services/apiClient";
import { localStore } from "@shared/services/localStore";
import type { DashboardOverview, RoadmapPriority, Tone } from "@shared/types";
import { assessmentService } from "./assessment.service";
import "./DashboardScreen.css";

interface PracticeLinkItem {
  to: string;
  title: string;
  detail: string;
  icon: ReactNode;
}

const PRACTICE_LINKS: readonly PracticeLinkItem[] = [
  {
    to: "/practice/voice",
    title: "Luyện giọng nói",
    detail: "Trả lời câu hỏi kỹ thuật qua micro · Phản hồi AI ≤ 2,5s",
    icon: (
      <svg
        viewBox="0 0 20 20"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="7" y="2.5" width="6" height="9.5" rx="3" />
        <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5M7 17.5h6" />
      </svg>
    ),
  },
  {
    to: "/problems",
    title: "Bài tập lập trình",
    detail: "Giải thuật toán trên Monaco IDE · Docker Sandbox cô lập (BR3)",
    icon: (
      <svg
        viewBox="0 0 20 20"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m6.5 6.5-3.5 3.5 3.5 3.5M13.5 6.5l3.5 3.5-3.5 3.5M11.2 4.5l-2.4 11" />
      </svg>
    ),
  },
  {
    to: "/interview/setup",
    title: "Phỏng vấn mô phỏng",
    detail: "HR tiếng Anh hoặc Technical Live Coding (15–45 phút)",
    icon: (
      <svg
        viewBox="0 0 20 20"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M17.5 2.5 9.2 10.8M17.5 2.5l-5.2 15-3.1-6.7-6.7-3.1 15-5.2Z" />
      </svg>
    ),
  },
];

const PRIORITIES: Record<RoadmapPriority, { order: number; label: string; tone: Tone }> = {
  high: { order: 0, label: "Ưu tiên cao", tone: "danger" },
  medium: { order: 1, label: "Ưu tiên TB", tone: "warning" },
  low: { order: 2, label: "Ưu tiên thấp", tone: "neutral" },
};

function PracticeQuickPanel() {
  return (
    <Card className="card--flush dash-panel">
      <div className="dash-panel-head">
        <CardHead title="Luyện tiếp" />
      </div>

      <ul className="dash-rows">
        {PRACTICE_LINKS.map(({ to, title, detail, icon }) => (
          <li key={to}>
            <Link className="row dash-action-row" to={to}>
              <span className="dash-icon" aria-hidden="true">
                {icon}
              </span>
              <span className="grow dash-item-text">
                <span className="t-heading-s">{title}</span>
                <span className="t-body-s c-ink2">{detail}</span>
              </span>
              <span className="dash-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// UC02, UC15 — Tổng quan luyện tập
export default function DashboardScreen() {
  const navigate = useNavigate();
  const user = localStore.getUser();
  const targetProfile = localStore.getTargetProfile();

  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState<number>(0);

  const retry = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void assessmentService
      .getDashboard(controller.signal)
      .then((overview) => {
        if (!controller.signal.aborted) {
          setData(overview);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(err));
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [reloadTick]);

  const roleLabel = user?.role ?? targetProfile.role;
  const levelLabel = user?.level ?? targetProfile.level;
  const companyLabel = user?.targetCompany || targetProfile.targetCompany;

  const stats = data?.stats ?? [];
  const competencies = data?.competencies ?? [];
  const weeklyItems = [...(data?.roadmapHighlights ?? [])]
    .sort((a, b) => PRIORITIES[a.priority].order - PRIORITIES[b.priority].order)
    .slice(0, 3);
  const recentReports = data?.recentReports ?? [];
  const weakCount = competencies.filter((c) => c.mastery < 0.4).length;

  const isEmptyDashboard =
    !loading &&
    !error &&
    data !== null &&
    stats.length === 0 &&
    competencies.length === 0 &&
    weeklyItems.length === 0 &&
    recentReports.length === 0;

  return (
    <div className="col stack-lg dash-screen">
      <PageHeader
        eyebrow="Tổng quan"
        title={user?.name ? `Chào ${user.name}` : "Tổng quan luyện tập"}
        subtitle={
          <>
            Mục tiêu{" "}
            <strong>
              {roleLabel} · {levelLabel}
            </strong>
            {companyLabel ? (
              <>
                {" "}
                tại <strong>{companyLabel}</strong>
              </>
            ) : null}
            {typeof user?.interviewInDays === "number" ? (
              <>
                {" "}
                · Còn <strong className="dash-tabular">{user.interviewInDays} ngày</strong> tới
                phỏng vấn
              </>
            ) : null}
            {typeof user?.streakDays === "number" && user.streakDays > 0 ? (
              <>
                {" "}
                · Chuỗi <span className="dash-tabular">{user.streakDays} ngày</span> luyện liên tiếp
              </>
            ) : null}
            .
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

      {error && (
        <ErrorBanner
          title="Chưa tải được dữ liệu tổng quan từ máy chủ"
          message={error}
          onRetry={retry}
        />
      )}

      {loading ? (
        <>
          <section className="dash-ledger" aria-label="Đang tải số liệu luyện tập">
            {[0, 1, 2, 3].map((idx) => (
              <div className="dash-ledger-cell" key={idx}>
                <div className="stat">
                  <Skeleton width="55%" height={13} />
                  <Skeleton width="42%" height={30} />
                  <Skeleton width="72%" height={13} />
                </div>
              </div>
            ))}
          </section>

          <div className="grid dash-columns">
            <Card className="card--flush dash-panel">
              <div className="dash-panel-head">
                <CardHead title="Mức nắm năng lực" />
              </div>
              <div className="dash-rows">
                {[0, 1, 2, 3].map((idx) => (
                  <div className="dash-row col stack-sm" key={idx}>
                    <Skeleton width="64%" height={14} />
                    <Skeleton width="100%" height={6} />
                  </div>
                ))}
              </div>
            </Card>
            <PracticeQuickPanel />
          </div>
        </>
      ) : isEmptyDashboard ? (
        <div className="grid dash-columns">
          <EmptyState
            title="Chưa có dữ liệu luyện tập nào"
            description="Hãy bắt đầu một phiên luyện giọng nói, giải bài tập lập trình trong Sandbox hoặc chạy thử phỏng vấn mô phỏng để hệ thống xây dựng hồ sơ năng lực cho bạn."
            actions={
              <>
                <Link to="/interview/setup" className="btn btn--primary">
                  Bắt đầu phỏng vấn mô phỏng
                </Link>
                <Link to="/knowledge" className="btn btn--secondary">
                  Khám phá kho tri thức
                </Link>
              </>
            }
          />
          <PracticeQuickPanel />
        </div>
      ) : (
        <>
          {stats.length > 0 && (
            <section className="dash-ledger" aria-label="Số liệu luyện tập">
              {stats.map((stat) => (
                <div className="dash-ledger-cell" key={stat.label}>
                  <StatCard {...stat} />
                </div>
              ))}
            </section>
          )}

          <div className="grid dash-columns">
            <Card className="card--flush dash-panel">
              <div className="dash-panel-head">
                <CardHead title="Mức nắm năng lực">
                  {weakCount > 0 && (
                    <Badge tone="warning" dot>
                      {weakCount} mục dưới 40%
                    </Badge>
                  )}
                </CardHead>
              </div>

              {competencies.length > 0 ? (
                <ul className="dash-rows">
                  {competencies.map(({ name, mastery }) => {
                    const isLow = mastery < 0.4;
                    const pct = Math.round(mastery * 100);
                    return (
                      <li className="dash-row col stack-sm" key={name}>
                        <div className="row between wrap">
                          <span className="row stack-sm">
                            <span className="t-body-s t-strong">{name}</span>
                            {isLow && <span className="t-body-s c-warning">Cần ôn ưu tiên</span>}
                          </span>
                          <span
                            className={`t-mono dash-tabular ${isLow ? "c-warning" : "c-ink2"}`}
                          >
                            {pct}%
                          </span>
                        </div>
                        <div className="dash-bar-wrap">
                          <ProgressBar
                            label={name}
                            value={mastery}
                            tone={isLow ? "warning" : "brand"}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="dash-panel-empty">
                  <p className="t-body-s c-ink2">
                    Chưa có dữ liệu mức nắm năng lực. Hoàn thành bài luyện đầu tiên để theo dõi tiến
                    độ theo từng chủ đề.
                  </p>
                </div>
              )}

              <div className="dash-panel-foot">
                <Link className="dash-link" to="/knowledge">
                  Xem kho tri thức <span aria-hidden="true">→</span>
                </Link>
              </div>
            </Card>

            <PracticeQuickPanel />

            <Card className="card--flush dash-panel">
              <div className="dash-panel-head">
                <CardHead title="Lộ trình tuần này">
                  {weeklyItems.length > 0 && (
                    <span className="t-body-s c-ink2">{weeklyItems.length} mục ưu tiên</span>
                  )}
                </CardHead>
              </div>

              {weeklyItems.length > 0 ? (
                <ol className="dash-rows">
                  {weeklyItems.map((item) => {
                    const { label, tone } = PRIORITIES[item.priority];
                    return (
                      <li key={item.id}>
                        <Link className="row between dash-action-row" to={item.to}>
                          <span className="dash-item-text">
                            <span className="t-body-s t-strong">{item.title}</span>
                            <span className="t-body-s c-ink2">{item.reason}</span>
                          </span>
                          <Badge tone={tone} dot>
                            {label}
                          </Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="dash-panel-empty">
                  <p className="t-body-s c-ink2">
                    Chưa có đề xuất ưu tiên trong tuần. Lộ trình sẽ tự động cập nhật sau các phiên
                    đánh giá của bạn.
                  </p>
                </div>
              )}

              <div className="dash-panel-foot">
                <Link className="dash-link" to="/roadmap">
                  Xem lộ trình học <span aria-hidden="true">→</span>
                </Link>
              </div>
            </Card>

            <Card className="card--flush dash-panel">
              <div className="dash-panel-head">
                <CardHead title="Báo cáo gần đây" />
              </div>

              {recentReports.length > 0 ? (
                <ul className="dash-rows">
                  {recentReports.map(({ id, type, date, duration, status, overall }) => (
                    <li key={id}>
                      <Link className="row between dash-action-row" to={`/reports/${id}`}>
                        <span className="dash-item-text">
                          <span className="t-body-s t-strong">{type}</span>
                          <span className="t-body-s c-ink2 dash-tabular">
                            {date} · {duration} phút
                          </span>
                        </span>
                        {status === "interrupted" || overall === null ? (
                          <Badge tone="warning" dot>
                            Gián đoạn
                          </Badge>
                        ) : (
                          <span className="t-mono dash-score dash-tabular">
                            <strong>{overall.toFixed(1)}</strong> / 10
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="dash-panel-empty">
                  <p className="t-body-s c-ink2">
                    Chưa có báo cáo phiên phỏng vấn nào. Kết quả chấm độc lập (BR2) sẽ hiển thị tại
                    đây sau khi hoàn tất phiên.
                  </p>
                </div>
              )}

              <div className="dash-panel-foot">
                <Link className="dash-link" to="/reports">
                  Tất cả báo cáo <span aria-hidden="true">→</span>
                </Link>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
