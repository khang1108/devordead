import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, CardHead, Chip, Field, PageHeader, RuleTag } from "../components/ui.jsx";
import { DIFFICULTY, problems, PROBLEM_STATUS } from "../data/mock.js";
import "./ProblemsScreen.css";

const topics = [...new Set(problems.map(({ topic }) => topic))];
const roles = [...new Set(problems.map(({ role }) => role))];

function ProblemPreview({ problem }) {
  const navigate = useNavigate();
  const difficulty = DIFFICULTY[problem.difficulty];

  return (
    <Card className="pb-preview" aria-labelledby="pb-preview-title">
      <CardHead title="Xem trước bài tập">
        <span className="t-mono c-ink2">#{problem.id}</span>
      </CardHead>

      <div className="col stack-sm">
        <h3 className="t-heading-m" id="pb-preview-title">{problem.title}</h3>
        <div className="row wrap">
          <Badge tone={difficulty.tone}>{difficulty.label}</Badge>
          <span className="t-body-s c-ink2">{problem.topic}</span>
        </div>
        <p className="t-body-s c-ink2">{problem.description}</p>
      </div>

      <section className="col stack-sm pb-preview-section" aria-labelledby="pb-constraints">
        <h4 className="t-mono c-ink2" id="pb-constraints">Ràng buộc</h4>
        <ul className="t-body-s pb-constraints">
          {problem.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}
        </ul>
      </section>

      <section className="col stack-sm" aria-labelledby="pb-examples">
        <h4 className="t-mono c-ink2" id="pb-examples">Ví dụ</h4>
        {problem.examples.map(({ input, output }) => (
          <pre className="code-block pb-example" key={input}><code>
            <span>Đầu vào</span>{'\n'}{input}{'\n'}
            <span>Đầu ra</span>{'\n'}{output}
          </code></pre>
        ))}
      </section>

      <div className="col stack-sm">
        <Button variant="accent" block onClick={() => navigate(`/problems/${problem.id}`)}>
          Làm bài <span aria-hidden="true">→</span>
        </Button>
        <p className="t-mono c-ink2 pb-approved">Đã duyệt · {problem.approvedAt}</p>
      </div>
    </Card>
  );
}

export default function ProblemsScreen() {
  const [search, setSearch] = useState("");
  const [difficulties, setDifficulties] = useState([]);
  const [topic, setTopic] = useState("");
  const [role, setRole] = useState("");
  const [selectedId, setSelectedId] = useState(problems[0].id);
  const [focusedId, setFocusedId] = useState(null);
  const query = search.trim().toLocaleLowerCase("vi");

  const matchingProblems = problems.filter((problem) =>
    problem.title.toLocaleLowerCase("vi").includes(query) &&
    (!difficulties.length || difficulties.includes(problem.difficulty)) &&
    (!topic || problem.topic === topic) &&
    (!role || problem.role === role),
  );
  const selected = matchingProblems.find((problem) => problem.id === selectedId) ?? matchingProblems[0];
  const activeId = matchingProblems.some(({ id }) => id === focusedId) ? focusedId : selected?.id;

  function toggleDifficulty(difficulty) {
    setDifficulties((previous) => previous.includes(difficulty)
      ? previous.filter((value) => value !== difficulty)
      : [...previous, difficulty]);
  }

  function handleRowKeys(event) {
    const buttons = Array.from(event.currentTarget.querySelectorAll(".pb-row-button"));
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
    buttons[nextIndex]?.focus();
  }

  return (
    <div className="col stack-lg">
      <PageHeader
        eyebrow="04 — BÀI TẬP LẬP TRÌNH"
        title="Ngân hàng bài tập"
        actions={<RuleTag code="BR4">Chỉ bài đã duyệt</RuleTag>}
      />

      <Card variant="tight" className="pb-filters" aria-label="Bộ lọc bài tập">
        <div className="grid pb-filter-fields">
          <Field
            label="Tìm bài tập"
            placeholder="Ví dụ: Two Sum"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <label className="field">
            <span className="field__label">Chủ đề</span>
            <select className="select" value={topic} onChange={(event) => setTopic(event.target.value)}>
              <option value="">Tất cả chủ đề</option>
              {topics.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Vai trò</span>
            <select className="select" value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="">Tất cả vai trò</option>
              {roles.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
        </div>
        <div className="row wrap pb-difficulties" role="group" aria-label="Độ khó">
          <span className="t-body-s t-strong">Độ khó</span>
          {Object.entries(DIFFICULTY).map(([value, { label }]) => (
            <Chip key={value} active={difficulties.includes(value)} onClick={() => toggleDifficulty(value)}>
              {label}
            </Chip>
          ))}
        </div>
      </Card>

      <div className={`grid pb-layout${selected ? "" : " pb-layout-empty"}`}>
        <Card variant="flush" className="pb-results">
          <div className="pb-results-head">
            <CardHead title="Danh sách bài tập">
              <span className="t-mono c-ink2" role="status">{matchingProblems.length} bài</span>
            </CardHead>
          </div>

          {selected ? (
            <div className="pb-table-scroll">
              <table className="table pb-table" role="grid" aria-label="Danh sách bài tập">
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
                          event.currentTarget.querySelector("button").focus();
                        }}
                      >
                        <td><span className="t-mono">{problem.id}</span></td>
                        <td>
                          <button
                            type="button"
                            className="pb-row-button"
                            tabIndex={activeId === problem.id ? 0 : -1}
                            onFocus={() => setFocusedId(problem.id)}
                          >
                            {problem.title}
                            {isSelected && <span className="sr-only">, đang xem</span>}
                          </button>
                        </td>
                        <td>{problem.topic}</td>
                        <td><Badge tone={difficulty.tone}>{difficulty.label}</Badge></td>
                        <td>{problem.role}</td>
                        <td><Badge tone={status.tone}>{status.label}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty">Không tìm thấy bài tập phù hợp — thử bỏ bớt bộ lọc.</p>
          )}
        </Card>

        {selected && <ProblemPreview problem={selected} />}
      </div>
    </div>
  );
}
