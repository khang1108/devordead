import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DIFFICULTY_META, PROBLEM_STATUS_META } from "@shared/constants";
import { getErrorMessage } from "@shared/services/apiClient";
import type { CodingProblem, Difficulty } from "@shared/types";
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
  RuleTag,
  Skeleton,
} from "@shared/ui";
import { codingService } from "./coding.service";
import "./ProblemsScreen.css";

const DIFFICULTY_KEYS: readonly Difficulty[] = ["easy", "medium", "hard"];

function normalizeText(text: string): string {
  return text
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replaceAll("đ", "d");
}

interface ProblemPreviewProps {
  problem: CodingProblem;
}

function ProblemPreview({ problem }: ProblemPreviewProps) {
  const navigate = useNavigate();
  const difficulty = DIFFICULTY_META[problem.difficulty];
  const status = PROBLEM_STATUS_META[problem.status];

  return (
    <Card className="prob-preview" aria-labelledby="prob-preview-title">
      <CardHead title="Xem trước bài tập">
        <span className="t-mono c-ink2 prob-tabular">#{problem.id}</span>
      </CardHead>

      <div className="col stack-sm">
        <div className="row wrap stack-sm">
          <Badge tone={difficulty.tone} dot>
            {difficulty.label}
          </Badge>
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        </div>
        <h3 className="t-heading-m" id="prob-preview-title">
          {problem.title}
        </h3>
        <p className="t-body-s c-ink2 prob-tabular">
          {problem.topic} · {problem.role} · {problem.tests} ca kiểm thử
        </p>
        <p className="t-body-s c-ink2">{problem.description}</p>
      </div>

      <section className="col stack-sm prob-preview-section" aria-labelledby="prob-constraints">
        <h4 className="t-body-s t-strong c-ink2" id="prob-constraints">
          Ràng buộc
        </h4>
        <ul className="prob-constraints">
          {problem.constraints.map((constraint) => (
            <li className="t-code" key={constraint}>
              {constraint}
            </li>
          ))}
        </ul>
      </section>

      <section className="col stack-sm prob-preview-section" aria-labelledby="prob-examples">
        <h4 className="t-body-s t-strong c-ink2" id="prob-examples">
          Ví dụ
        </h4>
        {problem.examples.map(({ input, output }) => (
          <pre className="code-block prob-example" key={`${input}-${output}`}>
            <code>
              Input: {input}
              {"\n"}Output: {output}
            </code>
          </pre>
        ))}
      </section>

      <div className="col stack-sm prob-preview-cta">
        <Button variant="primary" block onClick={() => navigate(`/problems/${problem.id}`)}>
          Làm bài <span aria-hidden="true">→</span>
        </Button>
        <p className="t-body-s c-ink2 prob-approved prob-tabular">Đã duyệt · {problem.approvedAt}</p>
      </div>
    </Card>
  );
}

