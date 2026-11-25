import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Card, CardHead, PageHeader, Tabs } from "../components/ui.jsx";
import { DIFFICULTY, ROADMAP_HUBS, roadmapItems } from "../data/mock.js";
import "./RoadmapScreen.css";

const typeLabels = {
  topic: "Topic",
  problem: "Bài tập",
  voice: "Giọng nói",
  interview: "Phỏng vấn",
};

const filters = [
  { value: "all", label: "Tất cả" },
  ...Object.entries(typeLabels).map(([value, label]) => ({ value, label })),
];

const priorities = {
  high: { rank: 0, label: "Cao", tone: "danger" },
  medium: { rank: 1, label: "TB", tone: "warning" },
  low: { rank: 2, label: "Thấp", tone: "neutral" },
};

const hubLabels = {
  done: "Đã hoàn thành",
  current: "Đang học",
  todo: "Chưa bắt đầu",
};

const hubNotes = [
  "Đã nắm vững HTTP/REST, Transaction ACID và chuẩn hóa cơ sở dữ liệu (đạt 74%).",
  "Đã hoàn thành Hash map, Stack và B-Tree cơ bản (đạt 72%).",
  "Trọng tâm hiện tại: bù điểm phân tích Big-O bộ nhớ phụ (5.0/10) và Sliding Window.",
  "Chặng kế tiếp: mở khóa Caching cơ bản với Redis, chiến lược TTL và Rate Limiter.",
];

const orderedItems = [...roadmapItems].sort(
  (a, b) => priorities[a.priority].rank - priorities[b.priority].rank,
);

function FlightStepper() {
  const defaultIdx = Math.max(
    0,
    ROADMAP_HUBS.findIndex(({ state }) => state === "current"),
  );
  const [selectedHub, setSelectedHub] = useState(defaultIdx);
  const completed = ROADMAP_HUBS.filter(({ state }) => state === "done").length;
  const activeHub = ROADMAP_HUBS[selectedHub] ?? ROADMAP_HUBS[0];

  return (
    <Card variant="flush" className="rm-flight">
      <div className="rm-flight-head">
        <CardHead title="Tiến độ lộ trình">
          <Badge tone="brand" dot>
            {completed}/{ROADMAP_HUBS.length} chặng hoàn thành
          </Badge>
        </CardHead>
      </div>

      <ol className="rm-stepper" role="list">
        {ROADMAP_HUBS.map(({ name, state }, idx) => {
          const isSelected = idx === selectedHub;
          return (
            <li
              className="rm-step"
              key={name}
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
                <span className="t-body-s c-ink2">{hubLabels[state]}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="row between wrap rm-stage-note" role="status">
        <p className="t-body-s c-ink2">
          <strong className="rm-stage-title">{activeHub.name}:</strong>{" "}
          {hubNotes[selectedHub]}
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
          {hubLabels[activeHub.state]}
        </Badge>
      </div>
    </Card>
  );
}

export default function RoadmapScreen() {
  const [filter, setFilter] = useState("all");
  const items = orderedItems.filter((item) => filter === "all" || item.type === filter);

  return (
    <div className="rm-screen col stack-lg">
      <PageHeader
        eyebrow="Lộ trình cá nhân"
        title="Lộ trình học thích ứng"
        subtitle="Cập nhật 22/11 dựa trên 3 phiên gần nhất"
        actions={
          <Link className="btn btn--secondary" to="/reports/r-2211">
            Xem báo cáo 22/11
          </Link>
        }
      />

      <FlightStepper />

      <section className="col stack-lg" aria-labelledby="rm-recommendations">
        <div className="col stack-sm">
          <div className="row between wrap">
            <h2 className="t-body-s t-strong c-ink2" id="rm-recommendations">
              Hoạt động đề xuất
            </h2>
            <p className="t-body-s c-ink2 rm-tabular" role="status">
              {items.length} hoạt động
            </p>
          </div>
          <Tabs tabs={filters} value={filter} onChange={setFilter} label="Loại hoạt động" />
        </div>

        {items.length === 0 ? (
          <Card className="rm-card">
            <p className="empty" role="status">Chưa có hoạt động đề xuất thuộc loại này.</p>
          </Card>
        ) : (
          <Card variant="flush" className="rm-card">
            <ul className="rm-list" role="list">
              {items.map((item) => {
                const priority = priorities[item.priority];
                const difficulty = DIFFICULTY[item.difficulty];

                return (
                  <li key={item.id} className="rm-row">
                    <div className="col grow stack-sm">
                      <div className="row wrap stack-sm">
                        <Badge tone={priority.tone} dot>
                          Ưu tiên {priority.label}
                        </Badge>
                        <Badge tone="neutral">{typeLabels[item.type]}</Badge>
                        <Badge tone={difficulty.tone} dot>{difficulty.label}</Badge>
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
    </div>
  );
}
