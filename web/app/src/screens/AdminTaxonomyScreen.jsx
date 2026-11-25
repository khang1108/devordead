import { useRef, useState } from "react";
import { Badge, Button, Callout, Card, CardHead, Chip, Field, PageHeader } from "../components/ui.jsx";
import { adminUser, knowledgeTree, LEVELS, ROLE_FAMILIES, taxonomyLog } from "../data/mock.js";
import "./AdminTaxonomyScreen.css";

const kindLabels = {
  family: "Nhóm vai trò",
  role: "Vai trò",
  domain: "Domain",
  topic: "Topic",
  competency: "Competency",
};

const childKinds = { family: "role", domain: "topic", topic: "competency" };

const initialNodes = [
  ...ROLE_FAMILIES.flatMap(({ family, roles }, index) => {
    const id = `family-${index}`;
    return [
      { id, kind: "family", name: family },
      ...roles.map((role) => ({ id: `role-${role}`, parentId: id, kind: "role", name: role })),
    ];
  }),
  ...knowledgeTree.flatMap(({ topics, ...domain }) => [
    { ...domain, kind: "domain" },
    ...topics.flatMap(({ competencies, ...topic }) => [
      { ...topic, parentId: domain.id, kind: "topic" },
      ...competencies.map((competency, index) => ({
        ...competency,
        id: `${topic.id}-competency-${index}`,
        parentId: topic.id,
        kind: "competency",
      })),
    ]),
  ]),
];

function editableFields(node) {
  return {
    name: node.name,
    description: node.description ?? "",
    level: node.level ?? "",
    roles: node.roles ?? [],
  };
}

function descendantsOf(nodes, id) {
  return nodes.filter((node) => node.parentId === id).flatMap((node) => [node, ...descendantsOf(nodes, node.id)]);
}

function nameKey(name) {
  return name.trim().replace(/\s+/g, " ").normalize("NFC").toLocaleLowerCase("vi");
}

function TaxonomyTree({ label, rootKind, nodes, expanded, selectedId, onSelect, onExpand, onAddRoot }) {
  const [focusedId, setFocusedId] = useState(null);
  const roots = nodes.filter((node) => node.kind === rootKind);
  const childrenOf = (id) => nodes.filter((node) => node.parentId === id);
  const visible = roots.flatMap(function visibleBranch(node) {
    return expanded[node.id] ? [node, ...childrenOf(node.id).flatMap(visibleBranch)] : [node];
  });
  const tabStop = visible.find((node) => node.id === focusedId)
    ?? visible.find((node) => node.id === selectedId) ?? visible[0];

  function focusNode(node) {
    document.getElementById(`tax-treeitem-${node.id}`)?.focus();
  }

  function handleKeyDown(event) {
    const item = event.target.closest('[role="treeitem"]');
    const index = visible.findIndex((node) => `tax-treeitem-${node.id}` === item?.id);
    if (index < 0) return;
    const node = visible[index];
    const children = childrenOf(node.id);

    switch (event.key) {
      case "ArrowDown": focusNode(visible[index + 1] ?? node); break;
      case "ArrowUp": focusNode(visible[index - 1] ?? node); break;
      case "Home": focusNode(visible[0]); break;
      case "End": focusNode(visible.at(-1)); break;
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
      case " ": onSelect(node); break;
      default: return;
    }
    event.preventDefault();
  }

  function renderBranch(node) {
    const children = childrenOf(node.id);
    const branch = children.length > 0;
    const open = branch && !!expanded[node.id];
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
        <div className="tax-tree-row" data-selected={node.id === selectedId} data-inactive={!!node.hidden}>
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
          ) : <span className="tax-leaf" aria-hidden="true" />}
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
            <span>{node.name}</span>
            {node.hidden && <Badge>Đã ẩn</Badge>}
          </button>
        </div>
        {open && <ul role="group">{children.map(renderBranch)}</ul>}
      </li>
    );
  }

  return (
    <Card className="tax-tree-card" variant="tight">
      <CardHead title={label} />
      {roots.length > 0 ? (
        <ul role="tree" aria-label={label} className="tax-tree" onKeyDown={handleKeyDown}>
          {roots.map(renderBranch)}
        </ul>
      ) : (
        <div className="tax-empty col">
          <p className="t-body-s c-ink2">Chưa có nút nào.</p>
          <Button variant="secondary" onClick={() => onAddRoot(rootKind)}>Thêm {kindLabels[rootKind].toLowerCase()}</Button>
        </div>
      )}
    </Card>
  );
}

