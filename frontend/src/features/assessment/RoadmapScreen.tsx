import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Card,
  CardHead,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Skeleton,
  Tabs,
} from "@shared/ui";
import { DIFFICULTY_META } from "@shared/constants";
import { getErrorMessage } from "@shared/services/apiClient";
import type {
  RoadmapData,
  RoadmapHub,
  RoadmapHubState,
  RoadmapItemType,
  RoadmapPriority,
  Tone,
} from "@shared/types";
import { assessmentService } from "./assessment.service";
import "./RoadmapScreen.css";

type RoadmapFilter = "all" | RoadmapItemType;

const TYPE_LABELS: Record<RoadmapItemType, string> = {
  topic: "Topic",
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

const PRIORITIES: Record<RoadmapPriority, { rank: number; label: string; tone: Tone }> = {
  high: { rank: 0, label: "Cao", tone: "danger" },
  medium: { rank: 1, label: "TB", tone: "warning" },
  low: { rank: 2, label: "Thấp", tone: "neutral" },
};

const HUB_LABELS: Record<RoadmapHubState, string> = {
  done: "Đã hoàn thành",
  current: "Đang học",
  todo: "Chưa bắt đầu",
};

function FlightStepper({ hubs }: { hubs: readonly RoadmapHub[] }) {
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
    <Card className="card--flush rm-flight">
      <div className="rm-flight-head">
        <CardHead title="Tiến độ lộ trình">
          <Badge tone="brand" dot>
            {completed}/{hubs.length} chặng hoàn thành
          </Badge>
        </CardHead>
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
                <span className="t-heading-s">{name}</span>
                <span className="t-body-s c-ink2">{HUB_LABELS[state]}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="row between wrap rm-stage-note" role="status">
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
    </Card>
  );
}

// UC15 — Lộ trình học thích ứng dựa trên bằng chứng
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

  const isEmpty = !loading && !error && roadmap !== null && hubs.length === 0 && orderedItems.length === 0;

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

      {error && (
        <ErrorBanner
          title="Chưa tải được lộ trình học thích ứng"
          message={error}
          onRetry={retry}
        />
      )}

      {loading ? (
        <>
          <Card className="card--flush rm-flight">
            <div className="rm-flight-head">
              <Skeleton width="32%" height={16} />
            </div>
            <div className="rm-stepper">
              {[0, 1, 2, 3].map((idx) => (
                <div className="col" style={{ alignItems: "center", gap: 6 }} key={idx}>
                  <Skeleton width={16} height={16} />
                  <Skeleton width="72%" height={14} />
                  <Skeleton width="50%" height={12} />
                </div>
              ))}
            </div>
          </Card>
          <Card className="card--flush rm-card">
            <div className="rm-list">
              {[0, 1, 2].map((idx) => (
                <div className="rm-row" key={idx}>
                  <div className="col grow stack-sm">
                    <Skeleton width="42%" height={18} />
                    <Skeleton width="78%" height={14} />
                  </div>
                  <Skeleton width={96} height={36} />
                </div>
              ))}
            </div>
          </Card>
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
          <FlightStepper hubs={hubs} />

          <section className="col stack-lg" aria-labelledby="rm-recommendations">
            <div className="col stack-sm">
              <div className="row between wrap">
                <h2 className="t-body-s t-strong c-ink2" id="rm-recommendations">
                  Hoạt động đề xuất
                </h2>
                <p className="t-body-s c-ink2 rm-tabular" role="status">
                  {filteredItems.length} hoạt động
                </p>
              </div>
              <Tabs tabs={FILTERS} value={filter} onChange={setFilter} label="Loại hoạt động" />
            </div>

            {filteredItems.length === 0 ? (
              <Card className="rm-card">
                <p className="empty" role="status">
                  Chưa có hoạt động đề xuất thuộc loại này.
                </p>
              </Card>
            ) : (
              <Card className="card--flush rm-card">
                <ul className="rm-list" role="list">
                  {filteredItems.map((item) => {
                    const priority = PRIORITIES[item.priority];
                    const difficulty = DIFFICULTY_META[item.difficulty];

                    return (
                      <li key={item.id} className="rm-row">
                        <div className="col grow stack-sm">
                          <div className="row wrap stack-sm">
                            <Badge tone={priority.tone} dot>
                              Ưu tiên {priority.label}
                            </Badge>
                            <Badge tone="neutral">{TYPE_LABELS[item.type]}</Badge>
                            <Badge tone={difficulty.tone} dot>
                              {difficulty.label}
                            </Badge>
                          </div>
                          <h3 className="t-heading-s">{item.title}</h3>
                          <p className="t-body-s c-ink2">
                            <strong className="rm-why">Vì sao đề xuất:</strong> {item.reason}
                          </p>
                        </div>

                        <Link
                          className="btn btn--secondary rm-start"
                          to={item.to}
                          aria-label={`Bắt đầu ${item.title}`}
                        >
                          Bắt đầu <span aria-hidden="true">→</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}

            <p className="rm-note t-body-s c-ink2">
              Lộ trình dựa trên bằng chứng từ kết quả làm bài, không dựa trên phán đoán cảm tính.
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}
