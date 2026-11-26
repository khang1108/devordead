import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  DEFAULT_CODE_TEMPLATES,
  DIFFICULTY_META,
  LANGUAGES,
  SANDBOX_CONSTRAINTS_SPEC,
  SANDBOX_LIMITS,
  SANDBOX_STEPS,
  TEST_STATUS_META,
} from "@shared/constants";
import { getErrorMessage } from "@shared/services/apiClient";
import { localStore } from "@shared/services/localStore";
import type {
  CodingProblem,
  ProgrammingLanguage,
  SandboxExecutionResult,
  SandboxRunMode,
} from "@shared/types";
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHead,
  ErrorBanner,
  RuleTag,
  Skeleton,
  Tabs,
  type ButtonVariant,
  type TabItem,
} from "@shared/ui";
import { codingService } from "./coding.service";
import "./ProblemEditorScreen.css";

const CodeEditor = lazy(() => import("@shared/components/CodeEditor"));

function formatClockTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  confirmLabel?: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
}

function ConfirmDialog({
  open,
  title,
  confirmLabel = "Xác nhận",
  confirmVariant = "primary",
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="pe-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCancel();
      }}
      aria-labelledby="pe-dialog-title"
    >
      <div className="pe-dialog__head">
        <h2 id="pe-dialog-title" className="t-heading-m">
          {title}
        </h2>
      </div>
      <div className="t-body-m c-ink2">{children}</div>
      <div className="row pe-dialog__actions">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Hủy
        </Button>
        <Button variant={confirmVariant} size="sm" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}

