import { lazy, Suspense, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge, Button, Card, CardHead, RuleTag, Tabs } from "../components/ui.jsx";
import { problems, DIFFICULTY, LANGUAGES } from "../data/mock.js";
import { MOCK_RESULTS, SANDBOX_LIMITS, SANDBOX_STEPS, TEST_STATUS } from "../lib/sandbox.js";
import "./ProblemEditorScreen.css";

const CodeEditor = lazy(() => import("../components/CodeEditor.jsx"));

const GENERIC_STARTER = {
  python: "class Solution:\n    def solve(self, *args):\n        # Viết lời giải của bạn ở đây\n        pass\n",
  javascript: "function solve(...args) {\n  // Viết lời giải của bạn ở đây\n}\n",
  cpp: "class Solution {\npublic:\n    // Viết lời giải của bạn ở đây\n};\n",
  java: "class Solution {\n    // Viết lời giải của bạn ở đây\n}\n",
};

// UC08 Viết & nộp bài + UC09 Chấm qua Sandbox — CHỈ UI (kết quả là dữ liệu minh họa).
export default function ProblemEditorScreen() {
  const { id } = useParams();
  const problem = problems.find((p) => p.id === id);
  const [lang, setLang] = useState("python");
  const [fontSize, setFontSize] = useState(14);
  const [code, setCode] = useState(() => (problem?.starter ?? GENERIC_STARTER).python);
  const [result, setResult] = useState(null); // null | "run" | "submit"
  const [tab, setTab] = useState("run");

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
  const show = (mode) => {
    setResult(mode);
    setTab(mode);
  };
  const res = result ? MOCK_RESULTS[tab] : null;

  return (
    <div className="pe">
      <div className="pe__top">
        <Link to="/problems" className="pe__back">
          ← Bài tập
        </Link>
        <span className="t-mono c-ink2">#{problem.id}</span>
        <h1 className="t-heading-m">{problem.title}</h1>
        <Badge tone={diff.tone}>{diff.label}</Badge>
        <Badge>{problem.topic}</Badge>
        <span className="pe__spacer" />
        <span className="t-mono c-ink2">Nháp đã lưu tạm · 10:42</span>
      </div>

      <div className="pe__grid">
        <Card as="article" className="pe__problem">
          <CardHead title="Đề bài" />
          <p>{problem.description}</p>
          <h2 className="t-mono c-ink2">Ràng buộc</h2>
          <ul className="pe__list">
            {problem.constraints.map((c) => (
              <li key={c} className="t-body-s">
                {c}
              </li>
            ))}
          </ul>
          <h2 className="t-mono c-ink2">Ví dụ</h2>
          {problem.examples.map((ex, i) => (
            <div key={i} className="pe__example">
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
          <div className="pe__tip">
            <p className="t-mono c-brand">Mẹo luyện phỏng vấn</p>
            <p className="t-body-s">Nói to hướng giải và độ phức tạp trước khi code — người phỏng vấn chấm cả cách bạn suy nghĩ.</p>
          </div>
        </Card>

        <div className="pe__right">
          <section className="pe__editor" aria-label="Trình soạn thảo mã">
            <div className="pe__toolbar">
              <label className="sr-only" htmlFor="pe-lang">
                Ngôn ngữ
              </label>
              <select
                id="pe-lang"
                className="pe__select"
                value={lang}
                onChange={(e) => {
                  setLang(e.target.value);
                  setCode(starters[e.target.value] ?? GENERIC_STARTER[e.target.value]);
                }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
              <div className="pe__font" role="group" aria-label="Cỡ chữ">
                <button type="button" onClick={() => setFontSize((s) => Math.max(11, s - 1))} aria-label="Giảm cỡ chữ">
                  A−
                </button>
                <span className="t-mono">{fontSize}px</span>
                <button type="button" onClick={() => setFontSize((s) => Math.min(22, s + 1))} aria-label="Tăng cỡ chữ">
                  A+
                </button>
              </div>
              <Button variant="ghost" size="sm" onDark onClick={() => setCode(starters[lang] ?? GENERIC_STARTER[lang])}>
                Đặt lại mã
              </Button>
              <span className="pe__spacer" />
              <Button variant="secondary" size="sm" onDark onClick={() => show("run")}>
                ▶ Run · test mẫu
              </Button>
              <Button variant="accent" size="sm" onClick={() => show("submit")}>
                Submit
              </Button>
            </div>
            <div className="pe__monaco">
              <Suspense fallback={<div className="empty pe__loading">Đang tải trình soạn thảo…</div>}>
                <CodeEditor language={lang} value={code} onChange={setCode} fontSize={fontSize} />
              </Suspense>
            </div>
          </section>

          <Card className="pe__results" aria-live="polite">
            {!result ? (
              <div className="pe__placeholder">
                <p className="t-heading-s">Sẵn sàng chấm bài</p>
                <p className="t-body-s c-ink2">
                  <strong>Run</strong> chạy với test mẫu (không tính điểm). <strong>Submit</strong> chấm với bộ {problem.tests} test đầy đủ.
                </p>
              </div>
            ) : (
              <>
                <div className="row between">
                  <Tabs
                    label="Kết quả chấm"
                    value={tab}
                    onChange={setTab}
                    tabs={[
                      { value: "run", label: "Run · test mẫu" },
                      { value: "submit", label: "Submit" },
                    ]}
                  />
                  <div className="row stack-sm">
                    <Badge tone={res.tone}>{res.summary}</Badge>
                    <span className="t-body-s c-ink2">48 ms · 14.2 MB</span>
                  </div>
                </div>

                <ol className="pe__steps" aria-label="Các bước chấm trong sandbox">
                  {SANDBOX_STEPS.map((s, i) => (
                    <li key={s} className="pe__step">
                      <span className="pe__step-dot" aria-hidden="true">
                        ✓
                      </span>
                      <span className="t-body-s">
                        {i + 1}. {s}
                      </span>
                    </li>
                  ))}
                </ol>

                <div className="pe__tests">
                  {res.tests.map((t) => {
                    const st = TEST_STATUS[t.status];
                    return (
                      <div key={t.name} className={`pe__test pe__test--${t.status}`}>
                        <p className="t-body-s t-strong">{t.name}</p>
                        <Badge tone={st.tone}>{st.label}</Badge>
                        <p className="t-mono c-ink2">
                          {t.status === "tle" ? "> 3 s" : `${t.timeMs} ms`} · {t.memMb} MB
                        </p>
                      </div>
                    );
                  })}
                </div>

                {tab === "submit" ? (
                  <div className="pe__coach">
                    <p className="t-heading-s">Gần được rồi — 4/5 test đã qua!</p>
                    <p className="t-body-s">
                      Test dữ liệu lớn bị TLE: lời giải đang có vòng lặp lồng O(n²). Thử lưu phần tử đã gặp vào hash map để đạt O(n).
                    </p>
                  </div>
                ) : (
                  <p className="t-body-s c-ink2">{res.note}</p>
                )}
              </>
            )}
            <div className="pe__limits">
              <span className="t-mono">Sandbox</span>
              {SANDBOX_LIMITS.map((l) => (
                <Badge key={l}>{l}</Badge>
              ))}
              <RuleTag code="BR3">Zero-trust</RuleTag>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
