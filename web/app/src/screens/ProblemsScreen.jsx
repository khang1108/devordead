import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, CardHead, Chip, Field, PageHeader, RuleTag } from "../components/ui.jsx";
import { DIFFICULTY, problems, PROBLEM_STATUS } from "../data/mock.js";
import "./ProblemsScreen.css";

const topics = [...new Set(problems.map(({ topic }) => topic))];
const roles = [...new Set(problems.map(({ role }) => role))];

function normalizeText(text) {
  return text
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replaceAll("đ", "d");
}

const solvedCount = problems.filter((p) => p.status === "solved").length;
const attemptedCount = problems.filter((p) => p.status === "attempted").length;
const todoCount = problems.filter((p) => p.status === "todo").length;

function ProblemPreview({ problem }) {
  const navigate = useNavigate();
  const difficulty = DIFFICULTY[problem.difficulty];
  const status = PROBLEM_STATUS[problem.status];

  return (
    <Card className="prob-preview" aria-labelledby="prob-preview-title">
      <CardHead title="Xem trước bài tập">
        <span className="t-mono c-ink2 prob-tabular">#{problem.id}</span>
      </CardHead>

      <div className="col stack-sm">
        <div className="row wrap stack-sm">
          <Badge tone={difficulty.tone} dot>{difficulty.label}</Badge>
          <Badge tone={status.tone} dot>{status.label}</Badge>
        </div>
        <h3 className="t-heading-m" id="prob-preview-title">{problem.title}</h3>
        <p className="t-body-s c-ink2 prob-tabular">
          {problem.topic} · {problem.role} · {problem.tests} ca kiểm thử
        </p>
        <p className="t-body-s c-ink2">{problem.description}</p>
      </div>

      <section className="col stack-sm prob-preview-section" aria-labelledby="prob-constraints">
        <h4 className="t-body-s t-strong c-ink2" id="prob-constraints">Ràng buộc</h4>
        <ul className="prob-constraints">
          {problem.constraints.map((constraint) => (
            <li className="t-code" key={constraint}>{constraint}</li>
          ))}
        </ul>
      </section>

      <section className="col stack-sm prob-preview-section" aria-labelledby="prob-examples">
        <h4 className="t-body-s t-strong c-ink2" id="prob-examples">Ví dụ</h4>
        {problem.examples.map(({ input, output }) => (
          <pre className="code-block prob-example" key={input}>
            <code>
              Input: {input}{"\n"}Output: {output}
            </code>
          </pre>
        ))}
      </section>

      <div className="col stack-sm prob-preview-cta">
        <Button variant="primary" block onClick={() => navigate(`/problems/${problem.id}`)}>
          Làm bài <span aria-hidden="true">→</span>
        </Button>
        <p className="t-body-s c-ink2 prob-approved prob-tabular">
          Đã duyệt · {problem.approvedAt}
        </p>
      </div>
    </Card>
  );
}

