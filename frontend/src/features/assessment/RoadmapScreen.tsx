import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StudyCalendar from "@shared/components/StudyCalendar";
import { Badge, EmptyState, ErrorBanner, PageHeader, Skeleton } from "@shared/ui";
import { DIFFICULTY_META } from "@shared/constants";
import { getErrorMessage } from "@shared/services/apiClient";
import type {
  Difficulty,
  RoadmapData,
  RoadmapHub,
  RoadmapHubState,
  RoadmapItemType,
  RoadmapPriority,
} from "@shared/types";
import { assessmentService } from "./assessment.service";
import "./RoadmapScreen.css";

type RoadmapFilter = "all" | RoadmapItemType;

const TYPE_LABELS: Record<RoadmapItemType, string> = {
  topic: "Chủ đề",
  problem: "Bài tập",
  voice: "Giọng nói",
  interview: "Phỏng vấn",
};

const FILTERS: readonly { value: RoadmapFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "topic", label: TYPE_LABELS.topic },
  { value: "problem", label: TYPE_LABELS.problem },
  { value: "voice", label: TYPE_LABELS.voice },
  { value: "interview", label: TYPE_LABELS.interview },
];

const PRIORITIES: Record<RoadmapPriority, { rank: number; label: string; diffClass: string }> = {
  high: { rank: 0, label: "Ưu tiên cao", diffClass: "lc-diff--hard" },
  medium: { rank: 1, label: "Ưu tiên TB", diffClass: "lc-diff--medium" },
  low: { rank: 2, label: "Ưu tiên thấp", diffClass: "c-ink2" },
};

const DIFF_CLASS: Record<Difficulty, string> = {
  easy: "lc-diff--easy",
  medium: "lc-diff--medium",
  hard: "lc-diff--hard",
};

const HUB_LABELS: Record<RoadmapHubState, string> = {
  done: "Đã hoàn thành",
  current: "Đang học",
  todo: "Chưa bắt đầu",
};

