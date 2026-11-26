import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { LogoMark } from "@shared/components/Logo";
import SplitPane from "@shared/components/SplitPane";
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
  ErrorBanner,
  RuleTag,
  Skeleton,
  type ButtonVariant,
} from "@shared/ui";
import { codingService } from "./coding.service";
import "./ProblemEditorScreen.css";

const CodeEditor = lazy(() => import("@shared/components/CodeEditor"));

type LeftTab = "description" | "examples" | "notes";
type BottomTab = "testcase" | "result" | "steps";

const INTERVIEW_TIPS: readonly { step: string; title: string; detail: string }[] = [
  {
    step: "01",
    title: "Làm rõ dữ liệu đầu vào và biên",
    detail: "Xác nhận kích thước mảng, giá trị âm/trùng lặp, chuỗi rỗng hoặc giới hạn tràn số trước khi thiết kế giải thuật.",
  },
  {
    step: "02",
    title: "Nêu ý tưởng và Big-O trước khi viết mã",
    detail: "Trình bày cách tiếp cận cơ bản (brute-force), nêu điểm nghẽn rồi mới tối ưu cấu trúc dữ liệu (Hash Map, Two Pointers, Heap…).",
  },
  {
    step: "03",
    title: "Viết mã sạch, tách hàm hợp lý",
    detail: "Đặt tên biến rõ ngữ nghĩa, tránh mã lặp và giải thích từng nhánh rẽ chính trong quá trình gõ.",
  },
  {
    step: "04",
    title: "Tự chạy tay với trường hợp biên",
    detail: "Kiểm tra lại bằng mẫu nhỏ và biên cực trị trước khi bấm Submit; trong phỏng vấn kỹ thuật, tư duy và độ đúng được chấm độc lập (BR2).",
  },
];

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
      <div className="t-body-s c-ink2">{children}</div>
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

