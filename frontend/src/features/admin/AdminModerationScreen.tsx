import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHead,
  EmptyState,
  ErrorBanner,
  Field,
  PageHeader,
  RuleTag,
  Skeleton,
  Tabs,
} from "@shared/ui";
import { DIFFICULTY_META } from "@shared/constants";
import { getErrorMessage } from "@shared/services/apiClient";
import { localStore } from "@shared/services/localStore";
import type {
  Difficulty,
  KnowledgeDomain,
  ModerationItem,
  ModerationKind,
  ProcessedModerationItem,
} from "@shared/types";
import { adminService } from "./admin.service";
import "./AdminModerationScreen.css";

type QueueFilter = "all" | ModerationKind;
type ModerationAction = "approve" | "reject" | "regenerate";

interface EditableModerationItem {
  id: string;
  kind: ModerationKind;
  title: string;
  originalTitle: string;
  source: string;
  content: string;
  reference: string;
  criteriaText: string;
  topic: string;
  competency: string;
  difficulty: Difficulty | "";
  createdAt: string;
  revision: number;
}

type RequiredFieldKey = "title" | "reference" | "criteriaText" | "topic" | "competency" | "difficulty";

const KIND_LABELS: Record<ModerationKind, string> = {
  question: "Câu hỏi",
  problem: "Bài tập",
};

const FILTERS: readonly { value: QueueFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "question", label: "Câu hỏi" },
  { value: "problem", label: "Bài tập" },
];

const REQUIRED_FIELDS: Record<RequiredFieldKey, string> = {
  title: "Tiêu đề",
  reference: "Đáp án tham chiếu",
  criteriaText: "Tiêu chí chấm",
  topic: "Topic",
  competency: "Competency",
  difficulty: "Độ khó",
};

const LOADING_LABELS: Record<ModerationAction, string> = {
  approve: "Đang phê duyệt…",
  reject: "Đang từ chối…",
  regenerate: "AI đang đề xuất lại…",
};

function toEditable(item: ModerationItem & { content?: string }): EditableModerationItem {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    originalTitle: item.title,
    source: item.source,
    content: item.content ?? "",
    reference: item.reference,
    criteriaText: item.criteria.join("\n"),
    topic: item.topic,
    competency: item.competency,
    difficulty: item.difficulty,
    createdAt: item.createdAt,
    revision: item.revision ?? 0,
  };
}

function toModerationItem(item: EditableModerationItem): ModerationItem {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    source: item.source,
    topic: item.topic,
    competency: item.competency,
    difficulty: (item.difficulty || "medium") as Difficulty,
    createdAt: item.createdAt,
    reference: item.reference,
    criteria: item.criteriaText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    revision: item.revision,
  };
}

interface QueueProps {
  items: readonly EditableModerationItem[];
  count: number;
  filter: QueueFilter;
  onFilter: (filter: QueueFilter) => void;
  selectedId?: string;
  onSelect: (id: string, focusEditor?: boolean) => void;
}

