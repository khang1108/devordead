import { useEffect, useRef, useState } from "react";
import { Badge, Button, Callout, Card, CardHead, Field, PageHeader, RuleTag, Tabs } from "../components/ui.jsx";
import { DIFFICULTY, knowledgeTree, moderationQueue } from "../data/mock.js";
import "./AdminModerationScreen.css";

const kindLabels = { question: "Câu hỏi", problem: "Bài tập" };
const filters = [
  { value: "all", label: "Tất cả" },
  { value: "question", label: "Câu hỏi" },
  { value: "problem", label: "Bài tập" },
];

const contentVariants = {
  "q-101": [
    "Giải thích khi nào nên dùng partial index thay cho index thường. Cho ví dụ về một điều kiện lọc phù hợp.",
    "Một bảng đơn hàng có 5% bản ghi đang hoạt động và hầu hết truy vấn chỉ đọc nhóm này. Hãy đề xuất partial index và so sánh kích thước, chi phí ghi với index toàn bảng.",
  ],
  "q-102": [
    "Cài đặt lớp nhận một số nguyên k và một mảng ban đầu. Với mỗi lần thêm một giá trị, trả về phần tử lớn thứ k trong luồng. Các phần tử trùng nhau được tính riêng.",
    "Thiết kế lớp KthLargest(k, nums) với phương thức add(val). Trả về phần tử lớn thứ k sau mỗi lần thêm mà không sắp xếp lại toàn bộ luồng. Giả sử luôn có ít nhất k phần tử sau mỗi lần gọi add.",
  ],
  "q-103": [
    "Giải thích sự khác nhau giữa mã trạng thái HTTP 401 và 403. Nêu ví dụ cho từng mã.",
    "Một API nhận hai yêu cầu: yêu cầu đầu dùng token hết hạn, yêu cầu sau dùng token hợp lệ nhưng thiếu quyền quản trị. Chọn mã HTTP cho từng yêu cầu và giải thích.",
  ],
  "q-104": [
    "Giải thích cách PostgreSQL dùng MVCC để xác định phiên bản dòng mà một giao dịch có thể nhìn thấy. Liên hệ với mức cô lập giao dịch.",
    "Hai giao dịch cùng đọc và cập nhật một dòng trong PostgreSQL. Hãy mô tả snapshot, vai trò của xmin/xmax và cách mức cô lập ảnh hưởng đến phiên bản dòng được nhìn thấy.",
  ],
};

const topics = new Map(
  knowledgeTree.flatMap(({ topics: entries }) =>
    entries.map(({ name, competencies }) => [
      name,
      new Set(competencies.map((item) => item.name)),
    ]),
  ),
);
for (const { topic, competency } of moderationQueue) {
  if (!topics.has(topic)) topics.set(topic, new Set());
  topics.get(topic).add(competency);
}

const requiredFields = {
  title: "Tiêu đề",
  content: "Nội dung",
  reference: "Đáp án tham chiếu",
  criteria: "Tiêu chí chấm",
  topic: "Topic",
  competency: "Competency",
  difficulty: "Độ khó",
};

const loadingLabels = {
  approve: "Đang phê duyệt…",
  reject: "Đang từ chối…",
  regenerate: "AI đang đề xuất lại…",
};