function ThemeIcon({ mode }: { mode: "light" | "dark" }) {
  if (mode === "dark") {
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.6 3.6l1.05 1.05M11.35 11.35l1.05 1.05M12.4 3.6l-1.05 1.05M4.65 11.35 3.6 12.4"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M13.2 9.9A5.5 5.5 0 0 1 6.1 2.8a5.6 5.6 0 1 0 7.1 7.1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
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

  const [leftTab, setLeftTab] = useState<LeftTab>("description");
  const [bottomTab, setBottomTab] = useState<BottomTab>("testcase");
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [scratchInput, setScratchInput] = useState("nums = [2, 7, 11, 15], target = 9");

  const [lang, setLang] = useState<ProgrammingLanguage>("python");
  const langRef = useRef<ProgrammingLanguage>(lang);
  langRef.current = lang;

  const [pendingLang, setPendingLang] = useState<ProgrammingLanguage | null>(null);
  const [fontSize, setFontSize] = useState<number>(() => localStore.getEditorFontSize());
  const [editorTheme, setEditorTheme] = useState<"light" | "dark">(() => localStore.getEditorTheme());
  const [code, setCode] = useState<string>(
    () => localStore.getCodeDraft(problemId, "python") ?? DEFAULT_CODE_TEMPLATES.python,
  );
  const [savedAt, setSavedAt] = useState<string | null>(() =>
    localStore.getCodeDraft(problemId, "python") !== null ? formatClockTime(new Date()) : null,
  );
  const [emptyError, setEmptyError] = useState("");

  const [resultMode, setResultMode] = useState<SandboxRunMode>("run");
  const [running, setRunning] = useState(false);
  const [runningMode, setRunningMode] = useState<SandboxRunMode | null>(null);
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
    const currentLang = langRef.current;
    const draft = localStore.getCodeDraft(problemId, currentLang);
    setCode(draft ?? DEFAULT_CODE_TEMPLATES[currentLang]);
    setSavedAt(draft !== null ? formatClockTime(new Date()) : null);
    setResultsByMode({});
    setExecError(null);
    setActiveStep(-1);
    setEmptyError("");
    setSelectedCaseIdx(0);
    setLeftTab("description");
    setBottomTab("testcase");
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
        const currentLang = langRef.current;
        const existingDraft = localStore.getCodeDraft(problemId, currentLang);
        const starterCode = data.starter?.[currentLang];
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

  const toggleEditorTheme = () => {
    setEditorTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStore.setEditorTheme(next);
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

    if (mode === "submit") {
      localStore.recordTodayPractice();
    }

    execAbortRef.current?.abort();
    const controller = new AbortController();
    execAbortRef.current = controller;

    setEmptyError("");
    setExecError(null);
    setResultMode(mode);
    setBottomTab("result");
    setRunning(true);
    setRunningMode(mode);

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
        setRunningMode(null);
      }
    }
  };

  const activeResult = resultsByMode[resultMode] ?? null;
  const lineCount = code.split("\n").length;
  const activeLangLabel = LANGUAGES.find((l) => l.value === lang)?.label ?? lang;
  const examples = problem?.examples ?? [];
  const activeExample = examples[selectedCaseIdx] ?? examples[0] ?? null;
  const isDarkEditor = editorTheme === "dark";

  const titlePillText = problem
    ? `#${problem.id} · ${problem.title}`
    : isStandaloneSandbox
      ? "Sandbox tự do"
      : `#${problemId}`;

  const renderDescriptionParagraphs = (text: string) =>
    text
      .split(/\n+/)
      .filter(Boolean)
      .map((paragraph, idx) => (
        <p key={idx} className="pe-prose">
          {paragraph}
        </p>
      ));

  const leftPane = (
    <section className="lc-pane pe-left-pane" aria-label="Nội dung đề bài">
      <div className="lc-pane__head">
        <div className="lc-pane__tabs" role="tablist" aria-label="Thẻ thông tin đề bài">
          <button
            type="button"
            role="tab"
            aria-selected={leftTab === "description"}
            className={`lc-pane__tab ${leftTab === "description" ? "is-active" : ""}`.trim()}
            onClick={() => setLeftTab("description")}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2.5" y="2" width="11" height="12" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5.25 5.5h5.5M5.25 8.25h5.5M5.25 11h3.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
            </svg>
            <span>Đề bài</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={leftTab === "examples"}
            className={`lc-pane__tab ${leftTab === "examples" ? "is-active" : ""}`.trim()}
            onClick={() => setLeftTab("examples")}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 4.25h10M3 8h7M3 11.75h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span>Ví dụ & Ràng buộc</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={leftTab === "notes"}
            className={`lc-pane__tab ${leftTab === "notes" ? "is-active" : ""}`.trim()}
            onClick={() => setLeftTab("notes")}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8 7.25v3.5M8 5.25h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>Lưu ý phỏng vấn</span>
          </button>
        </div>
      </div>

      <div className="lc-pane__body pe-problem-body">
        {leftTab === "notes" ? (
          <div className="pe-notes">
            <div className="pe-notes__head">
              <h2 className="pe-section-title">Lưu ý khi giải bài trong phỏng vấn kỹ thuật</h2>
              <RuleTag code="BR2">Đánh giá độc lập</RuleTag>
            </div>
            <p className="pe-prose">
              Trong phiên phỏng vấn kỹ thuật tại DevOrDead, lập luận giải thuật và kết quả chạy mã trong Docker Sandbox được ghi nhận tách biệt để phản ánh đúng năng lực kỹ sư.
            </p>
            <ol className="pe-tip-list">
              {INTERVIEW_TIPS.map((tip) => (
                <li key={tip.step} className="pe-tip-item">
                  <span className="pe-tip-item__num pe-tabular">{tip.step}</span>
                  <div className="pe-tip-item__copy">
                    <p className="pe-tip-item__title">{tip.title}</p>
                    <p className="pe-tip-item__desc">{tip.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="pe-notes__foot">
              <Link to="/interview/setup" className="btn btn--secondary btn--sm">
                Mở phòng phỏng vấn Live Coding →
              </Link>
            </div>
          </div>
        ) : isStandaloneSandbox ? (
          <div className="pe-problem-content">
            <div className="pe-prob-head">
              <h1 className="pe-prob-title">Sandbox IDE tự do</h1>
              <div className="pe-prob-meta">
                <span className="pe-meta-chip">Chế độ cục bộ</span>
                <span className="pe-meta-chip">4 ngôn ngữ</span>
                <span className="pe-meta-chip">Tự lưu nháp</span>
              </div>
            </div>

            {leftTab === "description" ? (
              <>
                <p className="pe-prose">
                  Không gian viết mã Monaco hoạt động độc lập với 4 ngôn ngữ (Python 3, JavaScript, C++ 17, Java 17) và tự động lưu bản nháp ngay trên trình duyệt của bạn.
                </p>
                <p className="pe-prose">
                  Bạn có thể thử nghiệm ý tưởng giải thuật nhanh, chỉnh dữ liệu đầu vào tại thẻ{" "}
                  <strong>Test mẫu</strong> ở bên dưới, hoặc quay lại{" "}
                  <Link to="/problems" className="pe-inline-link">
                    Ngân hàng bài tập
                  </Link>{" "}
                  để chọn bài kiểm duyệt theo bộ test tự động.
                </p>
                <div className="pe-block">
                  <h2 className="pe-block__title">Giới hạn Sandbox Zero-trust (BR3 · NFR02)</h2>
                  <ul className="pe-constraints">
                    {SANDBOX_LIMITS.map((limit) => (
                      <li key={limit}>
                        <code className="pe-inline-code">{limit}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="pe-block">
                <h2 className="pe-block__title">Thông số cô lập thực thi (BR3 · NFR02)</h2>
                <p className="pe-prose">
                  Mỗi lần chạy <strong>Run</strong> hoặc <strong>Submit</strong> tạo một container tạm thời không nối mạng, giới hạn tài nguyên bằng cgroups v2 và tự hủy sau khi thu kết quả.
                </p>
                <ul className="pe-constraints">
                  {SANDBOX_LIMITS.map((limit) => (
                    <li key={limit}>
                      <code className="pe-inline-code">{limit}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : problemLoading ? (
          <div className="pe-skeleton" aria-busy="true" aria-label="Đang tải đề bài">
            <Skeleton width="66%" height={24} />
            <div className="row stack-sm">
              <Skeleton width={56} height={20} />
              <Skeleton width={92} height={20} />
              <Skeleton width={76} height={20} />
            </div>
            <Skeleton width="100%" height={15} />
            <Skeleton width="94%" height={15} />
            <Skeleton width="82%" height={15} />
            <Skeleton width="100%" height={84} />
            <Skeleton width="100%" height={72} />
          </div>
        ) : problemError || !problem ? (
          <div className="pe-problem-content">
            <div className="pe-prob-head">
              <h1 className="pe-prob-title">Bài tập #{problemId}</h1>
              <div className="pe-prob-meta">
                <span className="pe-meta-chip">IDE vẫn hoạt động cục bộ</span>
              </div>
            </div>

            <ErrorBanner
              title="Chưa tải được đề bài"
              message={problemError ?? `Không tìm thấy dữ liệu cho bài tập #${problemId}.`}
              onRetry={reloadProblem}
            />

            <p className="pe-prose">
              Trình soạn thảo Monaco bên phải vẫn hoạt động bình thường và tự lưu bản nháp cục bộ theo từng ngôn ngữ. Khi máy chủ API sẵn sàng, bấm <strong>Thử lại</strong> để nạp đề bài.
            </p>

            <div className="pe-block">
              <h2 className="pe-block__title">Giới hạn Sandbox (BR3 · NFR02)</h2>
              <ul className="pe-constraints">
                {SANDBOX_LIMITS.map((limit) => (
                  <li key={limit}>
                    <code className="pe-inline-code">{limit}</code>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : leftTab === "examples" ? (
          <div className="pe-problem-content">
            <div className="pe-prob-head">
              <h1 className="pe-prob-title">
                {problem.id}. {problem.title}
              </h1>
              <div className="pe-prob-meta">
                <span className={`lc-diff lc-diff--${problem.difficulty}`}>
                  {DIFFICULTY_META[problem.difficulty].label}
                </span>
                <span className="pe-meta-chip">{problem.topic}</span>
                <span className="pe-meta-chip">{problem.role}</span>
              </div>
            </div>

            <div className="pe-block">
              <h2 className="pe-block__title">Ví dụ minh họa ({problem.examples.length})</h2>
              <div className="pe-examples">
                {problem.examples.map((ex, idx) => (
                  <div key={`${idx}-${ex.input}`} className="pe-example-block">
                    <p className="pe-example-block__label">Ví dụ {idx + 1}:</p>
                    <div className="pe-example-block__rule">
                      <p className="pe-example-line">
                        <span className="pe-example-key">Input:</span>{" "}
                        <code className="pe-inline-code">{ex.input}</code>
                      </p>
                      <p className="pe-example-line">
                        <span className="pe-example-key">Output:</span>{" "}
                        <code className="pe-inline-code">{ex.output}</code>
                      </p>
                      {ex.explanation && (
                        <p className="pe-example-explain">
                          <span className="pe-example-key">Giải thích:</span> {ex.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pe-block">
              <h2 className="pe-block__title">Ràng buộc dữ liệu</h2>
              <ul className="pe-constraints">
                {problem.constraints.map((c) => (
                  <li key={c}>
                    <code className="pe-inline-code">{c}</code>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pe-block">
              <h2 className="pe-block__title">Môi trường thực thi (BR3 · NFR02)</h2>
              <p className="pe-spec-line">{SANDBOX_CONSTRAINTS_SPEC}</p>
            </div>
          </div>
        ) : (
          <div className="pe-problem-content">
            <div className="pe-prob-head">
              <h1 className="pe-prob-title">
                {problem.id}. {problem.title}
              </h1>
              <div className="pe-prob-meta">
                <span className={`lc-diff lc-diff--${problem.difficulty}`}>
                  {DIFFICULTY_META[problem.difficulty].label}
                </span>
                <span className="pe-meta-chip">{problem.topic}</span>
                <span className="pe-meta-chip">{problem.role}</span>
                <span className="pe-meta-chip pe-tabular">{problem.tests} test</span>
              </div>
            </div>

            <div className="pe-prose-group">{renderDescriptionParagraphs(problem.description)}</div>

            {problem.examples.length > 0 && (
              <div className="pe-examples">
                {problem.examples.map((ex, idx) => (
                  <div key={`${idx}-${ex.input}`} className="pe-example-block">
                    <p className="pe-example-block__label">Ví dụ {idx + 1}:</p>
                    <div className="pe-example-block__rule">
                      <p className="pe-example-line">
                        <span className="pe-example-key">Input:</span>{" "}
                        <code className="pe-inline-code">{ex.input}</code>
                      </p>
                      <p className="pe-example-line">
                        <span className="pe-example-key">Output:</span>{" "}
                        <code className="pe-inline-code">{ex.output}</code>
                      </p>
                      {ex.explanation && (
                        <p className="pe-example-explain">
                          <span className="pe-example-key">Giải thích:</span> {ex.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {problem.constraints.length > 0 && (
              <div className="pe-block">
                <h2 className="pe-block__title">Ràng buộc:</h2>
                <ul className="pe-constraints">
                  {problem.constraints.map((c) => (
                    <li key={c}>
                      <code className="pe-inline-code">{c}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pe-br2-tip">
              <p className="pe-br2-tip__title">Gợi ý phỏng vấn (BR2)</p>
              <p className="pe-br2-tip__body">
                Trình bày rõ độ phức tạp thời gian và bộ nhớ Big-O trước khi viết vòng lặp. Trong phỏng vấn kỹ thuật, chất lượng lập luận và kết quả Sandbox được đánh giá độc lập.
              </p>
            </div>
          </div>
        )}
      </div>

      <footer className="lc-pane__foot pe-tabular">
        <span>{problem ? `BR4 · Đã duyệt ${problem.approvedAt}` : "Chế độ Sandbox cục bộ"}</span>
        <span>{problem ? `${problem.tests} ca kiểm thử` : "4 ngôn ngữ · Lưu nháp tự động"}</span>
      </footer>
    </section>
  );

  const editorPane = (
    <section
      className={`lc-pane pe-editor-pane ${isDarkEditor ? "lc-pane--dark pe-editor-pane--dark" : ""}`.trim()}
      aria-label="Trình soạn thảo mã nguồn"
    >
      <div className="lc-pane__head pe-editor-head">
        <div className="pe-editor-title">
          <svg
            className="pe-editor-title__icon"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5M9 3.5 7 12.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Mã nguồn</span>
        </div>

        <div className="pe-editor-controls">
          <label className="sr-only" htmlFor="pe-lang">
            Ngôn ngữ lập trình
          </label>
          <select
            id="pe-lang"
            className="pe-ctrl-select"
            value={lang}
            onChange={(e) => handleLangChange(e.target.value as ProgrammingLanguage)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>

          <div className="pe-font-stepper" role="group" aria-label="Cỡ chữ trình soạn thảo">
            <button
              type="button"
              className="pe-font-stepper__btn"
              onClick={() => adjustFontSize(-1)}
              aria-label="Giảm cỡ chữ"
            >
              A−
            </button>
            <span className="pe-font-stepper__val pe-tabular">{fontSize}</span>
            <button
              type="button"
              className="pe-font-stepper__btn"
              onClick={() => adjustFontSize(1)}
              aria-label="Tăng cỡ chữ"
            >
              A+
            </button>
          </div>

          <button
            type="button"
            className="pe-ctrl-btn"
            onClick={handleResetCode}
            title="Khôi phục mã khởi tạo ban đầu (UC08 · A2)"
          >
            Đặt lại
          </button>
        </div>
      </div>

      {emptyError && (
        <div className="pe-alert" role="alert">
          {emptyError}
        </div>
      )}

      <div className="lc-pane__body pe-editor-body">
        <Suspense
          fallback={
            <div className="empty pe-editor-loading">Đang tải trình soạn thảo...</div>
          }
        >
          <CodeEditor
            language={lang}
            value={code}
            onChange={handleCodeChange}
            fontSize={fontSize}
            themeMode={editorTheme}
          />
        </Suspense>
      </div>

      <footer className="lc-pane__foot pe-editor-foot pe-tabular">
        <span>{savedAt ? `Đã lưu nháp cục bộ · ${savedAt}` : "Đã lưu nháp cục bộ"}</span>
        <span>
          {lineCount} dòng · {code.length} ký tự · UTF-8
        </span>
      </footer>
    </section>
  );

  const consolePane = (
    <section className="lc-pane pe-console-pane" aria-label="Bảng kiểm thử và kết quả Sandbox" aria-live="polite">
      <div className="lc-pane__head">
        <div className="lc-pane__tabs" role="tablist" aria-label="Thẻ kiểm thử Sandbox">
          <button
            type="button"
            role="tab"
            aria-selected={bottomTab === "testcase"}
            className={`lc-pane__tab ${bottomTab === "testcase" ? "is-active" : ""}`.trim()}
            onClick={() => setBottomTab("testcase")}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2.25" y="2.25" width="11.5" height="11.5" rx="2" stroke="currentColor" strokeWidth="1.4" />
              <path
                d="m5.35 8.15 1.75 1.75 3.6-3.7"
                stroke="currentColor"
                strokeWidth="1.45"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Test mẫu</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={bottomTab === "result"}
            className={`lc-pane__tab ${bottomTab === "result" ? "is-active" : ""}`.trim()}
            onClick={() => setBottomTab("result")}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 4.5 6.5 8 3 11.5M8 11.5h5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Kết quả Sandbox</span>
            {running && <span className="pe-tab-dot pe-tab-dot--running" aria-hidden="true" />}
            {!running && activeResult && (
              <span
                className={`pe-tab-dot pe-tab-dot--${activeResult.tone}`}
                aria-hidden="true"
              />
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={bottomTab === "steps"}
            className={`lc-pane__tab ${bottomTab === "steps" ? "is-active" : ""}`.trim()}
            onClick={() => setBottomTab("steps")}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 2.25 13.5 5.25 8 8.25 2.5 5.25 8 2.25ZM2.5 8.25 8 11.25l5.5-3M2.5 11.25 8 14.25l5.5-3"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>
              Tiến trình 7 bước
              {running ? ` (${Math.min(activeStep + 1, SANDBOX_STEPS.length)}/${SANDBOX_STEPS.length})` : ""}
            </span>
          </button>
        </div>

        <RuleTag code="NFR02">256 MB · 3s</RuleTag>
      </div>

      <div className="lc-pane__body pe-console-body">
        {bottomTab === "testcase" && (
          <div className="pe-testcase">
            {examples.length > 0 && activeExample ? (
              <>
                <div className="pe-case-pills" role="tablist" aria-label="Chọn bộ test mẫu">
                  {examples.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      role="tab"
                      aria-selected={idx === selectedCaseIdx}
                      className={`pe-case-pill ${idx === selectedCaseIdx ? "is-active" : ""}`.trim()}
                      onClick={() => setSelectedCaseIdx(idx)}
                    >
                      Case {idx + 1}
                    </button>
                  ))}
                </div>

                <div className="pe-io-grid">
                  <div className="pe-io-field">
                    <span className="pe-io-label">Input</span>
                    <pre className="pe-io-box">
                      <code>{activeExample.input}</code>
                    </pre>
                  </div>
                  <div className="pe-io-field">
                    <span className="pe-io-label">Expected Output</span>
                    <pre className="pe-io-box">
                      <code>{activeExample.output}</code>
                    </pre>
                  </div>
                </div>

                {activeExample.explanation && (
                  <p className="pe-io-explain">
                    <strong>Giải thích:</strong> {activeExample.explanation}
                  </p>
                )}
              </>
            ) : (
              <div className="pe-scratch-wrap">
                <label htmlFor="pe-scratch-input" className="pe-io-label">
                  Dữ liệu đầu vào thử nghiệm (Stdin cục bộ)
                </label>
                <textarea
                  id="pe-scratch-input"
                  className="pe-scratch-input"
                  rows={3}
                  value={scratchInput}
                  onChange={(e) => setScratchInput(e.target.value)}
                  placeholder="Nhập test mẫu tùy chỉnh cho phiên Sandbox..."
                />
              </div>
            )}

            <p className="pe-spec-line">{SANDBOX_CONSTRAINTS_SPEC}</p>
          </div>
        )}

        {bottomTab === "result" && (
          <div className="pe-result">
            {running ? (
              <div className="pe-running-state">
                <div className="pe-running-head">
                  <span className="pe-running-dot" aria-hidden="true" />
                  <p className="pe-running-title">
                    Đang {runningMode === "submit" ? "chấm toàn bộ test" : "chạy bộ test mẫu"} trong container cô lập…
                  </p>
                  <span className="pe-running-step pe-tabular">
                    Bước {Math.min(activeStep + 1, SANDBOX_STEPS.length)}/{SANDBOX_STEPS.length}
                  </span>
                </div>
                <p className="pe-running-sub">
                  {SANDBOX_STEPS[Math.max(0, Math.min(activeStep, SANDBOX_STEPS.length - 1))]}
                </p>
                <button
                  type="button"
                  className="pe-text-link"
                  onClick={() => setBottomTab("steps")}
                >
                  Xem chi tiết tiến trình 7 bước →
                </button>
              </div>
            ) : execError ? (
              <ErrorBanner
                title="Sandbox chấm tự động chưa phản hồi"
                message={execError}
                onRetry={() => void triggerExecution(resultMode)}
              />
            ) : activeResult ? (
              <>
                <div className="pe-verdict-bar">
                  <div className="pe-verdict-main">
                    <span className={`pe-verdict-title pe-verdict-title--${activeResult.tone}`}>
                      {activeResult.summary}
                    </span>
                    <span className="pe-verdict-metrics pe-tabular">
                      {activeResult.totalTime} · {activeResult.peakMem}
                    </span>
                  </div>

                  <div className="pe-mode-switch" role="group" aria-label="Chế độ kết quả">
                    <button
                      type="button"
                      className={`pe-mode-btn ${resultMode === "run" ? "is-active" : ""}`.trim()}
                      onClick={() => {
                        setResultMode("run");
                        setExecError(null);
                      }}
                    >
                      Run
                    </button>
                    <button
                      type="button"
                      className={`pe-mode-btn ${resultMode === "submit" ? "is-active" : ""}`.trim()}
                      onClick={() => {
                        setResultMode("submit");
                        setExecError(null);
                      }}
                    >
                      Submit
                    </button>
                  </div>
                </div>

                {activeResult.tests.length > 0 && (
                  <div className="pe-test-list" role="list" aria-label="Chi tiết từng test case">
                    {activeResult.tests.map((t) => {
                      const st = TEST_STATUS_META[t.status];
                      return (
                        <div key={t.name} role="listitem" className="pe-test-row">
                          <div className="pe-test-row__left">
                            <span className="pe-test-row__name">{t.name}</span>
                            {t.detail && <span className="pe-test-row__detail">· {t.detail}</span>}
                          </div>
                          <div className="pe-test-row__right pe-tabular">
                            <span className="pe-test-row__metrics">
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
                )}

                <div className="pe-result-foot pe-tabular">
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
                ) : activeResult.note ? (
                  <p className="pe-result-note">{activeResult.note}</p>
                ) : null}
              </>
            ) : (
              <div className="pe-console-empty">
                <p className="pe-console-empty__title">Chưa có kết quả thực thi</p>
                <p className="pe-console-empty__sub">
                  Bấm <strong>Run</strong> để chạy bộ test mẫu hoặc <strong>Submit</strong> để chấm toàn bộ{" "}
                  {problem ? `${problem.tests} ` : ""}test case trong Docker Sandbox cô lập (BR3).
                </p>
              </div>
            )}
          </div>
        )}

        {bottomTab === "steps" && (
          <div className="pe-steps-wrap">
            <div className="pe-steps-head">
              <span className="pe-io-label">Vòng đời container Zero-trust (BR3)</span>
              <span className="pe-steps-badge pe-tabular">
                {activeStep < 0
                  ? "Sẵn sàng"
                  : running
                    ? `Đang chạy · ${Math.min(activeStep + 1, SANDBOX_STEPS.length)}/${SANDBOX_STEPS.length}`
                    : execError
                      ? "Gián đoạn kết nối"
                      : "Hoàn tất 7/7"}
              </span>
            </div>

            <ol className="pe-step-list" aria-label="Tiến trình thực thi 7 bước trong Sandbox">
              {SANDBOX_STEPS.map((stepName, i) => {
                const state =
                  i < activeStep
                    ? "done"
                    : i === activeStep && running
                      ? "active"
                      : "pending";
                return (
                  <li key={stepName} className={`pe-step-row is-${state}`}>
                    <span className="pe-step-row__idx pe-tabular" aria-hidden="true">
                      {state === "done" ? "✓" : String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="pe-step-row__name">{stepName}</span>
                    <span className="pe-step-row__state">
                      {state === "done"
                        ? "Hoàn tất"
                        : state === "active"
                          ? "Đang thực thi…"
                          : "Chờ"}
                    </span>
                  </li>
                );
              })}
            </ol>

            <p className="pe-spec-line">{SANDBOX_CONSTRAINTS_SPEC}</p>
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div className="lc-workbench pe-workbench">
      {/* 48px LeetCode Workbench Top Bar */}
      <header className="lc-wb-bar">
        <div className="lc-wb-bar__left">
          <Link
            to="/dashboard"
            className="pe-wb-brand"
            title="DevOrDead — về trang tổng quan"
            aria-label="DevOrDead — về trang tổng quan"
          >
            <LogoMark size={22} />
          </Link>

          <span className="pe-wb-sep" aria-hidden="true" />

          <Link to="/problems" className="lc-wb-back">
            ← Danh sách bài
          </Link>

          <span className="pe-wb-title-pill" title={titlePillText}>
            {titlePillText}
          </span>
        </div>

        <div className="lc-wb-bar__center">
          <div className="lc-wb-actions" role="group" aria-label="Chạy thử và nộp bài">
            <button
              type="button"
              className="lc-wb-run"
              disabled={running}
              onClick={() => void triggerExecution("run")}
              title="Chạy kiểm thử với các ví dụ mẫu"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                <path d="M2.5 1.8a.6.6 0 0 1 .9-.52l7.1 4.2a.6.6 0 0 1 0 1.04l-7.1 4.2a.6.6 0 0 1-.9-.52V1.8Z" />
              </svg>
              <span>{running && runningMode === "run" ? "Đang chạy…" : "Run"}</span>
            </button>

            <button
              type="button"
              className="lc-wb-submit"
              disabled={running}
              onClick={() => void triggerExecution("submit")}
              title="Nộp bài chấm toàn bộ test case trong Sandbox"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M8 12.25V3.75M4.5 7.25 8 3.75l3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.65"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{running && runningMode === "submit" ? "Đang chấm…" : "Submit"}</span>
            </button>
          </div>
        </div>

        <div className="lc-wb-bar__right">
          <RuleTag code="BR3">Zero-trust</RuleTag>

          <button
            type="button"
            className="pe-wb-theme-btn"
            onClick={toggleEditorTheme}
            title={isDarkEditor ? "Đang dùng giao diện IDE Tối — bấm để chuyển sang Sáng" : "Đang dùng giao diện IDE Sáng — bấm để chuyển sang Tối"}
            aria-label={isDarkEditor ? "Chuyển IDE sang nền Sáng" : "Chuyển IDE sang nền Tối"}
          >
            <ThemeIcon mode={editorTheme} />
            <span>{isDarkEditor ? "Tối" : "Sáng"}</span>
          </button>

          <Link
            to="/dashboard"
            className="lc-topbar__icon-btn"
            title="Về trang tổng quan"
            aria-label="Về trang tổng quan"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
              <rect x="9" y="2" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
              <rect x="2" y="9" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
              <rect x="9" y="9" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Full-Viewport Resizable Tiled Split Panes */}
      <main className="lc-wb-body">
        <SplitPane
          direction="horizontal"
          storageKey="ide-h"
          initialRatio={0.44}
          minRatio={0.28}
          maxRatio={0.68}
          label="Điều chỉnh tỷ lệ khung đề bài và khung lập trình"
          first={leftPane}
          second={
            <SplitPane
              direction="vertical"
              storageKey="ide-v"
              initialRatio={0.64}
              minRatio={0.35}
              maxRatio={0.82}
              label="Điều chỉnh tỷ lệ trình soạn thảo và khung kiểm thử"
              first={editorPane}
              second={consolePane}
            />
          }
        />
      </main>

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
