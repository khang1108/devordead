// Trình soạn thảo Monaco (proposal 2.5): tô màu cú pháp, đánh số dòng, tự thụt lề, chỉnh cỡ chữ.
// Nạp Monaco cục bộ (không qua CDN) và chỉ 4 ngôn ngữ cần dùng để giảm dung lượng.
import Editor, { loader } from "@monaco-editor/react";
// monaco-editor 0.58: export map "monaco-editor/<x>" → esm/vs/<x>.js
import * as monaco from "monaco-editor/editor/editor.api";
import "monaco-editor/languages/definitions/python/register";
import "monaco-editor/languages/definitions/javascript/register";
import "monaco-editor/languages/definitions/cpp/register";
import "monaco-editor/languages/definitions/java/register";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });

monaco.editor.defineTheme("devordead", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "keyword", foreground: "5DB8E4", fontStyle: "bold" },
    { token: "string", foreground: "9EDBB4" },
    { token: "number", foreground: "F7C873" },
    { token: "comment", foreground: "6F8C9E", fontStyle: "italic" },
    { token: "type", foreground: "F2A4A0" },
  ],
  colors: {
    "editor.background": "#0B2233",
    "editor.foreground": "#D6E6F2",
    "editorLineNumber.foreground": "#5E7A8C",
    "editorLineNumber.activeForeground": "#D6E6F2",
    "editor.lineHighlightBackground": "#12324A",
    "editor.selectionBackground": "#1F5A80",
    "editorCursor.foreground": "#329DD2",
    "editorIndentGuide.background1": "#173B53",
  },
});

export default function CodeEditor({ language = "python", value, onChange, fontSize = 14, readOnly = false, height = "100%" }) {
  return (
    <Editor
      height={height}
      language={language === "cpp" ? "cpp" : language}
      theme="devordead"
      value={value}
      onChange={(v) => onChange?.(v ?? "")}
      loading={<div className="empty" style={{ color: "var(--code-ink)" }}>Đang tải trình soạn thảo…</div>}
      options={{
        fontSize,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        lineNumbers: "on",
        autoIndent: "full",
        tabSize: 4,
        scrollBeyondLastLine: false,
        readOnly,
        padding: { top: 16, bottom: 16 },
        renderLineHighlight: "line",
        smoothScrolling: true,
        automaticLayout: true,
        ariaLabel: "Trình soạn thảo mã",
      }}
    />
  );
}