function MilestoneStepper({ hubs }: { hubs: readonly RoadmapHub[] }) {
  const defaultIdx = Math.max(
    0,
    hubs.findIndex(({ state }) => state === "current"),
  );
  const [selectedHub, setSelectedHub] = useState<number>(defaultIdx);

  useEffect(() => {
    const idx = Math.max(
      0,
      hubs.findIndex(({ state }) => state === "current"),
    );
    setSelectedHub(idx);
  }, [hubs]);

  if (hubs.length === 0) return null;

  const completed = hubs.filter(({ state }) => state === "done").length;
  const activeHub = hubs[selectedHub] ?? hubs[0];
  if (!activeHub) return null;

  return (
    <section className="lc-pane rm-flight" aria-label="Các chặng lộ trình">
      <div className="lc-pane__head">
        <span className="rm-pane-title">Tiến độ lộ trình</span>
        <Badge tone="brand" dot>
          {completed}/{hubs.length} chặng hoàn thành
        </Badge>
      </div>

      <ol className="rm-stepper" role="list">
        {hubs.map(({ name, state }, idx) => {
          const isSelected = idx === selectedHub;
          return (
            <li
              className="rm-step"
              key={`${name}-${idx}`}
              data-state={state}
              data-selected={isSelected}
              aria-current={state === "current" ? "step" : undefined}
            >
              <button
                type="button"
                className="rm-step-btn"
                aria-pressed={isSelected}
                onClick={() => setSelectedHub(idx)}
              >
                <span className="rm-dot" aria-hidden="true" />
                <span className="rm-step-name">{name}</span>
                <span className="t-body-s c-ink2 rm-step-sub">{HUB_LABELS[state]}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="lc-pane__foot rm-stage-note" role="status">
        <p className="t-body-s c-ink2">
          <strong className="rm-stage-title">{activeHub.name}:</strong>{" "}
          {activeHub.summary || `Trạng thái hiện tại: ${HUB_LABELS[activeHub.state]}.`}
        </p>
        <Badge
          tone={
            activeHub.state === "done"
              ? "success"
              : activeHub.state === "current"
                ? "warning"
                : "neutral"
          }
          dot
        >
          {HUB_LABELS[activeHub.state]}
        </Badge>
      </div>
    </section>
  );
}

// UC15 — Lộ trình học thích ứng dựa trên bằng chứng (LeetCode Study Plan Layout)
export default function RoadmapScreen() {
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState<number>(0);
  const [filter, setFilter] = useState<RoadmapFilter>("all");

  const retry = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void assessmentService
      .getRoadmap(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setRoadmap(data);
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

  const orderedItems = [...(roadmap?.items ?? [])].sort(
    (a, b) => PRIORITIES[a.priority].rank - PRIORITIES[b.priority].rank,
  );
  const filteredItems = orderedItems.filter((item) => filter === "all" || item.type === filter);
  const hubs = roadmap?.hubs ?? [];

  const countByType = (value: RoadmapFilter) =>
    value === "all"
      ? orderedItems.length
      : orderedItems.filter((item) => item.type === value).length;

  const highCount = orderedItems.filter((i) => i.priority === "high").length;
  const mediumCount = orderedItems.filter((i) => i.priority === "medium").length;

  const isEmpty =
    !loading && !error && roadmap !== null && hubs.length === 0 && orderedItems.length === 0;

  return (
    <div className="rm-screen col stack-lg">
      <PageHeader
        eyebrow="Lộ trình cá nhân"
        title="Lộ trình học thích ứng"
        subtitle={
          roadmap?.updatedAt
            ? `Cập nhật ${roadmap.updatedAt} dựa trên kết quả đánh giá năng lực gần nhất.`
            : "Tự động ưu tiên chủ đề, bài tập và phiên phỏng vấn theo bằng chứng năng lực."
        }
        actions={
          <Link className="btn btn--secondary" to="/reports">
            Xem báo cáo năng lực
          </Link>
        }
      />

      <div className="lc-workspace">
        <div className="lc-workspace__main">
          {error && (
            <ErrorBanner
              title="Chưa tải được lộ trình học thích ứng"
              message={error}
              onRetry={retry}
            />
          )}

          {loading ? (
            <>
              <section className="lc-pane rm-flight" aria-label="Đang tải tiến độ lộ trình">
                <div className="lc-pane__head">
                  <Skeleton width="32%" height={14} />
                </div>
                <div className="rm-stepper">
                  {[0, 1, 2, 3].map((idx) => (
                    <div className="col" style={{ alignItems: "center", gap: 6 }} key={idx}>
                      <Skeleton width={14} height={14} />
                      <Skeleton width="72%" height={14} />
                      <Skeleton width="50%" height={12} />
                    </div>
                  ))}
                </div>
              </section>

              <div className="lc-list" aria-label="Đang tải hoạt động đề xuất">
                {[0, 1, 2, 3].map((idx) => (
                  <div className="lc-list__row rm-row" key={idx}>
                    <div className="col grow stack-sm">
                      <Skeleton width="42%" height={16} />
                      <Skeleton width="78%" height={13} />
                    </div>
                    <Skeleton width={68} height={16} />
                    <Skeleton width={82} height={16} />
                    <Skeleton width={76} height={28} />
                  </div>
                ))}
              </div>
            </>
          ) : isEmpty ? (
            <EmptyState
              title="Chưa có lộ trình học cá nhân hóa"
              description="Hãy hoàn thành ít nhất một phiên phỏng vấn mô phỏng hoặc luyện giọng nói để hệ thống phân tích điểm yếu và đề xuất lộ trình thích ứng."
              actions={
                <>
                  <Link to="/interview/setup" className="btn btn--primary">
                    Bắt đầu phỏng vấn mô phỏng
                  </Link>
                  <Link to="/knowledge" className="btn btn--secondary">
                    Mở kho tri thức
                  </Link>
                </>
              }
            />
          ) : roadmap ? (
            <>
              <MilestoneStepper hubs={hubs} />

              <section className="col rm-tasks-section" aria-labelledby="rm-recommendations">
                <div className="row between wrap rm-filter-bar">
                  <div className="lc-pills" role="group" aria-label="Lọc theo loại hoạt động">
                    {FILTERS.map(({ value, label }) => {
                      const active = filter === value;
                      const count = countByType(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          className={`lc-pill ${active ? "is-active" : ""}`.trim()}
                          aria-pressed={active}
                          onClick={() => setFilter(value)}
                        >
                          <span>{label}</span>
                          <span className="lc-pill__count">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="t-body-s c-ink2 rm-tabular" id="rm-recommendations" role="status">
                    {filteredItems.length} hoạt động
                  </p>
                </div>

                {filteredItems.length === 0 ? (
                  <section className="lc-pane">
                    <p className="empty" role="status">
                      Chưa có hoạt động đề xuất thuộc loại này.
                    </p>
                  </section>
                ) : (
                  <div className="lc-list rm-list" role="list">
                    <div className="lc-list__head rm-list-grid" aria-hidden="true">
                      <span>Hoạt động &amp; lý do đề xuất</span>
                      <span>Loại</span>
                      <span>Ưu tiên</span>
                      <span>Độ khó</span>
                      <span className="rm-col-right">Thao tác</span>
                    </div>

                    {filteredItems.map((item) => {
                      const priority = PRIORITIES[item.priority];
                      const difficulty = DIFFICULTY_META[item.difficulty];

                      return (
                        <div key={item.id} role="listitem" className="lc-list__row rm-list-grid rm-row">
                          <div className="rm-task-main">
                            <Link className="rm-task-title" to={item.to}>
                              {item.title}
                            </Link>
                            <p className="t-body-s c-ink2 rm-task-reason">
                              <strong className="rm-why">Vì sao đề xuất:</strong> {item.reason}
                            </p>
                          </div>

                          <span className="t-body-s c-ink2 rm-type-label">
                            {TYPE_LABELS[item.type]}
                          </span>

                          <span className={`lc-diff ${priority.diffClass}`}>
                            {priority.label}
                          </span>

                          <span className={`lc-diff ${DIFF_CLASS[item.difficulty]}`}>
                            {difficulty.label}
                          </span>

                          <div className="rm-col-right">
                            <Link
                              className="rm-start-link"
                              to={item.to}
                              aria-label={`Bắt đầu ${item.title}`}
                            >
                              Bắt đầu <span aria-hidden="true">→</span>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>

        {/* Right Rail: StudyCalendar + Evidence Note */}
        <aside className="lc-rail-right" aria-label="Lịch học và ghi chú bằng chứng">
          <StudyCalendar />

          <section className="lc-pane rm-evidence-pane" aria-labelledby="rm-evidence-heading">
            <div className="lc-pane__head">
              <h2 id="rm-evidence-heading" className="rm-pane-title">
                Nguyên tắc đề xuất
              </h2>
              <span className="t-mono c-ink2">UC15</span>
            </div>

            <div className="rm-evidence-body">
              <p className="t-body-s c-ink2">
                Lộ trình dựa trên bằng chứng từ kết quả làm bài, không dựa trên phán đoán cảm tính.
              </p>

              {orderedItems.length > 0 && (
                <dl className="rm-evidence-stats">
                  <div className="kv">
                    <dt>Ưu tiên cao</dt>
                    <dd className="lc-diff--hard">{highCount} mục</dd>
                  </div>
                  <div className="kv">
                    <dt>Ưu tiên trung bình</dt>
                    <dd className="lc-diff--medium">{mediumCount} mục</dd>
                  </div>
                  <div className="kv">
                    <dt>Tổng hoạt động</dt>
                    <dd>{orderedItems.length} mục</dd>
                  </div>
                </dl>
              )}
            </div>

            <div className="lc-pane__foot">
              <Link className="rm-rail-link" to="/knowledge">
                Kho tri thức
              </Link>
              <Link className="rm-rail-link" to="/reports">
                Báo cáo năng lực <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
