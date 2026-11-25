import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge, Button, Callout, Card, CardHead, RuleTag, Tabs } from "../components/ui.jsx";
import { ConfirmDialog } from "../components/Room.jsx";
import { DIFFICULTY, LANGUAGES, problems } from "../data/mock.js";
import {
  MOCK_RESULTS,
  SAMPLE_SOLUTION,
  SANDBOX_CONSTRAINTS_SPEC,
  SANDBOX_STEPS,
  TEST_STATUS,
} from "../lib/sandbox.js";
import "./ProblemEditorScreen.css";

const CodeEditor = lazy(() => import("../components/CodeEditor.jsx"));

const GENERIC_STARTER = {
  python: "class Solution:\n    def solve(self, *args):\n        # Viết lời giải của bạn ở đây\n        pass\n",
  javascript: "function solve(...args) {\n  // Viết lời giải của bạn ở đây\n}\n",
  cpp: "class Solution {\npublic:\n    // Viết lời giải của bạn ở đây\n};\n",
  java: "class Solution {\n    // Viết lời giải của bạn ở đây\n}\n",
};

const SUBMIT_PRESETS = [
  { id: "submit", label: "TLE (4/5)" },
  { id: "accepted", label: "Accepted (5/5)" },
  { id: "mle", label: "MLE (>256 MB)" },
  { id: "re", label: "Runtime error" },
];

