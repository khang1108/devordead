import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import StudyCalendar from "@shared/components/StudyCalendar";
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  PageHeader,
  ProgressBar,
  Skeleton,
  StatCard,
} from "@shared/ui";
import { getErrorMessage } from "@shared/services/apiClient";
import { localStore } from "@shared/services/localStore";
import type { DashboardOverview, RoadmapPriority } from "@shared/types";
import { assessmentService } from "./assessment.service";
import "./DashboardScreen.css";

interface FeaturedTrack {
  to: string;
  tag: string;
  title: string;
  detail: string;
  cta: string;
  accent: "sky" | "emerald" | "slate";
  icon: ReactNode;
}

const FEATURED_TRACKS: readonly FeaturedTrack[] = [
  {
    to: "/practice/voice",
    tag: "UC05 · UC06",
    title: "Luyện giọng nói kỹ thuật",
    detail: "Trả lời câu hỏi mở qua micro · Phản hồi rubric AI ≤ 2,5s",
    cta: "Mở phòng luyện",
    accent: "sky",
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
    tag: "BR3 · Sandbox",
    title: "Luyện thuật toán Sandbox",
    detail: "Giải bài trên Monaco IDE · Chạy test trong Docker cô lập",
    cta: "Mở kho bài tập",
    accent: "emerald",
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
    tag: "15–45 phút",
    title: "Phỏng vấn mô phỏng AI",
    detail: "HR tiếng Anh (STAR) hoặc Technical Live Coding theo JD",
    cta: "Thiết lập phiên",
    accent: "slate",
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

const PRIORITIES: Record<RoadmapPriority, { order: number; label: string; diffClass: string }> = {
  high: { order: 0, label: "Cao", diffClass: "lc-diff--hard" },
  medium: { order: 1, label: "TB", diffClass: "lc-diff--medium" },
  low: { order: 2, label: "Thấp", diffClass: "c-ink2" },
};

// UC02, UC15 — Tổng quan luyện tập (LeetCode Study Overview + Right Calendar Rail)
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
            <Link className="btn btn--secondary" to="/problems/sandbox">
              Mở Sandbox IDE
            </Link>
            <Button variant="primary" onClick={() => navigate("/interview/setup")}>
              Bắt đầu phỏng vấn <span aria-hidden="true">↗</span>
            </Button>
          </div>
        }
      />

      <div className="lc-workspace">
        <div className="lc-workspace__main">
          {error && (
            <ErrorBanner
              title="Chưa tải được dữ liệu tổng quan từ máy chủ"
              message={error}
              onRetry={retry}
            />
          )}

          {loading ? (
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
          ) : (
            stats.length > 0 && (
              <section className="dash-ledger" aria-label="Số liệu luyện tập">
                {stats.map((stat) => (
                  <div className="dash-ledger-cell" key={stat.label}>
                    <StatCard {...stat} />
                  </div>
                ))}
              </section>
            )
          )}

          {/* 3-Column Featured Study Tracks */}
          <section className="dash-tracks" aria-label="Chặng luyện tập trọng tâm">
            {FEATURED_TRACKS.map((track) => (
              <Link
                key={track.to}
                to={track.to}
                className={`dash-track dash-track--${track.accent}`}
              >
                <span className="dash-track__strip" aria-hidden="true" />
                <div className="dash-track__top">
                  <span className="dash-track__icon" aria-hidden="true">
                    {track.icon}
                  </span>
                  <span className="t-mono dash-track__tag">{track.tag}</span>
                </div>
                <div className="dash-track__body">
                  <h2 className="dash-track__title">{track.title}</h2>
                  <p className="t-body-s c-ink2 dash-track__detail">{track.detail}</p>
                </div>
                <span className="dash-track__cta">
                  {track.cta} <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </section>

          {loading ? (
            <div className="dash-panels">
              <section className="lc-pane" aria-label="Đang tải mức nắm năng lực">
                <div className="lc-pane__head">
                  <span className="dash-pane-title">Mức nắm năng lực</span>
                </div>
                <div className="dash-rows">
                  {[0, 1, 2, 3].map((idx) => (
                    <div className="dash-comp-row col stack-sm" key={idx}>
                      <Skeleton width="64%" height={14} />
                      <Skeleton width="100%" height={4} />
                    </div>
                  ))}
                </div>
              </section>

              <section className="lc-pane" aria-label="Đang tải báo cáo gần đây">
                <div className="lc-pane__head">
                  <span className="dash-pane-title">Báo cáo gần đây</span>
                </div>
                <div className="dash-rows">
                  {[0, 1, 2].map((idx) => (
                    <div className="dash-comp-row col stack-sm" key={idx}>
                      <Skeleton width="58%" height={15} />
                      <Skeleton width="38%" height={13} />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : isEmptyDashboard ? (
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
          ) : (
            <div className="dash-panels">
              {/* Competency Mastery Pane */}
              <section className="lc-pane" aria-labelledby="dash-comp-heading">
                <div className="lc-pane__head">
                  <h2 id="dash-comp-heading" className="dash-pane-title">
                    Mức nắm năng lực
                  </h2>
                  {weakCount > 0 ? (
                    <Badge tone="warning" dot>
                      {weakCount} mục dưới 40%
                    </Badge>
                  ) : (
                    <span className="t-body-s c-ink2 dash-tabular">
                      {competencies.length} nhóm
                    </span>
                  )}
                </div>

                <div className="lc-pane__body">
                  {competencies.length > 0 ? (
                    <ul className="dash-rows">
                      {competencies.map(({ name, mastery }) => {
                        const isLow = mastery < 0.4;
                        const pct = Math.round(mastery * 100);
                        return (
                          <li className="dash-comp-row col stack-sm" key={name}>
                            <div className="row between wrap">
                              <span className="row stack-sm">
                                <span className="t-body-s t-strong">{name}</span>
                                {isLow && (
                                  <span className="lc-diff lc-diff--medium">Cần ôn ưu tiên</span>
                                )}
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
                        Chưa có dữ liệu mức nắm năng lực. Hoàn thành bài luyện đầu tiên để theo dõi
                        tiến độ theo từng chủ đề.
                      </p>
                    </div>
                  )}
                </div>

                <div className="lc-pane__foot">
                  <span>Mục tiêu phỏng vấn ≥ 70%</span>
                  <Link className="dash-foot-link" to="/knowledge">
                    Xem kho tri thức <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </section>

              {/* Recent Reports Zebra-Striped List Pane */}
              <section className="lc-pane" aria-labelledby="dash-reports-heading">
                <div className="lc-pane__head">
                  <h2 id="dash-reports-heading" className="dash-pane-title">
                    Báo cáo gần đây
                  </h2>
                  <span className="t-body-s c-ink2 dash-tabular">
                    {recentReports.length} phiên
                  </span>
                </div>

                <div className="lc-pane__body">
                  {recentReports.length > 0 ? (
                    <div className="lc-list dash-report-list" role="list">
                      {recentReports.map(({ id, type, date, duration, status, overall }) => (
                        <Link
                          key={id}
                          role="listitem"
                          className="lc-list__row dash-report-row"
                          to={`/reports/${id}`}
                        >
                          <span className="dash-item-text">
                            <span className="t-body-s t-strong">{type}</span>
                            <span className="t-body-s c-ink2 dash-tabular">
                              {date} · {duration} phút
                            </span>
                          </span>
                          {status === "interrupted" || overall === null ? (
                            <span className="lc-diff lc-diff--medium">Gián đoạn</span>
                          ) : (
                            <span className="t-mono dash-score dash-tabular">
                              <strong>{overall.toFixed(1)}</strong> / 10
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="dash-panel-empty">
                      <p className="t-body-s c-ink2">
                        Chưa có báo cáo phiên phỏng vấn nào. Kết quả chấm độc lập (BR2) sẽ hiển thị
                        tại đây sau khi hoàn tất phiên.
                      </p>
                    </div>
                  )}
                </div>

                <div className="lc-pane__foot">
                  <span>Đánh giá độc lập · BR2</span>
                  <Link className="dash-foot-link" to="/reports">
                    Tất cả báo cáo <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Right Rail: Real StudyCalendar + Target Role & Weekly Priority Summary */}
        <aside className="lc-rail-right" aria-label="Lịch học và lộ trình tuần này">
          <StudyCalendar />

          <section className="lc-pane dash-rail-card" aria-labelledby="dash-rail-goal">
            <div className="lc-pane__head">
              <h2 id="dash-rail-goal" className="dash-pane-title">
                Mục tiêu &amp; ưu tiên tuần
              </h2>
              <Link className="dash-head-link" to="/profile">
                Hồ sơ
              </Link>
            </div>

            <div className="dash-rail-target">
              <p className="t-body-s t-strong">
                {roleLabel} · {levelLabel}
              </p>
              <p className="t-body-s c-ink2">
                {companyLabel ? `Định hướng: ${companyLabel}` : "Chưa đặt công ty mục tiêu"}
              </p>
            </div>

            {loading ? (
              <div className="dash-rail-body">
                {[0, 1].map((idx) => (
                  <div className="dash-rail-item col stack-sm" key={idx}>
                    <Skeleton width="78%" height={14} />
                    <Skeleton width="54%" height={12} />
                  </div>
                ))}
              </div>
            ) : weeklyItems.length > 0 ? (
              <ol className="dash-rail-list">
                {weeklyItems.map((item) => {
                  const meta = PRIORITIES[item.priority];
                  return (
                    <li key={item.id}>
                      <Link className="dash-rail-item" to={item.to}>
                        <div className="row between stack-sm">
                          <span className="t-body-s t-strong dash-rail-title">{item.title}</span>
                          <span className={`lc-diff ${meta.diffClass}`}>{meta.label}</span>
                        </div>
                        <p className="t-body-s c-ink2 dash-rail-reason">{item.reason}</p>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="dash-rail-empty">
                <p className="t-body-s c-ink2">
                  Lộ trình ưu tiên trong tuần sẽ tự cập nhật sau phiên đánh giá đầu tiên.
                </p>
              </div>
            )}

            <div className="lc-pane__foot">
              <Link className="dash-foot-link" to="/profile">
                Cập nhật hồ sơ
              </Link>
              <Link className="dash-foot-link" to="/roadmap">
                Lộ trình học <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
