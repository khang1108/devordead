import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, CardHead, Chip, Field, PageHeader, ProgressBar, RuleTag } from "../components/ui.jsx";
import { currentUser, knowledgeTree } from "../data/mock.js";
import "./KnowledgeScreen.css";

function normalizeSearch(text) {
  return text.toLocaleLowerCase("vi").normalize("NFD").replace(/\p{M}/gu, "").replaceAll("đ", "d");
}

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
      topics: domain.topics.filter((topic) =>
        normalizeSearch(topic.name).includes(query) &&
        (!jdOnly || topic.jd) &&
        (!unpracticedOnly || topic.practiced === 0),
      ),
    }))
    .filter((domain) => domain.topics.length > 0);

  const defaultDomain = knowledgeTree.find((domain) => domain.topics.some((topic) => topic.id === selectedId));
  const openDomains = expandedDomains ?? (filtering ? domains.map(({ id }) => id) : [defaultDomain.id]);
  const domain = domains.find(({ topics }) => topics.some(({ id }) => id === selectedId)) ?? domains[0];
  const topic = domain?.topics.find(({ id }) => id === selectedId) ?? domain?.topics[0];
  const visibleIds = domains.flatMap(({ id, topics }) =>
    openDomains.includes(id) ? [id, ...topics.map((item) => item.id)] : [id],
  );
  const activeId = visibleIds.includes(focusedId)
    ? focusedId
    : openDomains.includes(domain?.id) ? topic?.id : domain?.id;

  function toggleDomain(id) {
    setExpandedDomains(openDomains.includes(id)
      ? openDomains.filter((openId) => openId !== id)
      : [...openDomains, id]);
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
    <div className="col stack-lg">
      <PageHeader
        eyebrow="02 — KHO TRI THỨC"
        title="Kho tri thức"
        actions={<RuleTag code="BR4">Chỉ nội dung đã duyệt</RuleTag>}
      />

      <Card className="kb-filters" variant="tight" aria-label="Bộ lọc kho tri thức">
        <Field
          className="kb-search"
          label="Tìm chủ đề"
          type="search"
          placeholder="Ví dụ: PostgreSQL, Big-O…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setExpandedDomains(null);
          }}
        />
        <div className="row wrap kb-chips" role="group" aria-label="Lọc theo mức ưu tiên và tiến độ">
          <span className="sr-only">Phạm vi {currentUser.subtitle}</span>
          <span inert><Chip active>{currentUser.subtitle}</Chip></span>
          <Chip active={jdOnly} onClick={() => {
            setJdOnly(!jdOnly);
            setExpandedDomains(null);
          }}>
            Ưu tiên từ JD
          </Chip>
          <Chip active={unpracticedOnly} onClick={() => {
            setUnpracticedOnly(!unpracticedOnly);
            setExpandedDomains(null);
          }}>
            Chưa luyện
          </Chip>
        </div>
      </Card>

      {topic ? (
        <div className="grid kb-layout">
          <Card className="kb-tree-card">
            <CardHead title="Danh mục chủ đề">
              <span className="t-mono c-ink2" role="status">
                {domains.reduce((count, item) => count + item.topics.length, 0)} chủ đề
              </span>
            </CardHead>
            <ul className="kb-tree" role="tree" aria-label="Danh mục chủ đề" onKeyDown={handleTreeKeys}>
              {domains.map((item) => {
                const expanded = openDomains.includes(item.id);
                const groupId = `${treeId}-${item.id}`;
                return (
                  <li key={item.id} role="none">
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
                      <span className="grow">{item.name}</span>
                    </button>
                    {expanded && (
                      <ul className="kb-topics" role="group" id={groupId}>
                        {item.topics.map((entry) => (
                          <li key={entry.id} role="none">
                            <button
                              type="button"
                              role="treeitem"
                              className="row kb-topic"
                              aria-selected={entry.id === topic.id}
                              data-parent={item.id}
                              tabIndex={activeId === entry.id ? 0 : -1}
                              onFocus={() => setFocusedId(entry.id)}
                              onClick={() => setSelectedId(entry.id)}
                            >
                              <span className="grow">{entry.name}</span>
                              {entry.jd && <Badge tone="brand">JD</Badge>}
                              {entry.id === topic.id && <span className="kb-check" aria-hidden="true">✓</span>}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="kb-detail" aria-labelledby="kb-topic-title">
            <div className="col stack-sm kb-detail-header">
              <p className="t-mono c-brand">{domain.name} <span aria-hidden="true">/</span> {topic.short}</p>
              <div className="row wrap">
                <h2 id="kb-topic-title" className="t-display-l">{topic.name}</h2>
                {topic.jd
                  ? <Badge tone="brand" dot>Ưu tiên từ JD</Badge>
                  : <Badge>{topic.practiced ? "Đã luyện" : "Chưa luyện"}</Badge>}
              </div>
              <p className="c-ink2">{topic.description}</p>
            </div>

            <section className="col" aria-labelledby="kb-competency-title">
              <h3 id="kb-competency-title" className="t-mono c-ink2">Mức nắm competency</h3>
              <ul className="col kb-competencies">
                {topic.competencies.map(({ name, mastery }) => (
                  <li className="col stack-sm" key={name}>
                    <div className="row between">
                      <span className="t-body-s t-strong">{name}</span>
                      <span className="t-mono c-brand">{Math.round(mastery * 100)}%</span>
                    </div>
                    <ProgressBar label={name} value={mastery} />
                  </li>
                ))}
              </ul>
            </section>

            <dl className="grid kb-metrics">
              <div>
                <dt className="t-mono c-ink2">Đã luyện</dt>
                <dd className="t-heading-m">{topic.practiced} lần</dd>
              </div>
              <div>
                <dt className="t-mono c-ink2">Điểm TB</dt>
                <dd className="t-heading-m">{topic.avgScore == null ? "—" : `${topic.avgScore.toFixed(1)} / 10`}</dd>
              </div>
              <div>
                <dt className="t-mono c-ink2">Lần cuối</dt>
                <dd className="t-heading-m">{topic.lastPracticed || "—"}</dd>
              </div>
            </dl>

            <div className="row wrap kb-actions">
              <Button variant="accent" onClick={() => navigate("/practice/voice", { state: { topicId: topic.id } })}>
                Bắt đầu luyện giọng nói
              </Button>
              <Button variant="secondary" onClick={() => navigate("/problems")}>
                Xem bài tập liên quan <span aria-hidden="true">→</span>
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <p className="empty" role="status">Không tìm thấy topic phù hợp — thử bỏ bớt bộ lọc.</p>
        </Card>
      )}
    </div>
  );
}
