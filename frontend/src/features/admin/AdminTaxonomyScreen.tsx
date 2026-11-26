import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import {
  Badge,
  Button,
  Callout,
  Chip,
  ErrorBanner,
  Field,
  PageHeader,
  Skeleton,
} from "@shared/ui";
import { LEVELS, ROLE_FAMILIES } from "@shared/constants";
import { getErrorMessage } from "@shared/services/apiClient";
import { localStore } from "@shared/services/localStore";
import type {
  CareerLevel,
  CompetencyItem,
  KnowledgeDomain,
  KnowledgeTopic,
  TaxonomyAuditEntry,
} from "@shared/types";
import { adminService, type TaxonomyNodeKind } from "./admin.service";
import "./AdminTaxonomyScreen.css";

interface TaxNode {
  id: string;
  parentId?: string;
  kind: TaxonomyNodeKind;
  name: string;
  description?: string;
  level?: CareerLevel | "";
  roles?: string[];
  hidden?: boolean;
  practiced?: number;
  short?: string;
  jd?: boolean;
  avgScore?: number;
  lastPracticed?: string;
  mastery?: number;
}

interface NodeDraft {
  name: string;
  description: string;
  level: CareerLevel | "";
  roles: string[];
}

interface EditorState {
  node: TaxNode;
  draft: NodeDraft;
  creating: boolean;
}

interface EditorError {
  field?: "name";
  message: string;
}

const KIND_LABELS: Record<TaxonomyNodeKind, string> = {
  family: "Nhóm vai trò",
  role: "Vai trò",
  domain: "Domain",
  topic: "Topic",
  competency: "Competency",
};

const CHILD_KINDS: Partial<Record<TaxonomyNodeKind, TaxonomyNodeKind>> = {
  family: "role",
  domain: "topic",
  topic: "competency",
};

function buildRoleFamilyNodes(): TaxNode[] {
  return ROLE_FAMILIES.flatMap(({ family, roles }, index) => {
    const familyId = `family-${index}`;
    return [
      {
        id: familyId,
        kind: "family" as const,
        name: family,
        description: "Nhóm vị trí tuyển dụng chuẩn hóa.",
      },
      ...roles.map((role) => ({
        id: `role-${role}`,
        parentId: familyId,
        kind: "role" as const,
        name: role,
        level: "Fresher" as CareerLevel,
      })),
    ];
  });
}

function domainsToTaxNodes(domains: readonly KnowledgeDomain[]): TaxNode[] {
  return domains.flatMap((domain): TaxNode[] => [
    {
      id: domain.id,
      kind: "domain",
      name: domain.name,
      description: domain.description ?? "",
      hidden: Boolean(domain.disabled),
      level: domain.level ?? "",
      roles: domain.roles ?? [],
    },
    ...domain.topics.flatMap((topic): TaxNode[] => [
      {
        id: topic.id,
        parentId: domain.id,
        kind: "topic",
        name: topic.name,
        short: topic.short,
        jd: topic.jd,
        description: topic.description ?? "",
        practiced: topic.practiced,
        avgScore: topic.avgScore,
        lastPracticed: topic.lastPracticed,
        hidden: Boolean(topic.disabled),
        level: topic.level ?? "",
        roles: topic.roles ?? [],
      },
      ...topic.competencies.map(
        (comp, index): TaxNode => ({
          id: comp.id ?? `${topic.id}-comp-${index}`,
          parentId: topic.id,
          kind: "competency",
          name: comp.name,
          mastery: comp.mastery,
          description: comp.description ?? "",
          hidden: Boolean(comp.disabled),
          level: comp.level ?? "",
          roles: comp.roles ?? [],
        }),
      ),
    ]),
  ]);
}

