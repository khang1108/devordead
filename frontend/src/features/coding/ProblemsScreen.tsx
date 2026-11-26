import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StudyCalendar from "@shared/components/StudyCalendar";
import { DIFFICULTY_META, PROBLEM_STATUS_META } from "@shared/constants";
import { getErrorMessage } from "@shared/services/apiClient";
import { localStore } from "@shared/services/localStore";
import type { CodingProblem, Difficulty, ProblemStatus } from "@shared/types";
import { EmptyState, ErrorBanner, RuleTag, Skeleton } from "@shared/ui";
import { codingService } from "./coding.service";
import "./ProblemsScreen.css";

const DIFFICULTY_KEYS: readonly Difficulty[] = ["easy", "medium", "hard"];
const BASE_ROLE_PILLS = ["Backend", "Frontend", "Fullstack", "Data"] as const;
const MAX_VISIBLE_TOPICS = 8;

interface StudyTrackItem {
  to: string;
  title: string;
  subtitle: string;
  icon: "roadmap" | "knowledge" | "interview";
}

const STUDY_TRACKS: readonly StudyTrackItem[] = [
  {
    to: "/roadmap",
    title: "Lộ trình thích ứng",
    subtitle: "Ôn đúng kỹ năng còn thiếu theo CV và JD",
    icon: "roadmap",
  },
  {
    to: "/knowledge",
    title: "Kho tri thức theo JD",
    subtitle: "Hệ thống kiến thức nền tảng theo vị trí mục tiêu",
    icon: "knowledge",
  },
  {
    to: "/interview/setup",
    title: "Phỏng vấn Live Coding",
    subtitle: "Mô phỏng hội thoại kỹ thuật kèm Sandbox cô lập",
    icon: "interview",
  },
];

function normalizeText(text: string): string {
  return text
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replaceAll("đ", "d");
}

function matchesRoleFilter(problemRole: string, filterRole: string): boolean {
  if (!filterRole) return true;
  if (filterRole === "Data") {
    return normalizeText(problemRole).includes("data");
  }
  return normalizeText(problemRole) === normalizeText(filterRole);
}

