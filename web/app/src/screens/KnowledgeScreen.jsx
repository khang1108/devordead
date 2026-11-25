import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, CardHead, Chip, Field, PageHeader, ProgressBar, RuleTag } from "../components/ui.jsx";
import { currentUser, knowledgeTree } from "../data/mock.js";
import "./KnowledgeScreen.css";

function normalizeSearch(text) {
  return text
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replaceAll("đ", "d");
}

function getMasteryMeta(mastery) {
  if (mastery === 0) return { label: "Chưa luyện", tone: "warning", textClass: "c-warning" };
  if (mastery < 0.4) return { label: "Cần ôn", tone: "warning", textClass: "c-warning" };
  if (mastery >= 0.7) return { label: "Nắm vững", tone: "success", textClass: "c-success" };
  return { label: "Đang tiến bộ", tone: "brand", textClass: "c-ink2" };
}

const totalTopicsCount = knowledgeTree.reduce((sum, d) => sum + d.topics.length, 0);

export default function KnowledgeScreen() {
  const navigate = useNavigate();
  const treeId = useId();
  const [search, setSearch] = useState("");
  const [jdOnly, setJdOnly] = useState(false);
  const [unpracticedOnly, setUnpracticedOnly] = useState(false);
  const [expandedDomains, setExpandedDomains] = useState(null);
  const [selectedId, setSelectedId] = useState(knowledgeTree[0].topics[0].id);
  const [focusedId, setFocusedId] = useState(null);

  const query = normalizeSearch(search.trim());
  const filtering = Boolean(query || jdOnly || unpracticedOnly);

  const domains = knowledgeTree
    .map((domain) => ({
      ...domain,
      topics: domain.topics.filter(
        (topic) =>
          (normalizeSearch(topic.name).includes(query) ||
            normalizeSearch(topic.short || "").includes(query)) &&
          (!jdOnly || topic.jd) &&
          (!unpracticedOnly || topic.practiced === 0),
      ),
    }))
    .filter((domain) => domain.topics.length > 0);

  const defaultDomain =
    knowledgeTree.find((domain) => domain.topics.some((topic) => topic.id === selectedId)) ??
    knowledgeTree[0];
  const openDomains =
    expandedDomains ?? (filtering ? domains.map(({ id }) => id) : [defaultDomain.id]);
  const domain =
    domains.find(({ topics }) => topics.some(({ id }) => id === selectedId)) ?? domains[0];
  const topic = domain?.topics.find(({ id }) => id === selectedId) ?? domain?.topics[0];

  const visibleIds = domains.flatMap(({ id, topics }) =>
    openDomains.includes(id) ? [id, ...topics.map((item) => item.id)] : [id],
  );
  const activeId = visibleIds.includes(focusedId)
    ? focusedId
    : openDomains.includes(domain?.id)
      ? topic?.id
      : domain?.id;

  const visibleTopicsCount = domains.reduce((count, item) => count + item.topics.length, 0);
  const allExpanded = domains.length > 0 && domains.every((d) => openDomains.includes(d.id));

  function toggleDomain(id) {
    setExpandedDomains(
      openDomains.includes(id)
        ? openDomains.filter((openId) => openId !== id)
        : [...openDomains, id],
    );
  }

  function resetFilters() {
    setSearch("");
    setJdOnly(false);
    setUnpracticedOnly(false);
    setExpandedDomains(null);
  }

  function handleTreeKeys(event) {
    const item = event.target;
    const items = Array.from(event.currentTarget.querySelectorAll('[role="treeitem"]'));
    const index = items.indexOf(item);
    if (index === -1) return;

    const expanded = item.getAttribute("aria-expanded");
    let nextItem;
    switch (event.key) {
      case "ArrowDown":
        nextItem = items[index + 1];
        break;
      case "ArrowUp":
        nextItem = items[index - 1];
        break;
      case "Home":
        nextItem = items[0];
        break;
      case "End":
        nextItem = items.at(-1);
        break;
      case "ArrowRight":
        if (expanded === "false") item.click();
        if (expanded === "true") nextItem = items[index + 1];
        break;
      case "ArrowLeft":
        if (expanded === "true") item.click();
        if (item.dataset.parent) {
          nextItem = items.find((node) => node.dataset.node === item.dataset.parent);
        }
        break;
      default:
        return;
    }
    event.preventDefault();
    nextItem?.focus();
  }

  return (
    <div className="col stack-lg kb-screen">
      <PageHeader
        eyebrow="Kho tri thức"
        title="Kho tri thức"
        subtitle="Duyệt cây năng lực Domain → Topic → Competency theo vị trí mục tiêu và trọng tâm JD."
        actions={<RuleTag code="BR4">Chỉ nội dung đã duyệt</RuleTag>}
      />

      <div className="kb-toolbar" role="search" aria-label="Bộ lọc kho tri thức">
        <Field
          className="kb-search"
          label="Tìm chủ đề"
          type="search"
          placeholder="Tìm không dấu: PostgreSQL, Big O, HTTP, ACID…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setExpandedDomains(null);
          }}
        />

        <div className="row wrap kb-chips" role="group" aria-label="Lọc theo mức ưu tiên và tiến độ">
          <span className="sr-only">Phạm vi {currentUser.subtitle}</span>
          <span className="kb-context-chip" inert>
            <Chip active>{currentUser.subtitle}</Chip>
          </span>
          <Chip
            active={jdOnly}
            onClick={() => {
              setJdOnly(!jdOnly);
              setExpandedDomains(null);
            }}
          >
            Ưu tiên từ JD
          </Chip>
          <Chip
            active={unpracticedOnly}
            onClick={() => {
              setUnpracticedOnly(!unpracticedOnly);
              setExpandedDomains(null);
            }}
          >
            Chưa luyện
          </Chip>
          {filtering && (
            <Button variant="ghost" onClick={resetFilters}>
              Bỏ lọc
            </Button>
          )}
        </div>
      </div>

      {topic ? (
        <div className="grid kb-layout">
          <Card className="kb-tree-card">
            <CardHead title="Danh mục chủ đề">
              <div className="row stack-sm">
                <span className="t-body-s c-ink2 kb-tabular" role="status">
                  {visibleTopicsCount}/{totalTopicsCount}
                </span>
                <button
                  type="button"
                  className="kb-expand-toggle"
                  onClick={() =>
                    setExpandedDomains(allExpanded ? [] : domains.map((d) => d.id))
                  }
                >
                  {allExpanded ? "Thu gọn" : "Mở hết"}
                </button>
              </div>
            </CardHead>

            <ul
              className="kb-tree"
              role="tree"
              aria-label="Danh mục chủ đề"
              onKeyDown={handleTreeKeys}
            >
              {domains.map((item) => {
                const expanded = openDomains.includes(item.id);
                const groupId = `${treeId}-${item.id}`;
                return (
                  <li key={item.id} role="none" className="kb-domain-group">
                    <button
                      type="button"
                      role="treeitem"
                      className="row kb-domain"
                      aria-expanded={expanded}
                      aria-owns={expanded ? groupId : undefined}
                      data-node={item.id}
                      tabIndex={activeId === item.id ? 0 : -1}
                      onFocus={() => setFocusedId(item.id)}
                      onClick={() => toggleDomain(item.id)}
                    >
                      <span className="kb-chevron" aria-hidden="true" />
                      <span className="grow kb-domain-name">{item.name}</span>
                      <span className="t-mono c-ink2 kb-tabular">{item.topics.length}</span>
                    </button>

                    {expanded && (
                      <ul className="kb-topics" role="group" id={groupId}>
                        {item.topics.map((entry) => {
                          const isSelected = entry.id === topic.id;
                          return (
                            <li key={entry.id} role="none">
                              <button
                                type="button"
                                role="treeitem"
                                className="row kb-topic"
                                aria-selected={isSelected}
                                data-parent={item.id}
                                tabIndex={activeId === entry.id ? 0 : -1}
                                onFocus={() => setFocusedId(entry.id)}
                                onClick={() => setSelectedId(entry.id)}
                              >
                                <span className="grow kb-topic-main">
                                  <span className="kb-topic-title">{entry.name}</span>
                                  <span className="kb-topic-sub kb-tabular">
                                    {entry.competencies.length} năng lực
                                  </span>
                                </span>
                                {entry.jd && <Badge tone="brand" dot>JD</Badge>}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="kb-detail" aria-labelledby="kb-topic-title">
            <div className="col stack-sm kb-detail-header">
              <div className="row between wrap">
                <p className="t-body-s c-ink2">
                  {domain.name} <span aria-hidden="true">/</span> {topic.short}
                </p>
                {topic.jd ? (
                  <Badge tone="brand" dot>Ưu tiên từ JD</Badge>
                ) : (
                  <Badge tone={topic.practiced ? "success" : "neutral"} dot>
                    {topic.practiced ? "Đã luyện" : "Chưa luyện"}
                  </Badge>
                )}
              </div>
              <h2 id="kb-topic-title" className="t-display-l">{topic.name}</h2>
              <p className="c-ink2 kb-desc">{topic.description}</p>
            </div>

            <dl className="grid kb-metrics" aria-label="Thống kê luyện tập của chủ đề">
              <div className="kb-metric-cell">
                <dt className="t-body-s c-ink2">Đã luyện</dt>
                <dd className="t-heading-m kb-tabular">{topic.practiced} lần</dd>
              </div>
              <div className="kb-metric-cell">
                <dt className="t-body-s c-ink2">Điểm trung bình</dt>
                <dd className="t-heading-m kb-tabular">
                  {topic.avgScore == null ? "—" : `${topic.avgScore.toFixed(1)} / 10`}
                </dd>
              </div>
              <div className="kb-metric-cell">
                <dt className="t-body-s c-ink2">Lần luyện cuối</dt>
                <dd className="t-heading-m kb-tabular">{topic.lastPracticed || "—"}</dd>
              </div>
            </dl>

            <section className="col kb-comp-section" aria-labelledby="kb-competency-title">
              <div className="row between wrap">
                <h3 id="kb-competency-title" className="t-body-s t-strong c-ink2">
                  Mức nắm năng lực ({topic.competencies.length})
                </h3>
                <span className="t-body-s c-ink2">Mục tiêu phỏng vấn ≥ 70%</span>
              </div>

              <ul className="kb-competencies">
                {topic.competencies.map(({ name, mastery }) => {
                  const meta = getMasteryMeta(mastery);
                  const pct = Math.round(mastery * 100);
                  return (
                    <li className="kb-comp-row col stack-sm" key={name}>
                      <div className="row between wrap">
                        <span className="t-body-s t-strong">{name}</span>
                        <span className="row stack-sm">
                          <span className="t-body-s c-ink2">{meta.label}</span>
                          <span className={`t-mono kb-tabular ${meta.textClass}`}>{pct}%</span>
                        </span>
                      </div>
                      <div className="kb-bar-wrap">
                        <ProgressBar label={name} value={mastery} tone={meta.tone} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <div className="row wrap kb-actions">
              <Button
                variant="primary"
                onClick={() => navigate("/practice/voice", { state: { topicId: topic.id } })}
              >
                Bắt đầu luyện giọng nói
              </Button>
              <Button variant="secondary" onClick={() => navigate("/problems")}>
                Xem bài tập liên quan <span aria-hidden="true">→</span>
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="kb-empty-card">
          <div className="empty" role="status">
            <p className="t-heading-s">Không tìm thấy topic phù hợp — thử bỏ bớt bộ lọc.</p>
            <p className="t-body-s c-ink2">
              Chưa có chủ đề nào khớp đồng thời từ khóa và các nhãn lọc đang bật.
            </p>
            <Button variant="secondary" onClick={resetFilters}>
              Bỏ tất cả bộ lọc
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