export default function ProblemsScreen() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [difficulties, setDifficulties] = useState([]);
  const [topic, setTopic] = useState("");
  const [role, setRole] = useState("");
  const [selectedId, setSelectedId] = useState(problems[0].id);
  const [focusedId, setFocusedId] = useState(null);

  const query = normalizeText(search.trim());
  const hasFilters = Boolean(query || difficulties.length || topic || role);

  const matchingProblems = problems.filter(
    (problem) =>
      (normalizeText(problem.title).includes(query) ||
        normalizeText(problem.topic).includes(query) ||
        problem.id.includes(query)) &&
      (!difficulties.length || difficulties.includes(problem.difficulty)) &&
      (!topic || problem.topic === topic) &&
      (!role || problem.role === role),
  );

  const selected =
    matchingProblems.find((problem) => problem.id === selectedId) ?? matchingProblems[0];
  const activeId = matchingProblems.some(({ id }) => id === focusedId) ? focusedId : selected?.id;

  function toggleDifficulty(difficulty) {
    setDifficulties((previous) =>
      previous.includes(difficulty)
        ? previous.filter((value) => value !== difficulty)
        : [...previous, difficulty],
    );
  }

  function resetFilters() {
    setSearch("");
    setDifficulties([]);
    setTopic("");
    setRole("");
  }

  function handleRowKeys(event) {
    const buttons = Array.from(event.currentTarget.querySelectorAll(".prob-row-button"));
    const index = buttons.indexOf(event.target);
    if (index === -1) return;

    const nextIndex = {
      ArrowDown: index + 1,
      ArrowUp: index - 1,
      Home: 0,
      End: buttons.length - 1,
    }[event.key];
    if (nextIndex === undefined) return;

    event.preventDefault();
    const targetBtn = buttons[nextIndex];
    if (targetBtn) {
      targetBtn.focus();
      const nextProblem = matchingProblems[nextIndex];
      if (nextProblem) setSelectedId(nextProblem.id);
    }
  }

  return (
    <div className="col stack-lg prob-screen">
      <PageHeader
        eyebrow="Bài tập lập trình"
        title="Ngân hàng bài tập"
        subtitle="Tất cả bài tập đều được kiểm duyệt trước khi chấm tự động trong Docker Sandbox cô lập."
        actions={<RuleTag code="BR4">Chỉ bài đã duyệt</RuleTag>}
      />

      <div className="col stack-sm prob-toolbar" aria-label="Bộ lọc bài tập">
        <div className="grid prob-filter-fields">
          <Field
            label="Tìm bài tập"
            placeholder="Tên bài, mã #001 hoặc chủ đề…"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <label className="field">
            <span className="field__label">Chủ đề</span>
            <select
              className="select"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
            >
              <option value="">Tất cả chủ đề</option>
              {topics.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Vai trò</span>
            <select
              className="select"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="">Tất cả vai trò</option>
              {roles.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="row between wrap">
          <div className="row wrap prob-difficulties" role="group" aria-label="Độ khó">
            <span className="t-body-s c-ink2">Độ khó:</span>
            {Object.entries(DIFFICULTY).map(([value, { label }]) => (
              <Chip
                key={value}
                active={difficulties.includes(value)}
                onClick={() => toggleDifficulty(value)}
              >
                {label}
              </Chip>
            ))}
            {hasFilters && (
              <Button variant="ghost" onClick={resetFilters}>
                Xóa bộ lọc
              </Button>
            )}
          </div>

          <p className="t-body-s c-ink2 prob-tabular">
            {solvedCount} đã giải · {attemptedCount} đang làm · {todoCount} chưa làm
          </p>
        </div>
      </div>

      <div className={`grid prob-layout${selected ? "" : " prob-layout-empty"}`}>
        <Card variant="flush" className="prob-results">
          <div className="prob-results-head">
            <CardHead title="Danh sách bài tập">
              <span className="t-body-s c-ink2 prob-tabular" role="status">
                {matchingProblems.length} bài
              </span>
            </CardHead>
          </div>

          {selected ? (
            <div className="prob-table-scroll">
              <table className="table prob-table" role="grid" aria-label="Danh sách bài tập">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Tên bài</th>
                    <th scope="col">Chủ đề</th>
                    <th scope="col">Độ khó</th>
                    <th scope="col">Vai trò</th>
                    <th scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody onKeyDown={handleRowKeys}>
                  {matchingProblems.map((problem) => {
                    const difficulty = DIFFICULTY[problem.difficulty];
                    const status = PROBLEM_STATUS[problem.status];
                    const isSelected = problem.id === selected.id;
                    return (
                      <tr
                        key={problem.id}
                        aria-selected={isSelected}
                        onClick={(event) => {
                          setSelectedId(problem.id);
                          event.currentTarget.querySelector("button")?.focus();
                        }}
                        onDoubleClick={() => navigate(`/problems/${problem.id}`)}
                      >
                        <td>
                          <span className="t-mono c-ink2 prob-tabular">{problem.id}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="prob-row-button"
                            tabIndex={activeId === problem.id ? 0 : -1}
                            onFocus={() => setFocusedId(problem.id)}
                            onClick={() => setSelectedId(problem.id)}
                          >
                            <span>{problem.title}</span>
                            {isSelected && <span className="sr-only">, đang xem trước</span>}
                          </button>
                        </td>
                        <td className="c-ink2">{problem.topic}</td>
                        <td>
                          <Badge tone={difficulty.tone} dot>{difficulty.label}</Badge>
                        </td>
                        <td className="c-ink2">{problem.role}</td>
                        <td>
                          <Badge tone={status.tone} dot>{status.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty" role="status">
              <p className="t-heading-s">Không tìm thấy bài tập phù hợp — thử bỏ bớt bộ lọc.</p>
              <p className="t-body-s c-ink2">
                Điều chỉnh từ khóa, độ khó hoặc vai trò để hiển thị lại ngân hàng bài tập.
              </p>
              <Button variant="secondary" onClick={resetFilters}>
                Đặt lại bộ lọc
              </Button>
            </div>
          )}
        </Card>

        {selected && <ProblemPreview problem={selected} />}
      </div>
    </div>
  );
}