function Queue({ items, count, filter, onFilter, selectedId, onSelect }) {
  function navigateQueue(event) {
    const options = [...event.currentTarget.querySelectorAll('[role="option"]')];
    const index = options.indexOf(event.target);
    if (index < 0) return;

    let next;
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
    onSelect(items[next].id);
    options[next].focus();
  }

  return (
    <Card variant="flush" className="mod-queue mod-card">
      <div className="mod-queue-head">
        <CardHead title="Hàng chờ">
          <Badge tone="brand" dot>{count} chờ duyệt</Badge>
        </CardHead>
        <Tabs tabs={filters} value={filter} onChange={onFilter} label="Loại nội dung" />
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
                    {kindLabels[item.kind]}
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

function AssignmentSelect({ name, label, value, options, onChange, error }) {
  const id = `mod-${name}`;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
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
          <option value={option} key={option}>{text}</option>
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

function ModerationEditor({ item, pending, busy, regeneratedToast, headingRef, onEdit, onAction }) {
  const [errors, setErrors] = useState({});
  const [missingList, setMissingList] = useState([]);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const reasonInput = useRef(null);

  useEffect(() => {
    if (rejecting) reasonInput.current?.focus();
  }, [rejecting]);

  function change(name, value) {
    onEdit(name === "topic" ? { topic: value, competency: "" } : { [name]: value });
    setErrors((current) => ({ ...current, [name]: "" }));
    setMissingList((prev) => prev.filter((field) => field !== name));
  }

  function approve(event) {
    event.preventDefault();
    const missing = Object.keys(requiredFields).filter((name) => !item[name].trim());
    if (missing.length) {
      setMissingList(missing);
      setErrors(
        Object.fromEntries(
          missing.map((name) => [name, `Vui lòng điền ${requiredFields[name].toLowerCase()}.`]),
        ),
      );
      document.getElementById(`mod-${missing[0]}`)?.focus();
      return;
    }
    setMissingList([]);
    onAction("approve");
  }

  function reject() {
    if (!reason.trim()) {
      setErrors((current) => ({ ...current, reason: "Vui lòng nhập lý do từ chối (A2)." }));
      reasonInput.current?.focus();
      return;
    }
    onAction("reject", reason.trim());
  }

  function fieldProps(name) {
    return {
      id: `mod-${name}`,
      value: item[name],
      onChange: (event) => change(name, event.target.value),
      required: true,
      error: errors[name],
    };
  }

  return (
    <Card
      as="form"
      className="mod-editor mod-card"
      onSubmit={approve}
      noValidate
      aria-busy={!!pending}
    >
      <div className="row between wrap">
        <h2 className="t-body-s t-strong c-ink2" ref={headingRef} tabIndex={-1}>
          Chi tiết kiểm duyệt · <span className="t-mono">#{item.id}</span>
        </h2>
        <div className="row stack-sm">
          <span className="t-body-s c-ink2 mod-tabular">Bản nháp #{item.revision + 1}</span>
          <Badge tone="warning" dot>Chờ duyệt</Badge>
        </div>
      </div>

      <div className="mod-source row between wrap">
        <div>
          <p className="t-heading-s">{kindLabels[item.kind]}</p>
          <p className="t-body-s c-ink2 mod-tabular">
            Nguồn: {item.source} · {item.createdAt}
          </p>
        </div>
      </div>

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
              <strong>{missingList.map((key) => requiredFields[key]).join(", ")}</strong>.
            </p>
          </Callout>
        </div>
      )}

      <fieldset className="mod-fields col" disabled={!!pending}>
        <Field label="Tiêu đề" {...fieldProps("title")} />
        <Field label="Nội dung" multiline {...fieldProps("content")} />
        <Field label="Đáp án tham chiếu" multiline {...fieldProps("reference")} />
        <Field
          label="Tiêu chí chấm"
          multiline
          hint="Mỗi tiêu chí viết trên một dòng."
          {...fieldProps("criteria")}
        />

        <div className="mod-assignment grid">
          <AssignmentSelect
            name="topic"
            label="Topic"
            value={item.topic}
            error={errors.topic}
            options={[...topics.keys()].map((name) => [name, name])}
            onChange={(value) => change("topic", value)}
          />
          <AssignmentSelect
            name="competency"
            label="Competency"
            value={item.competency}
            error={errors.competency}
            options={[...(topics.get(item.topic) ?? [])].map((name) => [name, name])}
            onChange={(value) => change("competency", value)}
          />
          <AssignmentSelect
            name="difficulty"
            label="Độ khó"
            value={item.difficulty}
            error={errors.difficulty}
            options={Object.entries(DIFFICULTY).map(([key, value]) => [key, value.label])}
            onChange={(value) => change("difficulty", value)}
          />
        </div>
      </fieldset>

      {rejecting && (
        <div className="mod-rejection col">
          <Field
            ref={reasonInput}
            label="Lý do từ chối (bắt buộc)"
            multiline
            required
            placeholder="Nêu rõ lý do loại bỏ nội dung này…"
            value={reason}
            error={errors.reason}
            disabled={!!pending}
            onChange={(event) => {
              setReason(event.target.value);
              setErrors((current) => ({ ...current, reason: "" }));
            }}
          />
          <div className="row wrap stack-sm">
            <Button variant="primary" onClick={reject} disabled={busy}>
              {pending === "reject" && <span className="spinner" aria-hidden="true" />}
              {pending === "reject" ? loadingLabels.reject : "Xác nhận từ chối"}
            </Button>
            <Button
              variant="ghost"
              disabled={!!pending}
              onClick={() => {
                setRejecting(false);
                setReason("");
                setErrors((current) => ({ ...current, reason: "" }));
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
          {pending === "approve" ? loadingLabels.approve : "Phê duyệt"}
        </Button>

        {!rejecting && (
          <Button variant="secondary" disabled={busy} onClick={() => setRejecting(true)}>
            Từ chối
          </Button>
        )}

        <Button
          variant="ghost"
          disabled={busy || rejecting}
          onClick={() => {
            setErrors((current) => ({ ...current, content: "" }));
            onAction("regenerate");
          }}
        >
          {pending === "regenerate" && <span className="spinner" aria-hidden="true" />}
          {pending === "regenerate" ? loadingLabels.regenerate : "Yêu cầu AI đề xuất lại"}
        </Button>
      </div>
    </Card>
  );
}

export default function AdminModerationScreen() {
  const [queue, setQueue] = useState(() =>
    moderationQueue.map((item) => ({
      ...item,
      originalTitle: item.title,
      content: contentVariants[item.id][0],
      criteria: item.criteria.join("\n"),
      revision: 0,
    })),
  );
  const [processed, setProcessed] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(queue[0]?.id);
  const [pending, setPending] = useState(null);
  const [notice, setNotice] = useState("");
  const [regenMessage, setRegenMessage] = useState("");
  const timeout = useRef(null);
  const heading = useRef(null);

  const visible = queue.filter((item) => filter === "all" || item.kind === filter);
  const selected = visible.find((item) => item.id === selectedId) ?? visible[0];

  useEffect(() => () => window.clearTimeout(timeout.current), []);

  function select(id, showEditor = false) {
    setSelectedId(id);
    setRegenMessage("");
    if (showEditor) window.requestAnimationFrame(() => heading.current?.focus());
  }

  function edit(changes) {
    setRegenMessage("");
    setQueue((current) =>
      current.map((item) => (item.id === selected.id ? { ...item, ...changes } : item)),
    );
  }

  function act(action, reason) {
    if (!selected || pending) return;
    const item = selected;
    setNotice(loadingLabels[action]);
    setRegenMessage("");
    setPending({ action, id: item.id });

    timeout.current = window.setTimeout(() => {
      if (action === "regenerate") {
        const variants = contentVariants[item.id];
        const proposed = variants[(item.revision + 1) % variants.length];
        const content =
          proposed === item.content ? variants[item.revision % variants.length] : proposed;
        setQueue((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, content, revision: item.revision + 1 } : entry,
          ),
        );
        const msg = "AI đã sinh bản đề xuất mới (A1) — vui lòng rà soát trước khi phê duyệt.";
        setNotice(msg);
        setRegenMessage(msg);
      } else {
        const approved = action === "approve";
        const title = item.title.trim() || item.originalTitle;
        const processedAt = new Intl.DateTimeFormat("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date());

        setQueue((current) => current.filter((entry) => entry.id !== item.id));
        setProcessed((current) => [
          {
            ...item,
            title,
            approved,
            processedAt,
            reason: approved
              ? "Đã kiểm tra nội dung, đáp án tham chiếu và tiêu chí chấm."
              : reason,
          },
          ...current,
        ]);
        setNotice(`${approved ? "Đã phê duyệt" : "Đã từ chối"} “${title}”.`);
      }
      setPending(null);
    }, 900);
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
            Ngân hàng chính thức chỉ nhận nội dung đã phê duyệt; câu hỏi AI sinh trong phiên không tự vào kho.
          </p>
        </div>
      </Callout>

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
            pending={pending?.id === selected.id ? pending.action : null}
            busy={!!pending}
            regeneratedToast={regenMessage}
            headingRef={heading}
            onEdit={edit}
            onAction={act}
          />
        ) : (
          <Card className="mod-card">
            <CardHead title="Chi tiết kiểm duyệt" />
            <p className="empty">Không còn mục nào đang chờ duyệt trong bộ lọc hiện tại.</p>
          </Card>
        )}
      </div>

      <p className="sr-only" role="status">{notice}</p>

      <Card className="mod-history mod-card" variant="flush">
        <CardHead title="Đã xử lý">
          <span className="t-body-s c-ink2 mod-tabular">{processed.length} mục</span>
        </CardHead>

        {processed.length === 0 ? (
          <p className="mod-history-empty t-body-s c-ink2">
            Chưa có nội dung đã xử lý.
          </p>
        ) : (
          <ul className="mod-history-list" role="list">
            {processed.map((item) => (
              <li className="mod-history-entry" key={item.id}>
                <div className="col" style={{ gap: "4px" }}>
                  <div className="row wrap stack-sm">
                    <span className="t-body-s c-ink2">{kindLabels[item.kind]}</span>
                    {item.topic && <span className="t-body-s c-ink2">· {item.topic}</span>}
                    <span className="t-mono c-ink2 mod-tabular">{item.processedAt}</span>
                  </div>
                  <p className="t-heading-s">{item.title}</p>
                  <p className="t-body-s c-ink2">Lý do: {item.reason}</p>
                </div>

                <Badge tone={item.approved ? "success" : "danger"} dot>
                  {item.approved ? "Đã phê duyệt" : "Đã từ chối"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