function TaxonomyEditor({ nodes, editor, error, onChange, onSave, onAdd, onCancel, onMove, onVisibility, onDelete }) {
  if (!editor) {
    return (
      <Card>
        <CardHead title="Chi tiết nút" />
        <p className="empty">Chọn một nút trong cây để chỉnh sửa.</p>
      </Card>
    );
  }

  const { node, draft, creating } = editor;
  const parent = nodes.find((item) => item.id === node.parentId);
  const siblings = nodes.filter((item) => item.kind === node.kind && item.parentId === node.parentId);
  const index = siblings.findIndex((item) => item.id === node.id);
  const families = nodes.filter((item) => item.kind === "family");

  return (
    <Card as="form" className="tax-editor" onSubmit={onSave} noValidate>
      <CardHead title={creating ? "Thêm nút" : "Chi tiết nút"}>
        {node.hidden && <Badge>Đã ẩn</Badge>}
      </CardHead>
      <div>
        <p className="t-mono c-brand">{kindLabels[node.kind]}</p>
        <h3 className="t-heading-m">{creating ? `Thêm ${kindLabels[node.kind].toLowerCase()}` : node.name}</h3>
        {parent && <p className="t-body-s c-ink2">Thuộc {parent.name}</p>}
      </div>
      <Field
        id="tax-name"
        label="Tên"
        required
        value={draft.name}
        onChange={(event) => onChange({ name: event.target.value })}
        error={error?.field === "name" ? error.message : undefined}
      />
      <Field label="Mô tả" multiline value={draft.description} onChange={(event) => onChange({ description: event.target.value })} />
      <div className="field">
        <label className="field__label" htmlFor="tax-level">Cấp độ</label>
        <select id="tax-level" className="select" value={draft.level} onChange={(event) => onChange({ level: event.target.value })}>
          <option value="">Chưa gán cấp độ</option>
          {LEVELS.map((level) => <option key={level}>{level}</option>)}
        </select>
      </div>
      <fieldset className="tax-roles col stack-sm">
        <legend className="field__label">Liên kết Role</legend>
        {families.map((family) => {
          const roles = nodes.filter((item) => item.parentId === family.id);
          if (roles.length === 0) return null;

          return (
            <div key={family.id} className="col stack-sm">
              <p className="t-body-s c-ink2">{family.name}</p>
              <div className="row wrap stack-sm">
                {roles.map((role) => (
                  <Chip key={role.id} active={draft.roles.includes(role.id)} onClick={() => onChange({
                    roles: draft.roles.includes(role.id) ? draft.roles.filter((id) => id !== role.id) : [...draft.roles, role.id],
                  })}>
                    {role.name}{role.hidden || family.hidden ? " · Đã ẩn" : ""}
                  </Chip>
                ))}
              </div>
            </div>
          );
        })}
        {!nodes.some((item) => item.kind === "role") && <p className="t-body-s c-ink2">Chưa có vai trò để liên kết.</p>}
      </fieldset>
      {error && !error.field && <div role="alert"><Callout tone="danger">{error.message}</Callout></div>}
      <div className="row wrap stack-sm">
        <Button variant="accent" type="submit">Lưu</Button>
        {creating ? (
          <Button variant="ghost" onClick={onCancel}>Hủy</Button>
        ) : (
          <Button variant="secondary" onClick={onAdd} disabled={!childKinds[node.kind]}>Thêm nút con</Button>
        )}
      </div>
      {!creating && (
        <div className="tax-tools row wrap between stack-sm">
          <div className="row stack-sm" aria-label="Thứ tự nút" role="group">
            <Button variant="secondary" className="tax-order" aria-label="Chuyển lên" title="Chuyển lên" disabled={index <= 0} onClick={() => onMove(-1)}>↑</Button>
            <Button variant="secondary" className="tax-order" aria-label="Chuyển xuống" title="Chuyển xuống" disabled={index >= siblings.length - 1} onClick={() => onMove(1)}>↓</Button>
          </div>
          <div className="row wrap stack-sm">
            <Button variant="ghost" onClick={onVisibility}>{node.hidden ? "Hiện lại" : "Vô hiệu hóa"}</Button>
            <Button variant="ghost" onClick={onDelete}>Xóa</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function AdminTaxonomyScreen() {
  const [nodes, setNodes] = useState(initialNodes);
  const [expanded, setExpanded] = useState({ "family-0": true, db: true, indexing: true });
  const [editor, setEditor] = useState(() => {
    const node = initialNodes.find((item) => item.id === "indexing");
    return { node, draft: editableFields(node), creating: false };
  });
  const [log, setLog] = useState(taxonomyLog);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState("");
  const nextId = useRef(1);
  const selected = editor?.node;

  function select(node) {
    setEditor(node ? { node, draft: editableFields(node), creating: false } : null);
    setError(null);
  }

  function record(what) {
    const at = new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    }).format(new Date());
    const id = `change-${nextId.current++}`;
    setLog((current) => [{ id, at, who: adminUser.name, what }, ...current]);
    setNotice(what);
    setError(null);
  }

  function startCreate(kind, parentId) {
    const node = { kind, parentId, name: "" };
    setEditor({ node, draft: editableFields(node), creating: true });
    setError(null);
    window.requestAnimationFrame(() => document.getElementById("tax-name")?.focus());
  }

  function save(event) {
    event.preventDefault();
    const name = editor.draft.name.trim();
    const duplicate = nodes.some((node) =>
      node.id !== selected.id && node.kind === selected.kind
      && node.parentId === selected.parentId && nameKey(node.name) === nameKey(name),
    );
    if (!name || duplicate) {
      setError({ field: "name", message: name ? "Tên này đã tồn tại trong cùng cấp." : "Nhập tên của nút." });
      document.getElementById("tax-name")?.focus();
      return;
    }

    const updated = { ...selected, ...editor.draft, name, description: editor.draft.description.trim() };
    if (editor.creating) {
      updated.id = `custom-node-${nextId.current++}`;
      setNodes((current) => [...current, updated]);
      if (updated.parentId) setExpanded((current) => ({ ...current, [updated.parentId]: true }));
    } else {
      setNodes((current) => current.map((node) => node.id === updated.id ? updated : node));
    }
    select(updated);
    record(`${editor.creating ? "Thêm" : "Cập nhật"} ${kindLabels[updated.kind].toLowerCase()} “${name}”`);
  }

  function move(offset) {
    const siblings = nodes.filter((node) => node.kind === selected.kind && node.parentId === selected.parentId);
    const neighbor = siblings[siblings.findIndex((node) => node.id === selected.id) + offset];
    if (!neighbor) return;
    setNodes((current) => current.map((node) => {
      if (node.id === selected.id) return neighbor;
      return node.id === neighbor.id ? selected : node;
    }));
    record(`Chuyển “${selected.name}” ${offset < 0 ? "lên" : "xuống"} một vị trí`);
  }

  function toggleVisibility() {
    const updated = { ...selected, hidden: !selected.hidden };
    setNodes((current) => current.map((node) => node.id === updated.id ? updated : node));
    setEditor((current) => ({ ...current, node: updated }));
    record(`${updated.hidden ? "Vô hiệu hóa" : "Hiện lại"} “${updated.name}”`);
  }

  function remove() {
    const branch = [selected, ...descendantsOf(nodes, selected.id)];
    if (branch.some((node) => node.kind === "topic" && node.practiced > 0)) {
      setError({ message: "Nút đang được tham chiếu — hãy vô hiệu hóa thay vì xóa" });
      return;
    }

    const removed = new Set(branch.map((node) => node.id));
    const remaining = nodes.filter((node) => !removed.has(node.id)).map((node) =>
      node.roles?.some((id) => removed.has(id)) ? { ...node, roles: node.roles.filter((id) => !removed.has(id)) } : node,
    );
    setNodes(remaining);
    select(remaining.find((node) => node.id === selected.parentId) ?? remaining.find((node) => node.kind === selected.kind));
    record(`Xóa “${selected.name}”`);
  }

  const treeProps = {
    nodes,
    expanded,
    selectedId: editor?.creating ? selected.parentId : selected?.id,
    onSelect: select,
    onExpand: (id) => setExpanded((current) => ({ ...current, [id]: !current[id] })),
    onAddRoot: startCreate,
  };

  return (
    <div className="tax-screen col stack-lg">
      <PageHeader
        eyebrow="QUẢN TRỊ — DANH MỤC TRI THỨC"
        title="Quản lý danh mục tri thức"
        subtitle="Tổ chức cây tri thức, cấp độ và liên kết theo vai trò."
      />
      <div className="tax-layout grid">
        <TaxonomyTree label="Nhóm vai trò → Vai trò" rootKind="family" {...treeProps} />
        <TaxonomyTree label="Domain → Topic → Competency" rootKind="domain" {...treeProps} />
        <TaxonomyEditor
          nodes={nodes}
          editor={editor}
          error={error}
          onChange={(changes) => {
            setEditor((current) => ({ ...current, draft: { ...current.draft, ...changes } }));
            setError(null);
          }}
          onSave={save}
          onAdd={() => startCreate(childKinds[selected.kind], selected.id)}
          onCancel={() => select(nodes.find((node) => node.id === selected.parentId))}
          onMove={move}
          onVisibility={toggleVisibility}
          onDelete={remove}
        />
      </div>
      <p className="sr-only" role="status">{notice}</p>
      <Card className="tax-log" variant="flush">
        <CardHead title="Nhật ký thay đổi" />
        <ol role="list">
          {log.map(({ id, what, who, at }) => (
            <li className="tax-log-entry" key={id ?? `${at}-${what}`}>
              <p className="t-mono c-ink2">{at}</p>
              <p className="t-body-s t-strong">{what}</p>
              <p className="t-body-s c-ink2">{who}</p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