function Queue({ items, count, filter, onFilter, selectedId, onSelect }: QueueProps) {
  function navigateQueue(event: KeyboardEvent<HTMLUListElement>) {
    const options = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'),
    );
    const target = event.target as HTMLButtonElement | null;
    const index = target ? options.indexOf(target) : -1;
    if (index < 0) return;

    let next: number;
    switch (event.key) {
      case "ArrowDown":
        next = Math.min(index + 1, options.length - 1);
        break;
      case "ArrowUp":
        next = Math.max(index - 1, 0);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = options.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const nextItem = items[next];
    if (nextItem) onSelect(nextItem.id);
    options[next]?.focus();
  }

  return (
    <Card className="card--flush mod-queue mod-card">
      <div className="mod-queue-head">
        <CardHead title="Hàng chờ">
          <Badge tone="brand" dot>
            {count} chờ duyệt
          </Badge>
        </CardHead>
        <Tabs tabs={FILTERS} value={filter} onChange={onFilter} label="Loại nội dung" />
      </div>

      {items.length === 0 ? (
        <p className="empty" role="status">
          {count === 0
            ? "Hàng chờ đã trống — mọi mục đã được xử lý."
            : "Không có nội dung chờ duyệt thuộc loại này."}
        </p>
      ) : (
        <ul
          className="mod-items"
          aria-label="Nội dung chờ duyệt"
          role="listbox"
          onKeyDown={navigateQueue}
        >
          {items.map((item) => (
            <li key={item.id} role="presentation">
              <button
                type="button"
                role="option"
                className="mod-item col stack-sm"
                aria-selected={item.id === selectedId}
                tabIndex={item.id === selectedId ? 0 : -1}
                onClick={() => onSelect(item.id, true)}
              >
                <span className="row wrap between stack-sm">
                  <Badge tone={item.kind === "question" ? "brand" : "neutral"} dot>
                    {KIND_LABELS[item.kind]}
                  </Badge>
                  <span className="t-mono c-ink2 mod-tabular">{item.createdAt}</span>
                </span>
                <span className="t-strong">{item.title.trim() || item.originalTitle}</span>
                <span className="t-body-s c-ink2">{item.source}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

interface AssignmentSelectProps {
  name: string;
  label: string;
  value: string;
  options: readonly [string, string][];
  onChange: (value: string) => void;
  error?: string;
}

function AssignmentSelect({ name, label, value, options, onChange, error }: AssignmentSelectProps) {
  const id = `mod-${name}`;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <select
        className="select"
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        <option value="">Chọn {label.toLowerCase()}</option>
        {options.map(([option, text]) => (
          <option value={option} key={option}>
            {text}
          </option>
        ))}
      </select>
      {error && (
        <p className="field__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface ModerationEditorProps {
  item: EditableModerationItem;
  topicsMap: ReadonlyMap<string, ReadonlySet<string>>;
  pending: ModerationAction | null;
  busy: boolean;
  regeneratedToast: string;
  actionError: string | null;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onEdit: (changes: Partial<EditableModerationItem>) => void;
  onAction: (action: ModerationAction, reason?: string) => void;
}

function ModerationEditor({
  item,
  topicsMap,
  pending,
  busy,
  regeneratedToast,
  actionError,
  headingRef,
  onEdit,
  onAction,
}: ModerationEditorProps) {
  const [errors, setErrors] = useState<Partial<Record<RequiredFieldKey | "reason", string>>>({});
  const [missingList, setMissingList] = useState<RequiredFieldKey[]>([]);
  const [rejecting, setRejecting] = useState<boolean>(false);
  const [reason, setReason] = useState<string>("");

  useEffect(() => {
    if (rejecting) document.getElementById("mod-reject-reason")?.focus();
  }, [rejecting]);

  function change<K extends keyof EditableModerationItem>(
    name: K,
    value: EditableModerationItem[K],
  ) {
    if (name === "topic") {
      onEdit({ topic: value as string, competency: "" });
    } else {
      onEdit({ [name]: value } as Partial<EditableModerationItem>);
    }
    setErrors((current) => ({ ...current, [name]: undefined }));
    setMissingList((prev) => prev.filter((field) => field !== name));
  }

  function approve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const keys = Object.keys(REQUIRED_FIELDS) as RequiredFieldKey[];
    const missing = keys.filter((key) => !String(item[key]).trim());
    if (missing.length > 0) {
      setMissingList(missing);
      const nextErrors: Partial<Record<RequiredFieldKey, string>> = {};
      for (const key of missing) {
        nextErrors[key] = `Vui lòng điền ${REQUIRED_FIELDS[key].toLowerCase()}.`;
      }
      setErrors(nextErrors);
      const firstMissing = missing[0];
      if (firstMissing) document.getElementById(`mod-${firstMissing}`)?.focus();
      return;
    }
    setMissingList([]);
    onAction("approve");
  }

  function reject() {
    if (!reason.trim()) {
      setErrors((current) => ({ ...current, reason: "Vui lòng nhập lý do từ chối (A2)." }));
      document.getElementById("mod-reject-reason")?.focus();
      return;
    }
    onAction("reject", reason.trim());
  }

  const topicOptions: [string, string][] = Array.from(topicsMap.keys()).map((name) => [name, name]);
  const competencyOptions: [string, string][] = Array.from(topicsMap.get(item.topic) ?? []).map(
    (name) => [name, name],
  );
  const difficultyOptions: [string, string][] = (["easy", "medium", "hard"] as const).map((key) => [
    key,
    DIFFICULTY_META[key].label,
  ]);

  return (
    <form
      className="card mod-editor mod-card"
      onSubmit={approve}
      noValidate
      aria-busy={Boolean(pending)}
    >
      <div className="row between wrap">
        <h2 className="t-body-s t-strong c-ink2" ref={headingRef} tabIndex={-1}>
          Chi tiết kiểm duyệt · <span className="t-mono">#{item.id}</span>
        </h2>
        <div className="row stack-sm">
          <span className="t-body-s c-ink2 mod-tabular">Bản nháp #{item.revision + 1}</span>
          <Badge tone="warning" dot>
            Chờ duyệt
          </Badge>
        </div>
      </div>

      <div className="mod-source row between wrap">
        <div>
          <p className="t-heading-s">{KIND_LABELS[item.kind]}</p>
          <p className="t-body-s c-ink2 mod-tabular">
            Nguồn: {item.source} · {item.createdAt}
          </p>
        </div>
      </div>

      {actionError && <ErrorBanner title="Không thể thực hiện thao tác kiểm duyệt" message={actionError} />}

      {regeneratedToast && (
        <Callout tone="brand">
          <p>{regeneratedToast}</p>
        </Callout>
      )}

      {missingList.length > 0 && (
        <div role="alert">
          <Callout tone="danger" title="Thiếu thông tin bắt buộc (E1)">
            <p>
              Vui lòng bổ sung:{" "}
              <strong>{missingList.map((key) => REQUIRED_FIELDS[key]).join(", ")}</strong>.
            </p>
          </Callout>
        </div>
      )}

      <fieldset className="mod-fields col" disabled={Boolean(pending)}>
        <Field
          id="mod-title"
          label="Tiêu đề"
          required
          value={item.title}
          error={errors.title}
          onChange={(event) => change("title", event.target.value)}
        />
        <Field
          id="mod-content"
          label="Nội dung đề bài / câu hỏi"
          multiline
          placeholder="Nhập hoặc hiệu chỉnh nội dung câu hỏi / đề bài…"
          value={item.content}
          onChange={(event) => change("content", event.target.value)}
        />
        <Field
          id="mod-reference"
          label="Đáp án tham chiếu"
          multiline
          required
          value={item.reference}
          error={errors.reference}
          onChange={(event) => change("reference", event.target.value)}
        />
        <Field
          id="mod-criteriaText"
          label="Tiêu chí chấm"
          multiline
          required
          hint="Mỗi tiêu chí viết trên một dòng."
          value={item.criteriaText}
          error={errors.criteriaText}
          onChange={(event) => change("criteriaText", event.target.value)}
        />

        <div className="mod-assignment grid">
          <AssignmentSelect
            name="topic"
            label="Topic"
            value={item.topic}
            error={errors.topic}
            options={topicOptions}
            onChange={(value) => change("topic", value)}
          />
          <AssignmentSelect
            name="competency"
            label="Competency"
            value={item.competency}
            error={errors.competency}
            options={competencyOptions}
            onChange={(value) => change("competency", value)}
          />
          <AssignmentSelect
            name="difficulty"
            label="Độ khó"
            value={item.difficulty}
            error={errors.difficulty}
            options={difficultyOptions}
            onChange={(value) => change("difficulty", value as Difficulty | "")}
          />
        </div>
      </fieldset>

      {rejecting && (
        <div className="mod-rejection col">
          <Field
            id="mod-reject-reason"
            label="Lý do từ chối (bắt buộc)"
            multiline
            required
            placeholder="Nêu rõ lý do loại bỏ nội dung này…"
            value={reason}
            error={errors.reason}
            disabled={Boolean(pending)}
            onChange={(event) => {
              setReason(event.target.value);
              setErrors((current) => ({ ...current, reason: undefined }));
            }}
          />
          <div className="row wrap stack-sm">
            <Button variant="primary" onClick={reject} disabled={busy}>
              {pending === "reject" && <span className="spinner" aria-hidden="true" />}
              {pending === "reject" ? LOADING_LABELS.reject : "Xác nhận từ chối"}
            </Button>
            <Button
              variant="ghost"
              disabled={Boolean(pending)}
              onClick={() => {
                setRejecting(false);
                setReason("");
                setErrors((current) => ({ ...current, reason: undefined }));
              }}
            >
              Hủy
            </Button>
          </div>
        </div>
      )}

      <div className="mod-actions row wrap stack-sm">
        <Button variant="primary" type="submit" disabled={busy || rejecting}>
          {pending === "approve" && <span className="spinner" aria-hidden="true" />}
          {pending === "approve" ? LOADING_LABELS.approve : "Phê duyệt"}
        </Button>

        {!rejecting && (
          <Button variant="secondary" disabled={busy} onClick={() => setRejecting(true)}>
            Từ chối
          </Button>
        )}

        <Button
          variant="ghost"
          disabled={busy || rejecting}
          onClick={() => onAction("regenerate")}
        >
          {pending === "regenerate" && <span className="spinner" aria-hidden="true" />}
          {pending === "regenerate" ? LOADING_LABELS.regenerate : "Yêu cầu AI đề xuất lại"}
        </Button>
      </div>
    </form>
  );
}

// UC18 — Kiểm duyệt nội dung (BR4)
export default function AdminModerationScreen() {
  const [queue, setQueue] = useState<EditableModerationItem[]>(() =>
    (localStore.getAdminModerationQueue() ?? []).map(toEditable),
  );
  const [processed, setProcessed] = useState<ProcessedModerationItem[]>(() =>
    localStore.getAdminModerationHistory(),
  );
  const [taxonomy, setTaxonomy] = useState<KnowledgeDomain[]>(
    () => localStore.getAdminTaxonomyDraft() ?? [],
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState<number>(0);

  const [filter, setFilter] = useState<QueueFilter>("all");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState<{ action: ModerationAction; id: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [regenMessage, setRegenMessage] = useState<string>("");
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  const reload = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);

    void Promise.all([
      adminService.getModerationQueue(controller.signal),
      adminService
        .getModerationHistory(controller.signal)
        .catch(() => localStore.getAdminModerationHistory()),
      adminService
        .getTaxonomy(controller.signal)
        .catch(() => localStore.getAdminTaxonomyDraft() ?? []),
    ])
      .then(([items, history, domains]) => {
        if (controller.signal.aborted) return;
        const editable = items.map(toEditable);
        setQueue(editable);
        localStore.setAdminModerationQueue(items);
        setProcessed(history);
        localStore.setAdminModerationHistory(history);
        setTaxonomy(domains);
        setSelectedId((curr) => curr ?? editable[0]?.id);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(getErrorMessage(err));
        setLoading(false);
      });

    return () => controller.abort();
  }, [reloadTick]);

  const topicsMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const domain of taxonomy) {
      for (const topic of domain.topics) {
        if (!map.has(topic.name)) map.set(topic.name, new Set());
        for (const comp of topic.competencies) {
          map.get(topic.name)?.add(comp.name);
        }
      }
    }
    for (const item of queue) {
      if (item.topic) {
        if (!map.has(item.topic)) map.set(item.topic, new Set());
        if (item.competency) map.get(item.topic)?.add(item.competency);
      }
    }
    return map;
  }, [taxonomy, queue]);

  const visible = queue.filter((item) => filter === "all" || item.kind === filter);
  const selected = visible.find((item) => item.id === selectedId) ?? visible[0] ?? null;

  function select(id: string, focusEditor = false) {
    setSelectedId(id);
    setRegenMessage("");
    setActionError(null);
    if (focusEditor) window.requestAnimationFrame(() => headingRef.current?.focus());
  }

  function edit(changes: Partial<EditableModerationItem>) {
    if (!selected) return;
    setRegenMessage("");
    setActionError(null);
    setQueue((current) => {
      const next = current.map((item) => (item.id === selected.id ? { ...item, ...changes } : item));
      localStore.setAdminModerationQueue(next.map(toModerationItem));
      return next;
    });
  }

  async function act(action: ModerationAction, reason?: string) {
    if (!selected || pending) return;
    const item = selected;
    setNotice(LOADING_LABELS[action]);
    setRegenMessage("");
    setActionError(null);
    setPending({ action, id: item.id });

    const payload = {
      title: item.title.trim() || item.originalTitle,
      content: item.content.trim() || undefined,
      reference: item.reference.trim(),
      criteria: item.criteriaText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      topic: item.topic,
      competency: item.competency,
      difficulty: (item.difficulty || "medium") as Difficulty,
    };

    try {
      if (action === "regenerate") {
        const updated = await adminService.regenerateModerationItem(item.id, payload);
        setQueue((current) => {
          const next = current.map((entry) =>
            entry.id === item.id
              ? { ...toEditable(updated), revision: (updated.revision ?? item.revision) + 1 }
              : entry,
          );
          localStore.setAdminModerationQueue(next.map(toModerationItem));
          return next;
        });
        const msg = "AI đã sinh bản đề xuất mới (A1) — vui lòng rà soát trước khi phê duyệt.";
        setNotice(msg);
        setRegenMessage(msg);
      } else {
        const result =
          action === "approve"
            ? await adminService.approveModerationItem(item.id, payload)
            : await adminService.rejectModerationItem(item.id, reason ?? "");

        setQueue((current) => {
          const next = current.filter((entry) => entry.id !== item.id);
          localStore.setAdminModerationQueue(next.map(toModerationItem));
          return next;
        });
        setProcessed((current) => {
          const next = [result, ...current];
          localStore.setAdminModerationHistory(next);
          return next;
        });
        setNotice(
          `${result.decision === "approved" ? "Đã phê duyệt" : "Đã từ chối"} “${result.title}”.`,
        );
      }
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mod-screen col stack-lg">
      <PageHeader
        eyebrow="Quản trị hệ thống"
        title="Kiểm duyệt nội dung"
        subtitle="Rà soát câu hỏi và bài tập trước khi đưa vào ngân hàng chính thức."
      />

      <Callout tone="brand">
        <div className="row wrap stack-sm">
          <RuleTag code="BR4">Nội dung đã phê duyệt</RuleTag>
          <p>
            Ngân hàng chính thức chỉ nhận nội dung đã phê duyệt; câu hỏi AI sinh trong phiên không
            tự vào kho.
          </p>
        </div>
      </Callout>

      {loadError && (
        <ErrorBanner
          title="Chưa tải được hàng chờ kiểm duyệt từ máy chủ"
          message={loadError}
          onRetry={reload}
        />
      )}

      {loading ? (
        <div className="mod-layout grid">
          <Card className="mod-card">
            <Skeleton width="55%" height={16} />
            <Skeleton width="100%" height={56} />
            <Skeleton width="100%" height={56} />
          </Card>
          <Card className="mod-card">
            <Skeleton width="40%" height={16} />
            <Skeleton width="100%" height={40} />
            <Skeleton width="100%" height={96} />
            <Skeleton width="100%" height={96} />
          </Card>
        </div>
      ) : queue.length === 0 ? (
        <EmptyState
          title="Hàng chờ kiểm duyệt đang trống"
          description="Chưa có câu hỏi hoặc bài tập mới nào cần rà soát theo quy định BR4. Nhấn tải lại để kiểm tra đề xuất mới từ hệ thống."
          actions={
            <Button variant="secondary" onClick={reload}>
              Tải lại hàng chờ
            </Button>
          }
        />
      ) : (
        <div className="mod-layout grid">
          <Queue
            items={visible}
            count={queue.length}
            filter={filter}
            onFilter={setFilter}
            selectedId={selected?.id}
            onSelect={select}
          />

          {selected ? (
            <ModerationEditor
              key={selected.id}
              item={selected}
              topicsMap={topicsMap}
              pending={pending?.id === selected.id ? pending.action : null}
              busy={Boolean(pending)}
              regeneratedToast={regenMessage}
              actionError={actionError}
              headingRef={headingRef}
              onEdit={edit}
              onAction={(action, reason) => void act(action, reason)}
            />
          ) : (
            <Card className="mod-card">
              <CardHead title="Chi tiết kiểm duyệt" />
              <p className="empty">Không còn mục nào đang chờ duyệt trong bộ lọc hiện tại.</p>
            </Card>
          )}
        </div>
      )}

      <p className="sr-only" role="status">
        {notice}
      </p>

      <Card className="card--flush mod-history mod-card">
        <CardHead title="Đã xử lý">
          <span className="t-body-s c-ink2 mod-tabular">{processed.length} mục</span>
        </CardHead>

        {processed.length === 0 ? (
          <p className="mod-history-empty t-body-s c-ink2">Chưa có nội dung đã xử lý.</p>
        ) : (
          <ul className="mod-history-list" role="list">
            {processed.map((item) => {
              const approved = item.decision === "approved";
              return (
                <li className="mod-history-entry" key={`${item.id}-${item.processedAt}`}>
                  <div className="col" style={{ gap: "4px" }}>
                    <div className="row wrap stack-sm">
                      <span className="t-body-s c-ink2">{KIND_LABELS[item.kind]}</span>
                      <span className="t-mono c-ink2 mod-tabular">{item.processedAt}</span>
                    </div>
                    <p className="t-heading-s">{item.title}</p>
                    {item.reason && <p className="t-body-s c-ink2">Lý do: {item.reason}</p>}
                  </div>

                  <Badge tone={approved ? "success" : "danger"} dot>
                    {approved ? "Đã phê duyệt" : "Đã từ chối"}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
