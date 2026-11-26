import { useCallback, useEffect, useId, useState, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getErrorMessage } from "@shared/services/apiClient";
import { localStore } from "@shared/services/localStore";
import type { KnowledgeDomain, ProgressTone } from "@shared/types";
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  PageHeader,
  ProgressBar,
  RuleTag,
  Skeleton,
} from "@shared/ui";
import { knowledgeService } from "./knowledge.service";
import "./KnowledgeScreen.css";

interface MasteryMeta {
  label: string;
  tone: ProgressTone;
  diffClass: string;
}

function normalizeSearch(text: string): string {
  return text
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replaceAll("đ", "d");
}

function getMasteryMeta(mastery: number): MasteryMeta {
  if (mastery === 0) return { label: "Chưa luyện", tone: "warning", diffClass: "lc-diff--medium" };
  if (mastery < 0.4) return { label: "Cần ôn", tone: "warning", diffClass: "lc-diff--medium" };
  if (mastery >= 0.7) return { label: "Nắm vững", tone: "success", diffClass: "lc-diff--easy" };
  return { label: "Đang tiến bộ", tone: "brand", diffClass: "c-ink2" };
}

export default function KnowledgeScreen() {
  const navigate = useNavigate();
  const treeId = useId();
  const searchId = useId();
  const targetProfile = localStore.getTargetProfile();
  const contextLabel = `${targetProfile.role} · ${targetProfile.level}`;

  const [tree, setTree] = useState<KnowledgeDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [search, setSearch] = useState("");
  const [jdOnly, setJdOnly] = useState(false);
  const [unpracticedOnly, setUnpracticedOnly] = useState(false);
  const [expandedDomains, setExpandedDomains] = useState<string[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const reload = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void knowledgeService
      .getKnowledgeTree(
        { role: targetProfile.role, level: targetProfile.level },
        controller.signal,
      )
      .then((data) => {
        const activeDomains = data.filter((d) => !d.disabled);
        setTree(activeDomains);
        const firstTopicId =
          activeDomains.flatMap((d) => d.topics).find((t) => !t.disabled)?.id ?? null;
        setSelectedId((prev) => prev ?? firstTopicId);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(getErrorMessage(err, "Không thể tải cây tri thức từ máy chủ API."));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [targetProfile.role, targetProfile.level, reloadTick]);

  const allActiveTopics = tree.flatMap((d) => d.topics.filter((t) => !t.disabled));
  const totalTopicsCount = allActiveTopics.length;
  const jdTopicsCount = allActiveTopics.filter((t) => t.jd).length;
  const unpracticedCount = allActiveTopics.filter((t) => t.practiced === 0).length;

  const query = normalizeSearch(search.trim());
  const filtering = Boolean(query || jdOnly || unpracticedOnly);

  const domains: KnowledgeDomain[] = tree
    .map((domain) => ({
      ...domain,
      topics: domain.topics.filter(
        (topic) =>
          !topic.disabled &&
          (normalizeSearch(topic.name).includes(query) ||
            normalizeSearch(topic.short || "").includes(query)) &&
          (!jdOnly || topic.jd) &&
          (!unpracticedOnly || topic.practiced === 0),
      ),
    }))
    .filter((domain) => domain.topics.length > 0);

  const defaultDomain =
    tree.find((d) => d.topics.some((t) => t.id === selectedId)) ?? tree[0];
  const openDomains: string[] =
    expandedDomains ??
    (filtering
      ? domains.map(({ id }) => id)
      : defaultDomain
        ? [defaultDomain.id]
        : []);

  const domain =
    domains.find(({ topics }) => topics.some(({ id }) => id === selectedId)) ?? domains[0];
  const topic = domain?.topics.find(({ id }) => id === selectedId) ?? domain?.topics[0];

  const visibleIds = domains.flatMap(({ id, topics }) =>
    openDomains.includes(id) ? [id, ...topics.map((item) => item.id)] : [id],
  );
  const activeId =
    focusedId && visibleIds.includes(focusedId)
      ? focusedId
      : domain && openDomains.includes(domain.id)
        ? topic?.id
        : domain?.id;

  const visibleTopicsCount = domains.reduce((count, item) => count + item.topics.length, 0);
  const allExpanded = domains.length > 0 && domains.every((d) => openDomains.includes(d.id));

  function toggleDomain(id: string) {
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

  function handleTreeKeys(event: KeyboardEvent<HTMLUListElement>) {
    const item = event.target as HTMLElement;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="treeitem"]'),
    );
    const index = items.indexOf(item);
    if (index === -1) return;

    const expanded = item.getAttribute("aria-expanded");
    let nextItem: HTMLElement | undefined;
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
        nextItem = items[items.length - 1];
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
        actions={
          <div className="row wrap stack-sm">
            <span className="kb-context-badge" aria-label={`Phạm vi ${contextLabel}`}>
              {contextLabel}
            </span>
            <RuleTag code="BR4">Chỉ nội dung đã duyệt</RuleTag>
          </div>
        }
      />

      {/* LeetCode Explore Filter Strip + Rounded Search */}
      <div className="kb-toolbar" role="search" aria-label="Bộ lọc kho tri thức">
        <div className="lc-pills" role="group" aria-label="Lọc theo mức ưu tiên và tiến độ">
          <button
            type="button"
            className={`lc-pill ${!jdOnly && !unpracticedOnly ? "is-active" : ""}`.trim()}
            aria-pressed={!jdOnly && !unpracticedOnly}
            onClick={() => {
              setJdOnly(false);
              setUnpracticedOnly(false);
              setExpandedDomains(null);
            }}
          >
            <span>Tất cả</span>
            <span className="lc-pill__count">{totalTopicsCount}</span>
          </button>

          <button
            type="button"
            className={`lc-pill ${jdOnly ? "is-active" : ""}`.trim()}
            aria-pressed={jdOnly}
            onClick={() => {
              setJdOnly((v) => !v);
              setExpandedDomains(null);
            }}
          >
            <span>Ưu tiên từ JD</span>
            <span className="lc-pill__count">{jdTopicsCount}</span>
          </button>

          <button
            type="button"
            className={`lc-pill ${unpracticedOnly ? "is-active" : ""}`.trim()}
            aria-pressed={unpracticedOnly}
            onClick={() => {
              setUnpracticedOnly((v) => !v);
              setExpandedDomains(null);
            }}
          >
            <span>Chưa luyện</span>
            <span className="lc-pill__count">{unpracticedCount}</span>
          </button>

          {filtering && (
            <button type="button" className="kb-reset-link" onClick={resetFilters}>
              Bỏ lọc
            </button>
          )}
        </div>

        <div className="kb-search-box">
          <label htmlFor={searchId} className="sr-only">
            Tìm chủ đề trong kho tri thức
          </label>
          <svg
            className="kb-search-icon"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="7.2" cy="7.2" r="4.8" />
            <path d="m11 11 3 3" />
          </svg>
          <input
            id={searchId}
            type="search"
            className="kb-search-input"
            placeholder="Tìm chủ đề: PostgreSQL, Big O, HTTP…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setExpandedDomains(null);
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="kb-layout" aria-busy="true" aria-label="Đang tải kho tri thức">
          <section className="lc-pane kb-pane">
            <div className="lc-pane__head">
              <span className="kb-pane-title">Danh mục chủ đề</span>
              <Skeleton width={48} height={14} />
            </div>
            <div className="kb-skeleton-stack">
              <Skeleton width="76%" height={20} />
              <Skeleton width="90%" height={36} />
              <Skeleton width="84%" height={36} />
              <Skeleton width="70%" height={20} />
              <Skeleton width="88%" height={36} />
            </div>
          </section>

          <section className="lc-pane kb-pane">
            <div className="lc-pane__head">
              <Skeleton width="34%" height={14} />
            </div>
            <div className="kb-detail-body">
              <Skeleton width="62%" height={26} />
              <Skeleton width="92%" height={15} />
              <Skeleton width="78%" height={15} />
              <div className="kb-metrics">
                {[0, 1, 2].map((idx) => (
                  <div className="kb-metric-cell" key={idx}>
                    <Skeleton width={72} height={13} />
                    <Skeleton width={88} height={22} />
                  </div>
                ))}
              </div>
              <Skeleton width="100%" height={40} />
              <Skeleton width="100%" height={40} />
            </div>
          </section>
        </div>
      ) : error ? (
        <ErrorBanner
          title="Không tải được kho tri thức"
          message={error}
          onRetry={reload}
          actions={
            <Link to="/practice/voice" className="btn btn--secondary btn--sm">
              Mở phòng luyện giọng nói
            </Link>
          }
        />
      ) : tree.length === 0 ? (
        <EmptyState
          title="Chưa có chủ đề nào trong kho tri thức"
          description="Cây năng lực Domain → Topic → Competency sẽ hiển thị sau khi được kiểm duyệt (BR4) cho vị trí mục tiêu của bạn."
          actions={
            <>
              <Button variant="secondary" onClick={reload}>
                Tải lại
              </Button>
              <Link to="/profile" className="btn btn--ghost">
                Cập nhật hồ sơ mục tiêu
              </Link>
            </>
          }
        />
      ) : topic && domain ? (
        <div className="kb-layout">
          {/* Left Pane: WAI-ARIA Domain -> Topic Tree */}
          <section className="lc-pane kb-pane" aria-label="Danh mục chủ đề">
            <div className="lc-pane__head">
              <span className="kb-pane-title">Danh mục chủ đề</span>
              <div className="row stack-sm">
                <span className="t-mono c-ink2 kb-tabular" role="status">
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
            </div>

            <div className="lc-pane__body kb-tree-body">
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
                                  {entry.jd && (
                                    <Badge tone="brand" dot>
                                      JD
                                    </Badge>
                                  )}
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
            </div>
          </section>

          {/* Right Pane: Topic & Competency Detail */}
          <section className="lc-pane kb-pane" aria-labelledby="kb-topic-title">
            <div className="lc-pane__head">
              <span className="t-body-s c-ink2 kb-breadcrumb">
                <strong className="kb-pane-title">{domain.name}</strong>
                <span aria-hidden="true"> / </span>
                <span>{topic.short}</span>
              </span>
              {topic.jd ? (
                <Badge tone="brand" dot>
                  Ưu tiên từ JD
                </Badge>
              ) : (
                <Badge tone={topic.practiced ? "success" : "neutral"} dot>
                  {topic.practiced ? "Đã luyện" : "Chưa luyện"}
                </Badge>
              )}
            </div>

            <div className="lc-pane__body kb-detail-body">
              <div className="col stack-sm">
                <h2 id="kb-topic-title" className="t-display-l kb-topic-heading">
                  {topic.name}
                </h2>
                <p className="t-body-m c-ink2 kb-desc">{topic.description}</p>
              </div>

              <dl className="kb-metrics" aria-label="Thống kê luyện tập của chủ đề">
                <div className="kb-metric-cell">
                  <dt className="t-body-s c-ink2">Đã luyện</dt>
                  <dd className="t-heading-m kb-tabular">{topic.practiced} lần</dd>
                </div>
                <div className="kb-metric-cell">
                  <dt className="t-body-s c-ink2">Điểm trung bình</dt>
                  <dd className="t-heading-m kb-tabular">
                    {topic.practiced === 0 ? "—" : `${topic.avgScore.toFixed(1)} / 10`}
                  </dd>
                </div>
                <div className="kb-metric-cell">
                  <dt className="t-body-s c-ink2">Lần luyện cuối</dt>
                  <dd className="t-heading-m kb-tabular">{topic.lastPracticed || "—"}</dd>
                </div>
              </dl>

              <section className="col kb-comp-section" aria-labelledby="kb-competency-title">
                <div className="row between wrap">
                  <h3 id="kb-competency-title" className="t-body-s t-strong">
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
                            <span className={`lc-diff ${meta.diffClass}`}>{meta.label}</span>
                            <span className="t-mono c-ink2 kb-tabular">{pct}%</span>
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
            </div>

            <div className="lc-pane__foot kb-detail-foot">
              <div className="row wrap kb-actions">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    navigate(`/practice/voice?topic=${encodeURIComponent(topic.id)}`, {
                      state: { topicId: topic.id, topicName: topic.name },
                    })
                  }
                >
                  Bắt đầu luyện giọng nói
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate("/problems")}>
                  Xem bài tập liên quan <span aria-hidden="true">→</span>
                </Button>
              </div>
              <span className="t-body-s c-ink2 kb-tabular">
                {topic.competencies.length} tiêu chí đánh giá
              </span>
            </div>
          </section>
        </div>
      ) : (
        <EmptyState
          title="Không tìm thấy topic phù hợp — thử bỏ bớt bộ lọc."
          description="Chưa có chủ đề nào khớp đồng thời từ khóa và các nhãn lọc đang bật."
          actions={
            <Button variant="secondary" onClick={resetFilters}>
              Bỏ tất cả bộ lọc
            </Button>
          }
        />
      )}
    </div>
  );
}