function taxNodesToDomains(nodes: readonly TaxNode[]): KnowledgeDomain[] {
  const domains = nodes.filter((n) => n.kind === "domain");
  return domains.map((d) => {
    const topics: KnowledgeTopic[] = nodes
      .filter((n) => n.kind === "topic" && n.parentId === d.id)
      .map((t) => {
        const competencies: CompetencyItem[] = nodes
          .filter((n) => n.kind === "competency" && n.parentId === t.id)
          .map((c) => ({
            id: c.id,
            name: c.name,
            mastery: c.mastery ?? 0,
            disabled: Boolean(c.hidden),
            description: c.description,
            level: c.level || undefined,
            roles: c.roles,
          }));
        return {
          id: t.id,
          name: t.name,
          short: t.short || t.name,
          jd: Boolean(t.jd),
          description: t.description ?? "",
          competencies,
          practiced: t.practiced ?? 0,
          avgScore: t.avgScore ?? 0,
          lastPracticed: t.lastPracticed ?? "",
          disabled: Boolean(t.hidden),
          level: t.level || undefined,
          roles: t.roles,
        };
      });
    return {
      id: d.id,
      name: d.name,
      description: d.description,
      topics,
      disabled: Boolean(d.hidden),
      level: d.level || undefined,
      roles: d.roles,
    };
  });
}

function editableFields(node: TaxNode): NodeDraft {
  return {
    name: node.name,
    description: node.description ?? "",
    level: node.level ?? "",
    roles: node.roles ?? [],
  };
}

function descendantsOf(nodes: readonly TaxNode[], id: string): TaxNode[] {
  return nodes
    .filter((node) => node.parentId === id)
    .flatMap((node) => [node, ...descendantsOf(nodes, node.id)]);
}

function nameKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").normalize("NFC").toLocaleLowerCase("vi");
}

interface TaxonomyTreeProps {
  label: string;
  rootKind: TaxonomyNodeKind;
  nodes: readonly TaxNode[];
  expanded: Record<string, boolean>;
  selectedId?: string;
  onSelect: (node: TaxNode) => void;
  onExpand: (id: string) => void;
  onAddRoot: (kind: TaxonomyNodeKind) => void;
  footer?: ReactNode;
}