export default function ProblemsScreen() {
  const navigate = useNavigate();

  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [search, setSearch] = useState("");
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [topic, setTopic] = useState("");
  const [role, setRole] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const reload = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void codingService
      .getProblems(controller.signal)
      .then((data) => {
        setProblems(data);
        setSelectedId((prev) => prev ?? data[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(getErrorMessage(err, "Không thể tải danh sách bài tập từ máy chủ API."));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [reloadTick]);

  const topics = [...new Set(problems.map((p) => p.topic))];
  const roles = [...new Set(problems.map((p) => p.role))];
  const solvedCount = problems.filter((p) => p.status === "solved").length;
  const attemptedCount = problems.filter((p) => p.status === "attempted").length;
  const todoCount = problems.filter((p) => p.status === "todo").length;

  const query = normalizeText(search.trim());
  const hasFilters = Boolean(query || difficulties.length || topic || role);

  const matchingProblems = problems.filter(
    (problem) =>
      (normalizeText(problem.title).includes(query) ||
        normalizeText(problem.topic).includes(query) ||
        problem.id.toLowerCase().includes(query)) &&
      (!difficulties.length || difficulties.includes(problem.difficulty)) &&
      (!topic || problem.topic === topic) &&
      (!role || problem.role === role),
  );

  const selected =
    matchingProblems.find((problem) => problem.id === selectedId) ?? matchingProblems[0];
  const activeId =
    focusedId && matchingProblems.some(({ id }) => id === focusedId) ? focusedId : selected?.id;

  function toggleDifficulty(difficulty: Difficulty) {
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

  function handleRowKeys(event: KeyboardEvent<HTMLTableSectionElement>) {
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(".prob-row-button"),
    );
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    if (index === -1) return;

    const nextIndexMap: Partial<Record<string, number>> = {
      ArrowDown: index + 1,
      ArrowUp: index - 1,
      Home: 0,
      End: buttons.length - 1,
    };
    const nextIndex = nextIndexMap[event.key];
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
                <option key={value} value={value}>
                  {value}
                </option>
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
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="row between wrap">
          <div className="row wrap prob-difficulties" role="group" aria-label="Độ khó">
            <span className="t-body-s c-ink2">Độ khó:</span>
            {DIFFICULTY_KEYS.map((value) => (
              <Chip
                key={value}
                active={difficulties.includes(value)}
                onClick={() => toggleDifficulty(value)}
              >
                {DIFFICULTY_META[value].label}
              </Chip>
            ))}
            {hasFilters && (
              <Button variant="ghost" onClick={resetFilters}>
                Xóa bộ lọc
              </Button>
            )}
          </div>

          {!loading && !error && problems.length > 0 && (
            <p className="t-body-s c-ink2 prob-tabular">
              {solvedCount} đã giải · {attemptedCount} đang làm · {todoCount} chưa làm
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid prob-layout" aria-busy="true" aria-label="Đang tải danh sách bài tập">
          <Card className="card--flush prob-results">
            <div className="prob-results-head">
              <CardHead title="Danh sách bài tập">
                <Skeleton width={48} height={16} />
              </CardHead>
            </div>
            <div className="prob-skeleton-list">
              <Skeleton width="100%" height={42} />
              <Skeleton width="100%" height={42} />
              <Skeleton width="100%" height={42} />
              <Skeleton width="100%" height={42} />
              <Skeleton width="100%" height={42} />
            </div>
          </Card>

          <Card className="prob-preview">
            <Skeleton width="45%" height={16} />
            <Skeleton width="78%" height={24} />
            <Skeleton width="100%" height={54} />
            <Skeleton width="100%" height={92} />
            <Skeleton width="100%" height={40} />
          </Card>
        </div>
      ) : error ? (
        <ErrorBanner
          title="Không tải được ngân hàng bài tập"
          message={error}
          onRetry={reload}
          actions={
            <Link to="/problems/sandbox" className="btn btn--secondary btn--sm">
              Mở Sandbox IDE trực tiếp
            </Link>
          }
        />
      ) : problems.length === 0 ? (
        <EmptyState
          title="Chưa có bài tập nào trong ngân hàng"
          description="Các bài tập lập trình sẽ hiển thị sau khi được kiểm duyệt (BR4). Bạn vẫn có thể mở trực tiếp Sandbox IDE để viết và lưu nháp mã nguồn."
          actions={
            <>
              <Button variant="primary" onClick={() => navigate("/problems/sandbox")}>
                Mở Sandbox IDE trực tiếp
              </Button>
              <Button variant="secondary" onClick={reload}>
                Tải lại
              </Button>
            </>
          }
        />
      ) : (
        <div className={`grid prob-layout${selected ? "" : " prob-layout-empty"}`}>
          <Card className="card--flush prob-results">
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
                      const difficulty = DIFFICULTY_META[problem.difficulty];
                      const status = PROBLEM_STATUS_META[problem.status];
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
                            <Badge tone={difficulty.tone} dot>
                              {difficulty.label}
                            </Badge>
                          </td>
                          <td className="c-ink2">{problem.role}</td>
                          <td>
                            <Badge tone={status.tone} dot>
                              {status.label}
                            </Badge>
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
                <div className="row wrap">
                  <Button variant="secondary" onClick={resetFilters}>
                    Đặt lại bộ lọc
                  </Button>
                  <Button variant="ghost" onClick={() => navigate("/problems/sandbox")}>
                    Mở Sandbox IDE
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {selected && <ProblemPreview problem={selected} />}
        </div>
      )}
    </div>
  );
}
