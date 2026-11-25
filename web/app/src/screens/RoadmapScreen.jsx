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

const orderedItems = [...roadmapItems].sort(
  (a, b) => priorities[a.priority].rank - priorities[b.priority].rank,
);

function FlightPath() {
  const completed = ROADMAP_HUBS.filter(({ state }) => state === "done").length;

  return (
    <Card className="rm-flight">
      <CardHead title="Tuyến bay học tập">
        <Badge tone="brand">{completed}/{ROADMAP_HUBS.length} chặng hoàn thành</Badge>
      </CardHead>
      <ol className="rm-hubs" role="list">
        {ROADMAP_HUBS.map(({ name, state }) => (
          <li className="rm-hub" key={name} data-state={state} aria-current={state === "current" ? "step" : undefined}>
            <span className="rm-dot" aria-hidden="true" />
            <span className="t-heading-s">{name}</span>
            <span className="t-body-s c-ink2">{hubLabels[state]}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default function RoadmapScreen() {
  const [filter, setFilter] = useState("all");
  const items = orderedItems.filter((item) => filter === "all" || item.type === filter);

  return (
    <div className="rm-screen col stack-lg">
      <PageHeader eyebrow="07 — LỘ TRÌNH HỌC" title="Lộ trình học thích ứng" subtitle="Cập nhật 22/11 dựa trên 3 phiên gần nhất" />
      <FlightPath />

      <section className="col" aria-labelledby="rm-recommendations">
        <div className="row between wrap">
          <h2 className="t-mono c-ink2" id="rm-recommendations">Hoạt động đề xuất</h2>
          <p className="t-body-s c-ink2" role="status">{items.length} hoạt động</p>
        </div>
        <Tabs tabs={filters} value={filter} onChange={setFilter} label="Loại hoạt động" />
        {items.length === 0 ? (
          <Card><p className="empty" role="status">Chưa có hoạt động đề xuất thuộc loại này.</p></Card>
        ) : (
          <ul className="rm-items col" role="list">
            {items.map((item) => {
              const priority = priorities[item.priority];
              const difficulty = DIFFICULTY[item.difficulty];

              return (
                <Card as="li" key={item.id} className="rm-item">
                  <div className="col grow stack-sm">
                    <div className="row wrap stack-sm">
                      <Badge tone={priority.tone} dot>Ưu tiên {priority.label}</Badge>
                      <Badge tone="brand">{typeLabels[item.type]}</Badge>
                      <Badge tone={difficulty.tone}>{difficulty.label}</Badge>
                    </div>
                    <h3 className="t-heading-m">{item.title}</h3>
                  </div>
                  <div className="rm-reason col stack-sm">
                    <p className="t-mono c-brand">Vì sao đề xuất</p>
                    <p className="t-body-s c-ink2">{item.reason}</p>
                  </div>
                  <Link className="btn btn--secondary rm-start" to={item.to} aria-label={`Bắt đầu ${item.title}`}>
                    Bắt đầu <span aria-hidden="true">→</span>
                  </Link>
                </Card>
              );
            })}
          </ul>
        )}
        <p className="rm-note t-body-s c-ink2">Lộ trình dựa trên bằng chứng từ kết quả làm bài, không dựa trên phán đoán cảm tính.</p>
      </section>
    </div>
  );
}