function TaxonomyTree({
  label,
  rootKind,
  nodes,
  expanded,
  selectedId,
  onSelect,
  onExpand,
  onAddRoot,
  footer,
}: TaxonomyTreeProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const roots = nodes.filter((node) => node.kind === rootKind);
  const childrenOf = (id: string) => nodes.filter((node) => node.parentId === id);
  const visible = roots.flatMap(function visibleBranch(node): TaxNode[] {
    return expanded[node.id] ? [node, ...childrenOf(node.id).flatMap(visibleBranch)] : [node];
  });
  const tabStop =
    visible.find((node) => node.id === focusedId) ??
    visible.find((node) => node.id === selectedId) ??
    visible[0];

  function focusNode(node: TaxNode | undefined) {
    if (!node) return;
    document.getElementById(`tax-treeitem-${node.id}`)?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const target = event.target as HTMLElement | null;
    const item = target?.closest<HTMLElement>('[role="treeitem"]');
    const index = visible.findIndex((node) => `tax-treeitem-${node.id}` === item?.id);
    if (index < 0) return;
    const node = visible[index];
    if (!node) return;
    const children = childrenOf(node.id);

    switch (event.key) {
      case "ArrowDown":
        focusNode(visible[index + 1] ?? node);
        break;
      case "ArrowUp":
        focusNode(visible[index - 1] ?? node);
        break;
      case "Home":
        focusNode(visible[0]);
        break;
      case "End":
        focusNode(visible[visible.length - 1]);
        break;
      case "ArrowRight":
        if (children.length > 0) {
          if (expanded[node.id]) focusNode(children[0]);
          else onExpand(node.id);
        }
        break;
      case "ArrowLeft":
        if (children.length > 0 && expanded[node.id]) onExpand(node.id);
        else if (node.parentId) focusNode(nodes.find((parent) => parent.id === node.parentId));
        break;
      case "Enter":
      case " ":
        onSelect(node);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  function renderBranch(node: TaxNode) {
    const children = childrenOf(node.id);
    const branch = children.length > 0;
    const open = branch && Boolean(expanded[node.id]);
    const itemId = `tax-treeitem-${node.id}`;

    return (
      <li
        key={node.id}
        id={itemId}
        role="treeitem"
        aria-labelledby={`${itemId}-label`}
        aria-selected={node.id === selectedId}
        aria-expanded={branch ? open : undefined}
        tabIndex={node.id === tabStop?.id ? 0 : -1}
        onFocus={(event) => {
          if (event.target === event.currentTarget) setFocusedId(node.id);
        }}
      >
        <div
          className="tax-tree-row"
          data-selected={node.id === selectedId}
          data-inactive={Boolean(node.hidden)}
        >
          {branch ? (
            <button
              type="button"
              tabIndex={-1}
              className="tax-disclosure"
              aria-label={`${open ? "Thu gọn" : "Mở rộng"} ${node.name}`}
              aria-expanded={open}
              onClick={() => {
                focusNode(node);
                onExpand(node.id);
              }}
            >
              <span className="tax-chevron" aria-hidden="true" />
            </button>
          ) : (
            <span className="tax-leaf" aria-hidden="true" />
          )}

          <button
            type="button"
            tabIndex={-1}
            className="tax-node"
            id={`${itemId}-label`}
            onClick={() => {
              focusNode(node);
              onSelect(node);
            }}
          >
            <span className="tax-node-name">{node.name}</span>
            {(node.practiced ?? 0) > 0 && (
              <span className="t-mono c-ink2 tax-tabular">{node.practiced}p</span>
            )}
            {node.hidden && (
              <span className="lc-diff lc-diff--medium">Đã ẩn</span>
            )}
          </button>
        </div>

        {open && <ul role="group">{children.map(renderBranch)}</ul>}
      </li>
    );
  }

  return (
    <section className="lc-pane tax-pane" aria-label={label}>
      <div className="lc-pane__head">
        <span className="tax-pane-title">{label}</span>
        <button type="button" className="tax-add-root" onClick={() => onAddRoot(rootKind)}>
          + Thêm
        </button>
      </div>

      <div className="lc-pane__body tax-tree-body">
        {roots.length > 0 ? (
          <ul role="tree" aria-label={label} className="tax-tree" onKeyDown={handleKeyDown}>
            {roots.map(renderBranch)}
          </ul>
        ) : (
          <div className="tax-empty col">
            <p className="t-body-s c-ink2">Chưa có nút gốc nào.</p>
            <Button variant="secondary" size="sm" onClick={() => onAddRoot(rootKind)}>
              Thêm {KIND_LABELS[rootKind].toLowerCase()}
            </Button>
          </div>
        )}
      </div>

      {footer && <div className="lc-pane__foot">{footer}</div>}
    </section>
  );
}

interface TaxonomyEditorProps {
  nodes: readonly TaxNode[];
  editor: EditorState | null;
  error: EditorError | null;
  savedToast: string;
  onChange: (changes: Partial<NodeDraft>) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onAdd: () => void;
  onCancel: () => void;
  onMove: (offset: -1 | 1) => void;
  onVisibility: () => void;
  onDelete: () => void;
}

function TaxonomyEditor({
  nodes,
  editor,
  error,
  savedToast,
  onChange,
  onSave,
  onAdd,
  onCancel,
  onMove,
  onVisibility,
  onDelete,
}: TaxonomyEditorProps) {
  if (!editor) {
    return (
      <section className="lc-pane tax-pane">
        <div className="lc-pane__head">
          <span className="tax-pane-title">Chi tiết nút</span>
        </div>
        <div className="lc-pane__body">
          <p className="empty">
            Chọn một nút trong cây bên trái để chỉnh sửa, hoặc nhấn <strong>+ Thêm</strong> để tạo
            Domain/Role mới.
          </p>
        </div>
      </section>
    );
  }

  const { node, draft, creating } = editor;
  const parent = nodes.find((item) => item.id === node.parentId);
  const siblings = nodes.filter(
    (item) => item.kind === node.kind && item.parentId === node.parentId,
  );
  const index = siblings.findIndex((item) => item.id === node.id);
  const families = nodes.filter((item) => item.kind === "family");

  return (
    <form className="lc-pane tax-pane tax-editor" onSubmit={onSave} noValidate>
      <div className="lc-pane__head">
        <span className="tax-pane-title">{creating ? "Thêm nút mới" : "Chi tiết nút"}</span>
        <div className="row stack-sm">
          {(node.practiced ?? 0) > 0 && (
            <span className="t-mono c-ink2 tax-tabular">{node.practiced} phiên</span>
          )}
          {node.hidden && (
            <Badge tone="warning" dot>
              Đã ẩn
            </Badge>
          )}
        </div>
      </div>

      <div className="lc-pane__body tax-editor-body">
        <div className="tax-inspector-head">
          <p className="t-body-s c-ink2">
            {KIND_LABELS[node.kind]}
            {parent ? ` · Thuộc ${parent.name}` : ""}
          </p>
          <h3 className="t-heading-m">
            {creating ? `Thêm ${KIND_LABELS[node.kind].toLowerCase()}` : node.name}
          </h3>
        </div>

        <Field
          id="tax-name"
          label="Tên"
          required
          placeholder={`Nhập tên ${KIND_LABELS[node.kind].toLowerCase()}…`}
          value={draft.name}
          onChange={(event) => onChange({ name: event.target.value })}
          error={error?.field === "name" ? error.message : undefined}
        />

        <Field
          label="Mô tả"
          multiline
          placeholder="Mô tả phạm vi đánh giá hoặc chuẩn đầu ra năng lực…"
          value={draft.description}
          onChange={(event) => onChange({ description: event.target.value })}
        />

        <div className="field">
          <label className="field__label" htmlFor="tax-level">
            Cấp độ
          </label>
          <select
            id="tax-level"
            className="select"
            value={draft.level}
            onChange={(event) => onChange({ level: event.target.value as CareerLevel | "" })}
          >
            <option value="">Chưa gán cấp độ</option>
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="tax-roles col stack-sm">
          <legend className="field__label">Liên kết vai trò</legend>
          {families.map((family) => {
            const roles = nodes.filter((item) => item.parentId === family.id);
            if (roles.length === 0) return null;

            return (
              <div key={family.id} className="col stack-sm">
                <p className="t-body-s c-ink2">{family.name}</p>
                <div className="row wrap stack-sm">
                  {roles.map((role) => (
                    <Chip
                      key={role.id}
                      active={draft.roles.includes(role.id)}
                      onClick={() =>
                        onChange({
                          roles: draft.roles.includes(role.id)
                            ? draft.roles.filter((id) => id !== role.id)
                            : [...draft.roles, role.id],
                        })
                      }
                    >
                      {role.name}
                      {role.hidden || family.hidden ? " · Đã ẩn" : ""}
                    </Chip>
                  ))}
                </div>
              </div>
            );
          })}
          {!nodes.some((item) => item.kind === "role") && (
            <p className="t-body-s c-ink2">Chưa có vai trò để liên kết.</p>
          )}
        </fieldset>

        {error && !error.field && (
          <div role="alert" className="col stack-sm">
            <Callout tone="danger" title="Không thể xóa nút đang tham chiếu (E1)">
              <p>{error.message}</p>
            </Callout>
            {!creating && !node.hidden && (
              <div>
                <Button variant="secondary" size="sm" onClick={onVisibility}>
                  Vô hiệu hóa thay vì xóa (A1)
                </Button>
              </div>
            )}
          </div>
        )}

        {savedToast && !error && (
          <Callout tone="success">
            <p>{savedToast}</p>
          </Callout>
        )}

        <div className="row wrap stack-sm">
          <Button variant="primary" size="sm" type="submit">
            Lưu
          </Button>
          {creating ? (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Hủy
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={onAdd}
              disabled={!CHILD_KINDS[node.kind]}
            >
              Thêm nút con
            </Button>
          )}
        </div>
      </div>

      {!creating && (
        <div className="lc-pane__foot tax-tools">
          <div className="row stack-sm" aria-label="Thứ tự nút" role="group">
            <Button
              variant="secondary"
              size="sm"
              className="tax-order"
              aria-label="Chuyển lên"
              title="Chuyển lên"
              disabled={index <= 0}
              onClick={() => onMove(-1)}
            >
              ↑
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="tax-order"
              aria-label="Chuyển xuống"
              title="Chuyển xuống"
              disabled={index >= siblings.length - 1}
              onClick={() => onMove(1)}
            >
              ↓
            </Button>
          </div>
          <div className="row wrap stack-sm">
            <Button variant="ghost" size="sm" onClick={onVisibility}>
              {node.hidden ? "Hiện lại" : "Vô hiệu hóa"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              Xóa
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

// UC17 — Quản lý danh mục tri thức (Taxonomy & Audit Log)
export default function AdminTaxonomyScreen() {
  const [nodes, setNodes] = useState<TaxNode[]>(() => [
    ...buildRoleFamilyNodes(),
    ...domainsToTaxNodes(localStore.getAdminTaxonomyDraft() ?? []),
  ]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "family-0": true,
    "family-1": true,
  });
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [log, setLog] = useState<TaxonomyAuditEntry[]>(() => localStore.getAdminTaxonomyLog());
  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState<number>(0);

  const [error, setError] = useState<EditorError | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [savedToast, setSavedToast] = useState<string>("");
  const nextId = useRef<number>(1);

  const selected = editor?.node ?? null;

  const reload = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setApiError(null);

    void Promise.all([
      adminService.getTaxonomy(controller.signal),
      adminService.getTaxonomyLogs(controller.signal).catch(() => localStore.getAdminTaxonomyLog()),
    ])
      .then(([domains, remoteLogs]) => {
        if (controller.signal.aborted) return;
        const domainNodes = domainsToTaxNodes(domains);
        localStore.setAdminTaxonomyDraft(domains);
        const mergedNodes = [...buildRoleFamilyNodes(), ...domainNodes];
        setNodes(mergedNodes);
        const autoExpand: Record<string, boolean> = { "family-0": true, "family-1": true };
        for (const d of domains) autoExpand[d.id] = true;
        setExpanded((prev) => ({ ...autoExpand, ...prev }));
        setLog(remoteLogs);
        localStore.setAdminTaxonomyLog(remoteLogs);
        setEditor((curr) => {
          if (curr) return curr;
          const firstDomain = domainNodes[0] ?? mergedNodes[0];
          return firstDomain
            ? { node: firstDomain, draft: editableFields(firstDomain), creating: false }
            : null;
        });
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setApiError(
          `${getErrorMessage(err)} Bạn vẫn có thể thêm, sửa, sắp xếp và ẩn nút cục bộ — mọi thay đổi và nhật ký được lưu vào trình duyệt.`,
        );
        setLoading(false);
      });

    return () => controller.abort();
  }, [reloadTick]);

  const persistDomains = useCallback((nextNodes: TaxNode[]) => {
    localStore.setAdminTaxonomyDraft(taxNodesToDomains(nextNodes));
  }, []);

  const domainCount = nodes.filter((n) => n.kind === "domain").length;
  const topicCount = nodes.filter((n) => n.kind === "topic").length;
  const compCount = nodes.filter((n) => n.kind === "competency").length;

  function select(node: TaxNode | null) {
    setEditor(node ? { node, draft: editableFields(node), creating: false } : null);
    setError(null);
    setSavedToast("");
  }

  function record(what: string) {
    const at = new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
    const actor = localStore.getUser()?.name ?? "Quản trị viên";
    const id = `change-${Date.now()}-${nextId.current++}`;
    setLog((current) => {
      const next = [{ id, at, who: actor, what }, ...current];
      localStore.setAdminTaxonomyLog(next);
      return next;
    });
    setNotice(what);
    setSavedToast(`Đã lưu: ${what}`);
    setError(null);
  }

  function startCreate(kind: TaxonomyNodeKind, parentId?: string) {
    const node: TaxNode = { id: "", kind, parentId, name: "" };
    setEditor({ node, draft: editableFields(node), creating: true });
    setError(null);
    setSavedToast("");
    window.requestAnimationFrame(() => document.getElementById("tax-name")?.focus());
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || !selected) return;

    const name = editor.draft.name.trim();
    const duplicate = nodes.some(
      (node) =>
        node.id !== selected.id &&
        node.kind === selected.kind &&
        node.parentId === selected.parentId &&
        nameKey(node.name) === nameKey(name),
    );
    if (!name || duplicate) {
      setError({
        field: "name",
        message: name
          ? "Tên này đã tồn tại trong cùng cấp (E2)."
          : "Vui lòng nhập tên của nút.",
      });
      document.getElementById("tax-name")?.focus();
      return;
    }

    const updated: TaxNode = {
      ...selected,
      ...editor.draft,
      name,
      description: editor.draft.description.trim(),
    };

    let nextNodes: TaxNode[];
    if (editor.creating) {
      updated.id = `node-${Date.now()}-${nextId.current++}`;
      nextNodes = [...nodes, updated];
      if (updated.parentId) {
        setExpanded((current) => ({ ...current, [updated.parentId!]: true }));
      }
      void adminService
        .createTaxonomyNode({
          kind: updated.kind,
          parentId: updated.parentId ?? null,
          name: updated.name,
          description: updated.description,
          level: updated.level,
          roles: updated.roles,
        })
        .catch(() => undefined);
    } else {
      nextNodes = nodes.map((node) => (node.id === updated.id ? updated : node));
      void adminService
        .updateTaxonomyNode(updated.id, {
          name: updated.name,
          description: updated.description,
          level: updated.level,
          roles: updated.roles,
        })
        .catch(() => undefined);
    }

    setNodes(nextNodes);
    persistDomains(nextNodes);
    setEditor({ node: updated, draft: editableFields(updated), creating: false });
    record(
      `${editor.creating ? "Thêm" : "Cập nhật"} ${KIND_LABELS[updated.kind].toLowerCase()} “${name}”`,
    );
  }

  function move(offset: -1 | 1) {
    if (!selected) return;
    const siblings = nodes.filter(
      (node) => node.kind === selected.kind && node.parentId === selected.parentId,
    );
    const currentIdx = siblings.findIndex((node) => node.id === selected.id);
    const neighbor = siblings[currentIdx + offset];
    if (!neighbor) return;

    const nextNodes = nodes.map((node) => {
      if (node.id === selected.id) return neighbor;
      return node.id === neighbor.id ? selected : node;
    });
    setNodes(nextNodes);
    persistDomains(nextNodes);

    const orderedIds = nextNodes
      .filter((node) => node.kind === selected.kind && node.parentId === selected.parentId)
      .map((node) => node.id);
    void adminService
      .reorderTaxonomyNodes(selected.parentId ?? null, orderedIds)
      .catch(() => undefined);

    record(`Chuyển “${selected.name}” ${offset < 0 ? "lên" : "xuống"} một vị trí`);
  }

  function toggleVisibility() {
    if (!selected) return;
    const updated: TaxNode = { ...selected, hidden: !selected.hidden };
    const nextNodes = nodes.map((node) => (node.id === updated.id ? updated : node));
    setNodes(nextNodes);
    persistDomains(nextNodes);
    setEditor((current) => (current ? { ...current, node: updated } : null));
    void adminService
      .updateTaxonomyNode(updated.id, { disabled: Boolean(updated.hidden) })
      .catch(() => undefined);
    record(`${updated.hidden ? "Vô hiệu hóa" : "Hiện lại"} “${updated.name}”`);
  }

  function remove() {
    if (!selected) return;
    const branch = [selected, ...descendantsOf(nodes, selected.id)];
    if (branch.some((node) => node.kind === "topic" && (node.practiced ?? 0) > 0)) {
      setError({ message: "Nút đang được tham chiếu — hãy vô hiệu hóa thay vì xóa" });
      return;
    }

    const removedIds = new Set(branch.map((node) => node.id));
    const remaining = nodes
      .filter((node) => !removedIds.has(node.id))
      .map((node) =>
        node.roles?.some((roleId) => removedIds.has(roleId))
          ? { ...node, roles: node.roles.filter((roleId) => !removedIds.has(roleId)) }
          : node,
      );
    setNodes(remaining);
    persistDomains(remaining);
    void adminService.deleteTaxonomyNode(selected.id).catch(() => undefined);

    const fallback =
      remaining.find((node) => node.id === selected.parentId) ??
      remaining.find((node) => node.kind === selected.kind) ??
      null;
    setEditor(fallback ? { node: fallback, draft: editableFields(fallback), creating: false } : null);
    record(`Xóa “${selected.name}”`);
  }

  const treeProps = {
    nodes,
    expanded,
    selectedId: editor?.creating ? selected?.parentId : selected?.id,
    onSelect: select,
    onExpand: (id: string) => setExpanded((current) => ({ ...current, [id]: !current[id] })),
    onAddRoot: (kind: TaxonomyNodeKind) => startCreate(kind),
  };

  return (
    <div className="tax-screen col stack-lg">
      <PageHeader
        eyebrow="Quản trị hệ thống"
        title="Danh mục tri thức"
        subtitle="Chuẩn hóa cây Role Family → Role và cấu trúc năng lực Domain → Topic → Competency."
        actions={
          <p className="t-body-s c-ink2 tax-tabular">
            {domainCount} domain · {topicCount} topic · {compCount} năng lực
          </p>
        }
      />

      {apiError && (
        <ErrorBanner
          title="Chế độ nháp cục bộ (API Quản trị chưa sẵn sàng)"
          message={apiError}
          onRetry={reload}
        />
      )}

      {loading ? (
        <div className="tax-layout">
          {[0, 1, 2].map((idx) => (
            <section className="lc-pane tax-pane" key={idx}>
              <div className="lc-pane__head">
                <Skeleton width="55%" height={14} />
              </div>
              <div className="tax-editor-body">
                <Skeleton width="100%" height={36} />
                <Skeleton width="88%" height={36} />
                <Skeleton width="92%" height={36} />
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="tax-layout">
          <TaxonomyTree
            label="Role Family → Role"
            rootKind="family"
            {...treeProps}
            footer={<span>Cấp độ hệ thống: {LEVELS.join(", ")}</span>}
          />

          <TaxonomyTree label="Domain → Topic → Competency" rootKind="domain" {...treeProps} />

          <TaxonomyEditor
            nodes={nodes}
            editor={editor}
            error={error}
            savedToast={savedToast}
            onChange={(changes) => {
              setEditor((current) =>
                current ? { ...current, draft: { ...current.draft, ...changes } } : null,
              );
              setError(null);
              setSavedToast("");
            }}
            onSave={save}
            onAdd={() => {
              if (!selected) return;
              const childKind = CHILD_KINDS[selected.kind];
              if (childKind) startCreate(childKind, selected.id);
            }}
            onCancel={() =>
              select(
                nodes.find((node) => node.id === selected?.parentId) ??
                  nodes.find((node) => node.kind === "domain") ??
                  null,
              )
            }
            onMove={move}
            onVisibility={toggleVisibility}
            onDelete={remove}
          />
        </div>
      )}

      <p className="sr-only" role="status">
        {notice}
      </p>

      {/* Audit Log Pane with Zebra .lc-list */}
      <section className="lc-pane tax-pane tax-log" aria-label="Nhật ký thay đổi">
        <div className="lc-pane__head">
          <span className="tax-pane-title">Nhật ký thay đổi</span>
          <span className="t-mono c-ink2 tax-tabular">{log.length} bản ghi</span>
        </div>

        {log.length === 0 ? (
          <p className="tax-log-empty t-body-s c-ink2">
            Chưa có thay đổi nào được ghi nhận trong nhật ký quản trị.
          </p>
        ) : (
          <ol role="list" className="lc-list tax-log-list">
            {log.map(({ id, what, who, at }) => (
              <li className="lc-list__row tax-log-entry" key={id ?? `${at}-${what}`}>
                <span className="t-mono c-ink2 tax-tabular">{at}</span>
                <span className="t-body-s t-strong">{what}</span>
                <span className="t-body-s c-ink2 tax-log-actor">{who}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