function TrackIcon({ kind }: { kind: StudyTrackItem["icon"] }) {
  if (kind === "roadmap") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="3.5" cy="12.5" r="1.75" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="12.5" cy="3.5" r="1.75" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M5.25 12.5h2.5a2.25 2.25 0 0 0 0-4.5h-.5a2.25 2.25 0 0 1 0-4.5h3.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "knowledge") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M3 2.75A1.25 1.25 0 0 1 4.25 1.5h8.25v11.5H4.25A1.25 1.25 0 0 0 3 14.25V2.75Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M3 13a1.25 1.25 0 0 1 1.25-1.25h8.25" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2.5" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M6.5 5.75 10.25 8 6.5 10.25v-4.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusIcon({ status }: { status: ProblemStatus }) {
  if (status === "solved") {
    return (
      <span className="prob-status prob-status--solved" title={PROBLEM_STATUS_META.solved.label}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="m5.35 8.15 1.75 1.75 3.6-3.7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="sr-only">{PROBLEM_STATUS_META.solved.label}</span>
      </span>
    );
  }
  if (status === "attempted") {
    return (
      <span className="prob-status prob-status--attempted" title={PROBLEM_STATUS_META.attempted.label}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 2.5" />
          <circle cx="8" cy="8" r="2.2" fill="currentColor" />
        </svg>
        <span className="sr-only">{PROBLEM_STATUS_META.attempted.label}</span>
      </span>
    );
  }
  return (
    <span className="prob-status prob-status--todo" title={PROBLEM_STATUS_META.todo.label}>
      <span className="prob-status__dash" aria-hidden="true" />
      <span className="sr-only">{PROBLEM_STATUS_META.todo.label}</span>
    </span>
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
  const [statusFilter, setStatusFilter] = useState<"" | ProblemStatus>("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [topicsExpanded, setTopicsExpanded] = useState(false);

  const targetProfile = useMemo(() => localStore.getTargetProfile(), []);

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

  // Dynamic topic tags with counts extracted from fetched problems
  const topicCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of problems) {
      if (!p.topic) continue;
      counts.set(p.topic, (counts.get(p.topic) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "vi"));
  }, [problems]);

  const rolePills = useMemo(() => {
    const extras = new Set<string>();
    for (const p of problems) {
      if (!p.role) continue;
      const alreadyCovered = BASE_ROLE_PILLS.some((base) => matchesRoleFilter(p.role, base));
      if (!alreadyCovered) {
        extras.add(p.role);
      }
    }
    return [...BASE_ROLE_PILLS, ...Array.from(extras)];
  }, [problems]);

  const counts = useMemo(() => {
    let solved = 0;
    let attempted = 0;
    let todo = 0;
    const byDifficulty: Record<Difficulty, { solved: number; total: number }> = {
      easy: { solved: 0, total: 0 },
      medium: { solved: 0, total: 0 },
      hard: { solved: 0, total: 0 },
    };

    for (const p of problems) {
      if (p.status === "solved") solved += 1;
      else if (p.status === "attempted") attempted += 1;
      else todo += 1;

      byDifficulty[p.difficulty].total += 1;
      if (p.status === "solved") {
        byDifficulty[p.difficulty].solved += 1;
      }
    }

    return { solved, attempted, todo, byDifficulty };
  }, [problems]);

  const query = normalizeText(search.trim());
  const hasFilters = Boolean(query || difficulties.length || statusFilter || selectedTopic || selectedRole);

  const matchingProblems = useMemo(() => {
    return problems.filter((problem) => {
      const matchesQuery =
        !query ||
        normalizeText(problem.title).includes(query) ||
        normalizeText(problem.topic).includes(query) ||
        problem.id.toLowerCase().includes(query);
      const matchesDiff = !difficulties.length || difficulties.includes(problem.difficulty);
      const matchesStatus = !statusFilter || problem.status === statusFilter;
      const matchesTopic = !selectedTopic || problem.topic === selectedTopic;
      const matchesRole = matchesRoleFilter(problem.role, selectedRole);
      return matchesQuery && matchesDiff && matchesStatus && matchesTopic && matchesRole;
    });
  }, [problems, query, difficulties, statusFilter, selectedTopic, selectedRole]);

  const visibleTopics = topicsExpanded ? topicCounts : topicCounts.slice(0, MAX_VISIBLE_TOPICS);
  const solvedRatio = problems.length > 0 ? counts.solved / problems.length : 0;

  function toggleDifficulty(diff: Difficulty) {
    setDifficulties((prev) =>
      prev.includes(diff) ? prev.filter((item) => item !== diff) : [...prev, diff],
    );
  }

  function resetFilters() {
    setSearch("");
    setDifficulties([]);
    setStatusFilter("");
    setSelectedTopic("");
    setSelectedRole("");
  }

  function pickRandomProblem() {
    const pool = matchingProblems.length > 0 ? matchingProblems : problems;
    if (pool.length === 0) return;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    if (picked) {
      navigate(`/problems/${picked.id}`);
    }
  }

  const ringRadius = 6;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - solvedRatio);

  return (
    <div className="lc-workspace prob-screen">
      {/* Cột chính: Study Track + Topic/Role Pills + Filter Toolbar + Zebra Problem List */}
      <div className="lc-workspace__main">
        {/* Compact Header Row */}
        <header className="prob-header">
          <div className="prob-header__left">
            <h1 className="t-display-l">Ngân hàng bài tập</h1>
            <RuleTag code="BR4">Chỉ nội dung đã duyệt</RuleTag>
          </div>
          <Link to="/problems/sandbox" className="btn btn--secondary btn--sm prob-sandbox-btn">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Mở Sandbox IDE</span>
          </Link>
        </header>

        {/* 3-Column Study Track Strip (Flat 1px White Cards, Zero Promo Gradients) */}
        <nav className="prob-tracks" aria-label="Lối tắt lộ trình luyện tập">
          {STUDY_TRACKS.map((track) => (
            <Link key={track.to} to={track.to} className="prob-track-card">
              <span className="prob-track-card__icon" aria-hidden="true">
                <TrackIcon kind={track.icon} />
              </span>
              <span className="prob-track-card__copy">
                <span className="prob-track-card__title">{track.title}</span>
                <span className="prob-track-card__sub">{track.subtitle}</span>
              </span>
              <span className="prob-track-card__arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </nav>

        {/* Dynamic Topic Tag Row (Extracted from API problems with live counts) */}
        {topicCounts.length > 0 && (
          <div className="prob-topics" role="region" aria-label="Chủ đề thuật toán">
            <div className="prob-topics__list">
              {visibleTopics.map(([topicName, count]) => {
                const active = selectedTopic === topicName;
                return (
                  <button
                    key={topicName}
                    type="button"
                    className={`prob-topic-tag ${active ? "is-active" : ""}`.trim()}
                    aria-pressed={active}
                    onClick={() => setSelectedTopic((prev) => (prev === topicName ? "" : topicName))}
                  >
                    <span>{topicName}</span>
                    <span className="prob-topic-tag__count">{count}</span>
                  </button>
                );
              })}
              {topicCounts.length > MAX_VISIBLE_TOPICS && (
                <button
                  type="button"
                  className="prob-topics__toggle"
                  onClick={() => setTopicsExpanded((prev) => !prev)}
                >
                  {topicsExpanded ? "Thu gọn" : `Xem thêm (${topicCounts.length - MAX_VISIBLE_TOPICS})`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Role Category Pills (.lc-pills / .lc-pill) */}
        <div className="lc-pills" role="group" aria-label="Nhóm chủ đề và vai trò">
          <button
            type="button"
            className={`lc-pill ${!selectedRole && !selectedTopic ? "is-active" : ""}`.trim()}
            aria-pressed={!selectedRole && !selectedTopic}
            onClick={() => {
              setSelectedRole("");
              setSelectedTopic("");
            }}
          >
            <span>Tất cả chủ đề</span>
            {problems.length > 0 && <span className="lc-pill__count">{problems.length}</span>}
          </button>

          {rolePills.map((roleName) => {
            const active = selectedRole === roleName;
            const roleCount = problems.filter((p) => matchesRoleFilter(p.role, roleName)).length;
            return (
              <button
                key={roleName}
                type="button"
                className={`lc-pill ${active ? "is-active" : ""}`.trim()}
                aria-pressed={active}
                onClick={() => setSelectedRole((prev) => (prev === roleName ? "" : roleName))}
              >
                <span>{roleName}</span>
                {problems.length > 0 && <span className="lc-pill__count">{roleCount}</span>}
              </button>
            );
          })}
        </div>

        {/* Compact Inline Filter Toolbar */}
        <div className="prob-toolbar" role="search" aria-label="Tìm kiếm và lọc bài tập">
          <div className="prob-search">
            <svg
              className="prob-search__icon"
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.5" />
              <path d="m10.75 10.75 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              className="prob-search__input"
              placeholder="Tìm theo tên hoặc mã bài..."
              aria-label="Tìm theo tên hoặc mã bài"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                type="button"
                className="prob-search__clear"
                aria-label="Xóa từ khóa tìm kiếm"
                onClick={() => setSearch("")}
              >
                ×
              </button>
            )}
          </div>

          <div className="prob-diff-group" role="group" aria-label="Lọc theo độ khó">
            {DIFFICULTY_KEYS.map((diffKey) => {
              const active = difficulties.includes(diffKey);
              return (
                <button
                  key={diffKey}
                  type="button"
                  className={`prob-diff-chip prob-diff-chip--${diffKey} ${active ? "is-active" : ""}`.trim()}
                  aria-pressed={active}
                  onClick={() => toggleDifficulty(diffKey)}
                >
                  {DIFFICULTY_META[diffKey].label}
                </button>
              );
            })}
          </div>

          <label className="prob-status-select-wrap">
            <span className="sr-only">Lọc theo trạng thái</span>
            <select
              className="prob-status-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "" | ProblemStatus)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="solved">{PROBLEM_STATUS_META.solved.label}</option>
              <option value="attempted">{PROBLEM_STATUS_META.attempted.label}</option>
              <option value="todo">{PROBLEM_STATUS_META.todo.label}</option>
            </select>
          </label>

          {hasFilters && (
            <button type="button" className="prob-reset-btn" onClick={resetFilters}>
              Xóa lọc
            </button>
          )}

          <div className="prob-toolbar__right">
            <div className="prob-solved-ratio" title="Tỷ lệ hoàn thành ngân hàng bài tập">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <circle
                  cx="8"
                  cy="8"
                  r={ringRadius}
                  fill="none"
                  stroke="var(--line-strong)"
                  strokeWidth="2"
                />
                {solvedRatio > 0 && (
                  <circle
                    cx="8"
                    cy="8"
                    r={ringRadius}
                    fill="none"
                    stroke="var(--diff-easy)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    transform="rotate(-90 8 8)"
                  />
                )}
              </svg>
              <span className="prob-tabular">
                {counts.solved} / {problems.length} đã giải
              </span>
            </div>

            <button
              type="button"
              className="prob-random-btn"
              onClick={pickRandomProblem}
              disabled={problems.length === 0}
              title="Mở ngẫu nhiên một bài tập phù hợp"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M2 4.5h2.4c1.1 0 2 .6 2.6 1.5l2 3c.6.9 1.5 1.5 2.6 1.5H14M12 8.5l2 2-2 2M14 4.5h-2.4c-1.1 0-2 .6-2.6 1.5l-.4.6M2 10.5h2.4c1.1 0 2-.6 2.6-1.5l.4-.6M12 2.5l2 2-2 2"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Chọn ngẫu nhiên</span>
            </button>
          </div>
        </div>

        {/* Problem List States: Skeleton / Error / Empty / Zebra Dense List */}
        {loading ? (
          <section className="lc-list prob-list" aria-busy="true" aria-label="Đang tải danh sách bài tập">
            <div className="lc-list__head prob-list__grid" aria-hidden="true">
              <span />
              <span>Bài tập</span>
              <span className="prob-col-topic">Chủ đề</span>
              <span className="prob-col-role">Vai trò</span>
              <span>Độ khó</span>
              <span className="prob-col-action">Thực hành</span>
            </div>
            <div className="prob-skeleton-rows">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="prob-skeleton-row">
                  <Skeleton width={16} height={16} />
                  <Skeleton width="58%" height={16} />
                  <Skeleton width="72%" height={14} className="prob-col-topic" />
                  <Skeleton width="68%" height={14} className="prob-col-role" />
                  <Skeleton width={56} height={14} />
                  <Skeleton width={64} height={14} className="prob-col-action" />
                </div>
              ))}
            </div>
          </section>
        ) : error ? (
          <ErrorBanner
            title="Không tải được ngân hàng bài tập"
            message={error}
            onRetry={reload}
            actions={
              <Link to="/problems/sandbox" className="btn btn--secondary btn--sm">
                Mở Sandbox IDE
              </Link>
            }
          />
        ) : problems.length === 0 ? (
          <EmptyState
            title="Chưa có bài tập nào trong ngân hàng"
            description="Bài tập lập trình sẽ xuất hiện sau khi được kiểm duyệt (BR4). Bạn vẫn có thể mở Sandbox IDE để viết mã và lưu nháp cục bộ."
            actions={
              <>
                <Link to="/problems/sandbox" className="btn btn--primary btn--sm">
                  Mở Sandbox IDE
                </Link>
                <button type="button" className="btn btn--secondary btn--sm" onClick={reload}>
                  Tải lại
                </button>
              </>
            }
          />
        ) : matchingProblems.length === 0 ? (
          <EmptyState
            title="Không tìm thấy bài tập phù hợp"
            description="Thử thay đổi từ khóa tìm kiếm, độ khó, chủ đề hoặc trạng thái để xem lại danh sách bài tập."
            actions={
              <>
                <button type="button" className="btn btn--secondary btn--sm" onClick={resetFilters}>
                  Đặt lại bộ lọc
                </button>
                <Link to="/problems/sandbox" className="btn btn--ghost btn--sm">
                  Mở Sandbox IDE
                </Link>
              </>
            }
          />
        ) : (
          <section className="lc-list prob-list" aria-label="Danh sách bài tập lập trình">
            <div className="lc-list__head prob-list__grid">
              <span className="sr-only">Trạng thái</span>
              <span>
                Bài tập{" "}
                <span className="prob-list__count prob-tabular">({matchingProblems.length})</span>
              </span>
              <span className="prob-col-topic">Chủ đề</span>
              <span className="prob-col-role">Vai trò</span>
              <span>Độ khó</span>
              <span className="prob-col-action">Thực hành</span>
            </div>

            <div className="prob-list__body" role="list">
              {matchingProblems.map((problem) => (
                <Link
                  key={problem.id}
                  to={`/problems/${problem.id}`}
                  role="listitem"
                  className="lc-list__row prob-list__grid prob-row"
                >
                  <StatusIcon status={problem.status} />

                  <span className="prob-row__title-wrap">
                    <span className="prob-row__id prob-tabular">#{problem.id}.</span>
                    <span className="prob-row__title">{problem.title}</span>
                  </span>

                  <span className="prob-row__meta prob-col-topic">{problem.topic}</span>
                  <span className="prob-row__meta prob-col-role">{problem.role}</span>

                  <span className={`lc-diff lc-diff--${problem.difficulty}`}>
                    {DIFFICULTY_META[problem.difficulty].label}
                  </span>

                  <span className="prob-row__cta prob-col-action" aria-hidden="true">
                    Làm bài →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Cột phải 280px: Lịch luyện tập + Thẻ mục tiêu & tiến độ */}
      <aside className="lc-rail-right" aria-label="Lịch luyện tập và tiến độ mục tiêu">
        <StudyCalendar />

        <section className="prob-rail-card" aria-label="Mục tiêu nghề nghiệp và tiến độ">
          <div className="prob-rail-card__head">
            <div>
              <h2 className="prob-rail-card__title">Mục tiêu & tiến độ</h2>
              <p className="prob-rail-card__sub">
                {targetProfile.role} · {targetProfile.level}
                {targetProfile.targetCompany ? ` · ${targetProfile.targetCompany}` : ""}
              </p>
            </div>
            <span className="prob-rail-card__pct prob-tabular">
              {Math.round(solvedRatio * 100)}%
            </span>
          </div>

          <div
            className="prob-rail-bar"
            role="progressbar"
            aria-label="Tỷ lệ bài đã giải"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(solvedRatio * 100)}
          >
            <span className="prob-rail-bar__fill" style={{ width: `${Math.round(solvedRatio * 100)}%` }} />
          </div>

          <dl className="prob-rail-stats">
            <div className="prob-rail-stat">
              <dt>Đã giải</dt>
              <dd className="prob-tabular c-success">{counts.solved}</dd>
            </div>
            <div className="prob-rail-stat">
              <dt>Đang làm</dt>
              <dd className="prob-tabular c-brand">{counts.attempted}</dd>
            </div>
            <div className="prob-rail-stat">
              <dt>Chưa làm</dt>
              <dd className="prob-tabular">{counts.todo}</dd>
            </div>
          </dl>

          {problems.length > 0 && (
            <div className="prob-rail-diffs" aria-label="Phân bổ theo độ khó">
              {DIFFICULTY_KEYS.map((diffKey) => (
                <div key={diffKey} className="prob-rail-diff-row">
                  <span className={`lc-diff lc-diff--${diffKey}`}>
                    {DIFFICULTY_META[diffKey].label}
                  </span>
                  <span className="prob-rail-diff-val prob-tabular">
                    {counts.byDifficulty[diffKey].solved} / {counts.byDifficulty[diffKey].total}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="prob-rail-card__foot">
            <Link to="/profile" className="prob-rail-link">
              <span>Cập nhật mục tiêu & CV/JD</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </aside>
    </div>
  );
}
