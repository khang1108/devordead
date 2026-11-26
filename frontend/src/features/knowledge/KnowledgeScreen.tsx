import { useCallback, useEffect, useId, useState, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getErrorMessage } from "@shared/services/apiClient";
import { localStore } from "@shared/services/localStore";
import type { KnowledgeDomain, ProgressTone } from "@shared/types";
import {
  Badge,
  Button,
  Card,
  CardHead,
  Chip,
  EmptyState,
  ErrorBanner,
  Field,
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
  textClass: string;
}

function normalizeSearch(text: string): string {
  return text
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replaceAll("đ", "d");
}

function getMasteryMeta(mastery: number): MasteryMeta {
  if (mastery === 0) return { label: "Chưa luyện", tone: "warning", textClass: "c-warning" };
  if (mastery < 0.4) return { label: "Cần ôn", tone: "warning", textClass: "c-warning" };
  if (mastery >= 0.7) return { label: "Nắm vững", tone: "success", textClass: "c-success" };
  return { label: "Đang tiến bộ", tone: "brand", textClass: "c-ink2" };
}

export default function KnowledgeScreen() {
  const navigate = useNavigate();
  const treeId = useId();
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
        const firstTopicId = activeDomains.flatMap((d) => d.topics).find((t) => !t.disabled)?.id ?? null;
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

  const totalTopicsCount = tree.reduce((sum, d) => sum + d.topics.length, 0);
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
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="treeitem"]'));
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
          <span className="kb-context-chip" aria-label={`Phạm vi ${contextLabel}`}>
            {contextLabel}
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

      {loading ? (
        <div className="grid kb-layout" aria-busy="true" aria-label="Đang tải kho tri thức">
          <Card className="kb-tree-card">
            <CardHead title="Danh mục chủ đề">
              <Skeleton width={48} height={16} />
            </CardHead>
            <div className="kb-skeleton-stack">
              <Skeleton width="76%" height={20} />
              <Skeleton width="90%" height={36} />
              <Skeleton width="84%" height={36} />
              <Skeleton width="70%" height={20} />
              <Skeleton width="88%" height={36} />
            </div>
          </Card>

          <Card className="kb-detail">
            <div className="col stack-sm">
              <Skeleton width="34%" height={16} />
              <Skeleton width="62%" height={28} />
              <Skeleton width="92%" height={16} />
              <Skeleton width="78%" height={16} />
            </div>
            <div className="grid kb-metrics">
              <div className="kb-metric-cell">
                <Skeleton width={64} height={14} />
                <Skeleton width={88} height={24} />
              </div>
              <div className="kb-metric-cell">
                <Skeleton width={96} height={14} />
                <Skeleton width={88} height={24} />
              </div>
              <div className="kb-metric-cell">
                <Skeleton width={88} height={14} />
                <Skeleton width={88} height={24} />
              </div>
            </div>
            <div className="col stack-sm">
              <Skeleton width="42%" height={16} />
              <Skeleton width="100%" height={40} />
              <Skeleton width="100%" height={40} />
              <Skeleton width="100%" height={40} />
            </div>
          </Card>
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
          </Card>

          <Card className="kb-detail" aria-labelledby="kb-topic-title">
            <div className="col stack-sm kb-detail-header">
              <div className="row between wrap">
                <p className="t-body-s c-ink2">
                  {domain.name} <span aria-hidden="true">/</span> {topic.short}
                </p>
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
              <h2 id="kb-topic-title" className="t-display-l">
                {topic.name}
              </h2>
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
                onClick={() =>
                  navigate(`/practice/voice?topic=${encodeURIComponent(topic.id)}`, {
                    state: { topicId: topic.id, topicName: topic.name },
                  })
                }
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