// UC08 Viết & nộp bài + UC09 Chấm qua Zero-Trust Docker Sandbox — CHỈ UI.
export default function ProblemEditorScreen() {
  const { id } = useParams();
  const problem = problems.find((p) => p.id === id);

  const [lang, setLang] = useState("python");
  const [pendingLang, setPendingLang] = useState(null);
  const [fontSize, setFontSize] = useState(14);
  const [code, setCode] = useState(() => (problem?.starter ?? GENERIC_STARTER).python);
  const [emptyError, setEmptyError] = useState("");

  const [hasRun, setHasRun] = useState(false);
  const [tab, setTab] = useState("run"); // "run" | "submit"
  const [submitPreset, setSubmitPreset] = useState("submit");
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    if (!running) return undefined;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setActiveStep(SANDBOX_STEPS.length);
      setRunning(false);
      return undefined;
    }

    const idTimer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= SANDBOX_STEPS.length - 1) {
          clearInterval(idTimer);
          setRunning(false);
          return SANDBOX_STEPS.length;
        }
        return prev + 1;
      });
    }, 90);

    return () => clearInterval(idTimer);
  }, [running]);

  if (!problem) {
    return (
      <div className="empty">
        <p className="t-heading-m">Không tìm thấy bài tập #{id}</p>
        <Link to="/problems">← Quay lại ngân hàng bài tập</Link>
      </div>
    );
  }

  const starters = problem.starter ?? GENERIC_STARTER;
  const diff = DIFFICULTY[problem.difficulty];

  const handleLangChange = (nextLang) => {
    const currentStarter = starters[lang] ?? GENERIC_STARTER[lang];
    if (code.trim() !== currentStarter.trim() && code.trim() !== SAMPLE_SOLUTION.trim()) {
      setPendingLang(nextLang);
      return;
    }
    setLang(nextLang);
    setCode(starters[nextLang] ?? GENERIC_STARTER[nextLang]);
    setEmptyError("");
  };

  const confirmLangSwitch = () => {
    if (!pendingLang) return;
    setLang(pendingLang);
    setCode(starters[pendingLang] ?? GENERIC_STARTER[pendingLang]);
    setPendingLang(null);
    setEmptyError("");
  };

  const triggerExecution = (mode, presetOverride) => {
    if (!code.trim()) {
      setEmptyError("Mã nguồn đang trống — vui lòng nhập lời giải trước khi chạy thử hoặc nộp bài (UC08 · E1).");
      return;
    }
    setEmptyError("");
    setHasRun(true);
    setTab(mode);
    if (mode === "submit" && !presetOverride) {
      const looksOptimal = /seen\s*=|new Map|unordered_map|HashMap/.test(code);
      setSubmitPreset(looksOptimal ? "accepted" : "submit");
    } else if (presetOverride) {
      setSubmitPreset(presetOverride);
    }
    setActiveStep(0);
    setRunning(true);
  };

  const activeResultKey = tab === "run" ? "run" : submitPreset;
  const res = hasRun ? MOCK_RESULTS[activeResultKey] : null;
  const lineCount = code.split("\n").length;

  return (
    <div className="pe">
      <header className="pe__top">
        <Link to="/problems" className="pe__back">
          ← Ngân hàng bài tập
        </Link>
        <span className="t-mono c-ink2">#{problem.id}</span>
        <h1 className="t-heading-m pe__title">{problem.title}</h1>
        <Badge tone={diff.tone} dot>
          {diff.label}
        </Badge>
        <span className="t-body-s c-ink2">{problem.topic}</span>
        <RuleTag code="BR4">Đã duyệt {problem.approvedAt}</RuleTag>
        <span className="pe__spacer" />
        <span className="t-body-s pe__autosave">Đã lưu nháp · 10:42</span>
      </header>

      <div className="pe__grid">
        {/* Cột trái: Đề bài phẳng, phân tách bằng đường mảnh 1px (không hộp xám lồng nhau, không hộp xanh pastel) */}
        <Card as="article" className="pe__problem">
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
                <div key={i} className="pe__example-row">
                  <p className="t-code">
                    <span className="c-ink2">Input: </span>
                    {ex.input}
                  </p>
                  <p className="t-code">
                    <span className="c-ink2">Output: </span>
                    {ex.output}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pe__section pe__note">
            <p className="pe__subhead">Lưu ý phỏng vấn</p>
            <p className="t-body-s c-ink2">
              Nói rõ hướng giải và độ phức tạp Big-O trước khi viết vòng lặp. Trong phỏng vấn kỹ thuật, độ đúng của mã và lập luận được chấm độc lập (BR2).
            </p>
          </div>
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
                onChange={(e) => handleLangChange(e.target.value)}
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
                  onClick={() => setFontSize((s) => Math.max(12, s - 1))}
                  aria-label="Giảm cỡ chữ"
                >
                  A−
                </button>
                <span className="t-mono">{fontSize}</span>
                <button
                  type="button"
                  onClick={() => setFontSize((s) => Math.min(22, s + 1))}
                  aria-label="Tăng cỡ chữ"
                >
                  A+
                </button>
              </div>

              <button
                type="button"
                className="pe__tool-btn"
                onClick={() => {
                  setCode(starters[lang] ?? GENERIC_STARTER[lang]);
                  setEmptyError("");
                }}
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
                onClick={() => triggerExecution("run")}
              >
                Run
              </Button>
              <Button
                variant="accent"
                size="sm"
                className="pe__submit-btn"
                disabled={running}
                onClick={() => triggerExecution("submit")}
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
                <CodeEditor language={lang} value={code} onChange={setCode} fontSize={fontSize} />
              </Suspense>
            </div>

            <div className="pe__statusbar">
              <span className="t-mono pe__status-item">
                {LANGUAGES.find((l) => l.value === lang)?.label} · UTF-8 · {lineCount} dòng
              </span>
              <button
                type="button"
                className="pe__sample-btn"
                onClick={() => {
                  setLang("python");
                  setCode(SAMPLE_SOLUTION);
                  setEmptyError("");
                }}
              >
                Nạp lời giải O(n) mẫu
              </button>
            </div>
          </section>

          {/* Zero-Trust Sandbox Inspector (BR3 · NFR02) — 1 dải thông số duy nhất, không lặp 7 pill xám */}
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
                Bấm <strong>Run</strong> để kiểm tra 2 test mẫu (không tính điểm) hoặc <strong>Submit</strong> để chấm bộ {problem.tests} test đầy đủ. Mỗi lượt thực thi chạy trong container tạm thời và tự hủy ngay sau khi thu kết quả.
              </p>
            ) : (
              <>
                <div className="row between wrap">
                  <Tabs
                    label="Chế độ kết quả chấm"
                    value={tab}
                    onChange={(nextTab) => {
                      setTab(nextTab);
                      setRunning(false);
                      setActiveStep(SANDBOX_STEPS.length);
                    }}
                    tabs={[
                      { value: "run", label: "Run · test mẫu" },
                      { value: "submit", label: `Submit · ${problem.tests} test` },
                    ]}
                  />

                  <div className="row wrap stack-sm">
                    {running ? (
                      <Badge tone="brand" dot>
                        Bước {Math.min(activeStep + 1, SANDBOX_STEPS.length)}/{SANDBOX_STEPS.length}
                      </Badge>
                    ) : (
                      <>
                        <Badge tone={res.tone} dot>
                          {res.summary}
                        </Badge>
                        <span className="t-mono c-ink2">
                          {res.totalTime} · {res.peakMem}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Tiến trình 7 bước hiển thị trên 1 dải mảnh gọn gàng */}
                <ol className="pe__steps-inline" aria-label="Tiến trình thực thi trong Sandbox">
                  {SANDBOX_STEPS.map((stepName, i) => {
                    const st = i < activeStep ? "done" : i === activeStep && running ? "active" : "pending";
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

                {tab === "submit" && (
                  <div className="pe__presets">
                    <span className="t-body-s c-ink2">Kịch bản kiểm thử UC09:</span>
                    <div className="row wrap stack-sm">
                      {SUBMIT_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={`pe__preset-chip ${submitPreset === p.id ? "is-active" : ""}`}
                          onClick={() => triggerExecution("submit", p.id)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!running && res && (
                  <>
                    <div className="pe__test-list" role="list" aria-label="Chi tiết từng test case">
                      {res.tests.map((t) => {
                        const st = TEST_STATUS[t.status];
                        return (
                          <div key={t.name} role="listitem" className="pe__test-row">
                            <div className="pe__test-main">
                              <span className="t-body-s t-strong" style={{ color: "var(--ink)" }}>
                                {t.name}
                              </span>
                              {t.detail && <span className="t-body-s c-ink2">· {t.detail}</span>}
                            </div>
                            <div className="pe__test-metrics">
                              <span className="t-mono c-ink2">
                                {t.status === "tle" ? "> 3000 ms" : `${t.timeMs} ms`} · {t.memMb.toFixed(1)} MB
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
                      <span className="t-mono c-ink2">{res.exitCode}</span>
                    </div>

                    {res.coachTitle ? (
                      <Callout tone={res.tone === "success" ? "success" : res.tone === "danger" ? "danger" : "warning"} title={res.coachTitle}>
                        {res.coachBody}
                      </Callout>
                    ) : (
                      <p className="t-body-s c-ink2">{res.note}</p>
                    )}
                  </>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingLang)}
        title="Đổi ngôn ngữ lập trình?"
        confirmLabel="Nạp mẫu khởi tạo mới"
        confirmVariant="primary"
        onCancel={() => setPendingLang(null)}
        onConfirm={confirmLangSwitch}
      >
        Bạn đã chỉnh sửa mã hiện tại. Đổi sang{" "}
        <strong>{LANGUAGES.find((l) => l.value === pendingLang)?.label}</strong> sẽ nạp lại mẫu khởi tạo của ngôn ngữ mới (UC08 · A1).
      </ConfirmDialog>
    </div>
  );
}