export default function ProblemEditorScreen() {
  const { id } = useParams();
  const problemId = id || "sandbox";
  const isStandaloneSandbox = problemId === "sandbox";

  const [problem, setProblem] = useState<CodingProblem | null>(null);
  const [problemLoading, setProblemLoading] = useState(!isStandaloneSandbox);
  const [problemError, setProblemError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [lang, setLang] = useState<ProgrammingLanguage>("python");
  const [pendingLang, setPendingLang] = useState<ProgrammingLanguage | null>(null);
  const [fontSize, setFontSize] = useState<number>(() => localStore.getEditorFontSize());
  const [code, setCode] = useState<string>(
    () => localStore.getCodeDraft(problemId, "python") ?? DEFAULT_CODE_TEMPLATES.python,
  );
  const [savedAt, setSavedAt] = useState<string | null>(() =>
    localStore.getCodeDraft(problemId, "python") !== null ? formatClockTime(new Date()) : null,
  );
  const [emptyError, setEmptyError] = useState("");

  const [hasRun, setHasRun] = useState(false);
  const [tab, setTab] = useState<SandboxRunMode>("run");
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [execError, setExecError] = useState<string | null>(null);
  const [resultsByMode, setResultsByMode] = useState<
    Partial<Record<SandboxRunMode, SandboxExecutionResult>>
  >({});

  const stepTimerRef = useRef<number | null>(null);
  const execAbortRef = useRef<AbortController | null>(null);

  const clearStepTimer = useCallback(() => {
    if (stepTimerRef.current !== null) {
      window.clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  }, []);

  const reloadProblem = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  // Nạp lại bản nháp cục bộ khi chuyển bài tập
  useEffect(() => {
    const draft = localStore.getCodeDraft(problemId, lang);
    setCode(draft ?? DEFAULT_CODE_TEMPLATES[lang]);
    setSavedAt(draft !== null ? formatClockTime(new Date()) : null);
    setHasRun(false);
    setResultsByMode({});
    setExecError(null);
    setActiveStep(-1);
    setEmptyError("");
  }, [problemId]);

  // Nạp đề bài từ API (trừ chế độ sandbox độc lập)
  useEffect(() => {
    if (isStandaloneSandbox) {
      setProblem(null);
      setProblemLoading(false);
      setProblemError(null);
      return undefined;
    }

    const controller = new AbortController();
    setProblemLoading(true);
    setProblemError(null);

    void codingService
      .getProblemById(problemId, controller.signal)
      .then((data) => {
        setProblem(data);
        const existingDraft = localStore.getCodeDraft(problemId, lang);
        const starterCode = data.starter?.[lang];
        if (existingDraft === null && starterCode) {
          setCode(starterCode);
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setProblemError(getErrorMessage(err, `Không thể tải chi tiết bài tập #${problemId}.`));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setProblemLoading(false);
        }
      });

    return () => controller.abort();
  }, [problemId, isStandaloneSandbox, reloadTick]);

  // Dọn dẹp timer và request khi rời màn hình
  useEffect(() => {
    return () => {
      clearStepTimer();
      execAbortRef.current?.abort();
    };
  }, [clearStepTimer]);

  const getStarter = (targetLang: ProgrammingLanguage): string =>
    problem?.starter?.[targetLang] ?? DEFAULT_CODE_TEMPLATES[targetLang];

  const handleCodeChange = (nextCode: string) => {
    setCode(nextCode);
    if (emptyError && nextCode.trim()) setEmptyError("");
    localStore.setCodeDraft(problemId, lang, nextCode);
    setSavedAt(formatClockTime(new Date()));
  };

  const adjustFontSize = (delta: number) => {
    setFontSize((prev) => {
      const next = Math.max(12, Math.min(22, prev + delta));
      localStore.setEditorFontSize(next);
      return next;
    });
  };

  const applyLanguageSwitch = (nextLang: ProgrammingLanguage) => {
    setLang(nextLang);
    const savedDraft = localStore.getCodeDraft(problemId, nextLang);
    setCode(savedDraft ?? getStarter(nextLang));
    setSavedAt(savedDraft !== null ? formatClockTime(new Date()) : null);
    setEmptyError("");
  };

  const handleLangChange = (nextLang: ProgrammingLanguage) => {
    if (nextLang === lang) return;
    const currentStarter = getStarter(lang);
    if (code.trim() !== currentStarter.trim()) {
      setPendingLang(nextLang);
      return;
    }
    applyLanguageSwitch(nextLang);
  };

  const confirmLangSwitch = () => {
    if (!pendingLang) return;
    applyLanguageSwitch(pendingLang);
    setPendingLang(null);
  };

  const handleResetCode = () => {
    const starter = getStarter(lang);
    setCode(starter);
    localStore.setCodeDraft(problemId, lang, starter);
    setSavedAt(formatClockTime(new Date()));
    setEmptyError("");
  };

  const triggerExecution = async (mode: SandboxRunMode) => {
    if (!code.trim()) {
      setEmptyError(
        "Mã nguồn đang trống — vui lòng nhập lời giải trước khi chạy thử hoặc nộp bài (UC08 · E1).",
      );
      return;
    }

    execAbortRef.current?.abort();
    const controller = new AbortController();
    execAbortRef.current = controller;

    setEmptyError("");
    setExecError(null);
    setHasRun(true);
    setTab(mode);
    setRunning(true);

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    setActiveStep(reduce ? SANDBOX_STEPS.length - 1 : 0);
    clearStepTimer();

    if (!reduce) {
      stepTimerRef.current = window.setInterval(() => {
        setActiveStep((prev) => {
          if (prev >= SANDBOX_STEPS.length - 2) {
            return SANDBOX_STEPS.length - 2;
          }
          return prev + 1;
        });
      }, 160);
    }

    try {
      const result =
        mode === "run"
          ? await codingService.runSampleTests(problemId, lang, code, controller.signal)
          : await codingService.submitSolution(problemId, lang, code, controller.signal);

      if (controller.signal.aborted) return;
      clearStepTimer();
      setActiveStep(SANDBOX_STEPS.length);
      setResultsByMode((prev) => ({ ...prev, [mode]: result }));
    } catch (err) {
      if (controller.signal.aborted) return;
      clearStepTimer();
      setExecError(
        getErrorMessage(
          err,
          "Không thể kết nối tới Docker Sandbox Worker để chấm mã nguồn. Hãy khởi động Backend và thử lại.",
        ),
      );
    } finally {
      if (!controller.signal.aborted) {
        setRunning(false);
      }
    }
  };

  const diff = problem ? DIFFICULTY_META[problem.difficulty] : null;
  const activeResult = resultsByMode[tab] ?? null;
  const lineCount = code.split("\n").length;
  const activeLangLabel = LANGUAGES.find((l) => l.value === lang)?.label ?? lang;

  const resultTabs: readonly TabItem<SandboxRunMode>[] = [
    { value: "run", label: "Run · test mẫu" },
    { value: "submit", label: problem ? `Submit · ${problem.tests} test` : "Submit · toàn bộ test" },
  ];

  return (
    <div className="pe">
      <header className="pe__top">
        <Link to="/problems" className="pe__back">
          ← Ngân hàng bài tập
        </Link>
        {!isStandaloneSandbox && <span className="t-mono c-ink2">#{problemId}</span>}
        <h1 className="t-heading-m pe__title">
          {problem
            ? problem.title
            : isStandaloneSandbox
              ? "Sandbox IDE độc lập"
              : `Bài tập #${problemId}`}
        </h1>
        {diff && (
          <Badge tone={diff.tone} dot>
            {diff.label}
          </Badge>
        )}
        {problem && <span className="t-body-s c-ink2">{problem.topic}</span>}
        {problem ? (
          <RuleTag code="BR4">Đã duyệt {problem.approvedAt}</RuleTag>
        ) : (
          <RuleTag code="BR3">Zero-trust Sandbox</RuleTag>
        )}
        <span className="pe__spacer" />
        <span className="t-body-s pe__autosave">
          {savedAt ? `Đã lưu nháp cục bộ · ${savedAt}` : "Tự động lưu nháp cục bộ"}
        </span>
      </header>

      <div className="pe__grid">
        {/* Cột trái: Đề bài phẳng hoặc thông tin Sandbox độc lập */}
        <Card as="article" className="pe__problem">
          {isStandaloneSandbox ? (
            <>
              <CardHead title="Chế độ Sandbox IDE (UC08)">
                <Badge tone="brand" dot>
                  Trực tiếp
                </Badge>
              </CardHead>
              <p className="t-body-m">
                Trình soạn thảo Monaco hoạt động độc lập với 4 ngôn ngữ và tự động lưu bản nháp vào trình duyệt của bạn.
              </p>
              <div className="pe__section">
                <h2 className="pe__subhead">Giới hạn thực thi (BR3 · NFR02)</h2>
                <ul className="pe__list">
                  {SANDBOX_LIMITS.map((limit) => (
                    <li key={limit} className="t-code pe__constraint-item">
                      {limit}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pe__section">
                <p className="pe__subhead">Lưu ý phỏng vấn</p>
                <p className="t-body-s c-ink2">
                  Khi máy chủ Backend trực tuyến, bạn có thể chọn bài tập cụ thể từ{" "}
                  <Link to="/problems" className="t-strong">
                    Ngân hàng bài tập
                  </Link>{" "}
                  để chạy bộ test mẫu và nộp chấm tự động.
                </p>
              </div>
            </>
          ) : problemLoading ? (
            <div className="col stack-sm" aria-busy="true" aria-label="Đang tải đề bài">
              <CardHead title="Đề bài (UC08)">
                <Skeleton width={48} height={16} />
              </CardHead>
              <Skeleton width="100%" height={16} />
              <Skeleton width="92%" height={16} />
              <Skeleton width="76%" height={16} />
              <div className="pe__section">
                <Skeleton width="40%" height={14} />
                <Skeleton width="88%" height={14} />
                <Skeleton width="80%" height={14} />
              </div>
              <div className="pe__section">
                <Skeleton width="35%" height={14} />
                <Skeleton width="100%" height={48} />
              </div>
            </div>
          ) : problemError || !problem ? (
            <>
              <CardHead title="Đề bài (UC08)">
                <span className="t-mono c-ink2">#{problemId}</span>
              </CardHead>
              <ErrorBanner
                title="Chưa tải được đề bài"
                message={problemError ?? `Không tìm thấy dữ liệu cho bài tập #${problemId}.`}
                onRetry={reloadProblem}
              />
              <p className="t-body-s c-ink2">
                Trình soạn thảo Monaco bên phải vẫn sẵn sàng hoạt động và tự lưu nháp mã nguồn cục bộ theo từng ngôn ngữ.
              </p>
            </>
          ) : (
            <>
              <CardHead title="Đề bài (UC08)">
                <span className="t-mono c-ink2">{problem.tests} test</span>
              </CardHead>
              <p className="t-body-m">{problem.description}</p>

              <div className="pe__section">
                <h2 className="pe__subhead">Ràng buộc</h2>
                <ul className="pe__list">
                  {problem.constraints.map((c) => (
                    <li key={c} className="t-code pe__constraint-item">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pe__section">
                <h2 className="pe__subhead">Ví dụ</h2>
                <div className="pe__examples">
                  {problem.examples.map((ex, i) => (
                    <div key={`${i}-${ex.input}`} className="pe__example-row">
                      <p className="t-code">
                        <span className="c-ink2">Input: </span>
                        {ex.input}
                      </p>
                      <p className="t-code">
                        <span className="c-ink2">Output: </span>
                        {ex.output}
                      </p>
                      {ex.explanation && <p className="t-body-s c-ink2">{ex.explanation}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pe__section">
                <p className="pe__subhead">Lưu ý phỏng vấn</p>
                <p className="t-body-s c-ink2">
                  Nói rõ hướng giải và độ phức tạp Big-O trước khi viết vòng lặp. Trong phỏng vấn kỹ thuật, độ đúng của mã và lập luận được chấm độc lập (BR2).
                </p>
              </div>
            </>
          )}
        </Card>

        {/* Cột phải: Monaco IDE + Zero-Trust Sandbox phẳng gọn */}
        <div className="pe__right">
          <section className="pe__editor" aria-label="Trình soạn thảo mã">
            {/* Thanh công cụ 1 dòng duy nhất trên 1280px & 1440px */}
            <div className="pe__toolbar">
              <label className="sr-only" htmlFor="pe-lang">
                Ngôn ngữ lập trình
              </label>
              <select
                id="pe-lang"
                className="pe__select"
                value={lang}
                onChange={(e) => handleLangChange(e.target.value as ProgrammingLanguage)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>

              <div className="pe__font" role="group" aria-label="Cỡ chữ trình soạn thảo">
                <button
                  type="button"
                  onClick={() => adjustFontSize(-1)}
                  aria-label="Giảm cỡ chữ"
                >
                  A−
                </button>
                <span className="t-mono">{fontSize}</span>
                <button
                  type="button"
                  onClick={() => adjustFontSize(1)}
                  aria-label="Tăng cỡ chữ"
                >
                  A+
                </button>
              </div>

              <button
                type="button"
                className="pe__tool-btn"
                onClick={handleResetCode}
                title="Khôi phục mã khởi tạo ban đầu (UC08 · A2)"
              >
                Đặt lại
              </button>

              <span className="pe__spacer" />

              <Button
                variant="secondary"
                size="sm"
                onDark
                disabled={running}
                onClick={() => void triggerExecution("run")}
              >
                Run
              </Button>
              <Button
                variant="accent"
                size="sm"
                className="pe__submit-btn"
                disabled={running}
                onClick={() => void triggerExecution("submit")}
              >
                Submit
              </Button>
            </div>

            {emptyError && (
              <div className="pe__alert" role="alert">
                {emptyError}
              </div>
            )}

            <div className="pe__monaco">
              <Suspense fallback={<div className="empty pe__loading">Đang tải trình soạn thảo...</div>}>
                <CodeEditor
                  language={lang}
                  value={code}
                  onChange={handleCodeChange}
                  fontSize={fontSize}
                />
              </Suspense>
            </div>

            <div className="pe__statusbar">
              <span className="t-mono pe__status-item">
                {activeLangLabel} · UTF-8 · {lineCount} dòng
              </span>
              <span className="t-mono pe__status-item">
                {savedAt ? `Lưu nháp lúc ${savedAt}` : "Bản nháp cục bộ sẵn sàng"}
              </span>
            </div>
          </section>

          {/* Zero-Trust Sandbox Inspector (BR3 · NFR02) */}
          <Card className="pe__results" aria-live="polite">
            <div className="pe__sandbox-head">
              <div className="row wrap stack-sm">
                <h2 className="t-heading-s">Sandbox chấm tự động</h2>
                <RuleTag code="BR3">Zero-trust</RuleTag>
                <RuleTag code="NFR02">Cô lập container</RuleTag>
              </div>
              <p className="t-mono pe__sandbox-spec">{SANDBOX_CONSTRAINTS_SPEC}</p>
            </div>

            {!hasRun ? (
              <p className="t-body-s c-ink2">
                Bấm <strong>Run</strong> để kiểm tra bộ test mẫu (không tính điểm) hoặc{" "}
                <strong>Submit</strong> để chấm bộ {problem ? `${problem.tests} ` : ""}test đầy đủ. Mỗi lượt thực thi chạy trong container tạm thời và tự hủy ngay sau khi thu kết quả.
              </p>
            ) : (
              <>
                <div className="row between wrap">
                  <Tabs
                    label="Chế độ kết quả chấm"
                    value={tab}
                    onChange={(nextTab) => {
                      setTab(nextTab);
                      setExecError(null);
                    }}
                    tabs={resultTabs}
                  />

                  <div className="row wrap stack-sm">
                    {running ? (
                      <Badge tone="brand" dot>
                        Bước {Math.min(activeStep + 1, SANDBOX_STEPS.length)}/{SANDBOX_STEPS.length}
                      </Badge>
                    ) : activeResult ? (
                      <>
                        <Badge tone={activeResult.tone} dot>
                          {activeResult.summary}
                        </Badge>
                        <span className="t-mono c-ink2">
                          {activeResult.totalTime} · {activeResult.peakMem}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Tiến trình 7 bước hiển thị trên 1 dải mảnh gọn gàng */}
                <ol className="pe__steps-inline" aria-label="Tiến trình thực thi trong Sandbox">
                  {SANDBOX_STEPS.map((stepName, i) => {
                    const st =
                      i < activeStep ? "done" : i === activeStep && running ? "active" : "pending";
                    return (
                      <li key={stepName} className={`pe__step-inline is-${st}`}>
                        <span className="pe__step-check" aria-hidden="true">
                          {st === "done" ? "✓" : `${i + 1}.`}
                        </span>
                        <span>{stepName}</span>
                      </li>
                    );
                  })}
                </ol>

                {execError && (
                  <ErrorBanner
                    title="Sandbox chấm tự động chưa phản hồi"
                    message={execError}
                    onRetry={() => void triggerExecution(tab)}
                  />
                )}

                {!running && !execError && activeResult && (
                  <>
                    <div className="pe__test-list" role="list" aria-label="Chi tiết từng test case">
                      {activeResult.tests.map((t) => {
                        const st = TEST_STATUS_META[t.status];
                        return (
                          <div key={t.name} role="listitem" className="pe__test-row">
                            <div className="pe__test-main">
                              <span className="t-body-s t-strong pe__test-name">{t.name}</span>
                              {t.detail && <span className="t-body-s c-ink2">· {t.detail}</span>}
                            </div>
                            <div className="pe__test-metrics">
                              <span className="t-mono c-ink2">
                                {t.status === "tle" ? "> 3000 ms" : `${t.timeMs} ms`} ·{" "}
                                {t.memMb.toFixed(1)} MB
                              </span>
                              <Badge tone={st.tone} dot>
                                {st.label}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="row between wrap pe__worker-foot">
                      <span className="t-mono c-ink2">{activeResult.exitCode}</span>
                    </div>

                    {activeResult.coachTitle ? (
                      <Callout
                        tone={
                          activeResult.tone === "success"
                            ? "success"
                            : activeResult.tone === "danger"
                              ? "danger"
                              : "warning"
                        }
                        title={activeResult.coachTitle}
                      >
                        {activeResult.coachBody}
                      </Callout>
                    ) : (
                      <p className="t-body-s c-ink2">{activeResult.note}</p>
                    )}
                  </>
                )}

                {!running && !execError && !activeResult && (
                  <p className="t-body-s c-ink2">
                    Chưa có kết quả cho chế độ <strong>{tab === "run" ? "Run" : "Submit"}</strong>. Bấm{" "}
                    <strong>{tab === "run" ? "Run" : "Submit"}</strong> trên thanh công cụ để thực thi trong Sandbox.
                  </p>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingLang)}
        title="Đổi ngôn ngữ lập trình?"
        confirmLabel="Chuyển ngôn ngữ"
        confirmVariant="primary"
        onCancel={() => setPendingLang(null)}
        onConfirm={confirmLangSwitch}
      >
        Bản nháp hiện tại của <strong>{activeLangLabel}</strong> đã được lưu cục bộ. Chuyển sang{" "}
        <strong>{LANGUAGES.find((l) => l.value === pendingLang)?.label}</strong> sẽ nạp bản nháp hoặc mẫu khởi tạo của ngôn ngữ mới (UC08 · A1).
      </ConfirmDialog>
    </div>
  );
}
