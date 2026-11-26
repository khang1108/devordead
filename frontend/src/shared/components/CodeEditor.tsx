// Trình soạn thảo Monaco (F08 / UC08): tô màu cú pháp, đánh số dòng, tự thụt lề, chỉnh cỡ chữ.
// Nạp Monaco cục bộ (không qua CDN) và chỉ 4 ngôn ngữ cần dùng.
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.api";
import "monaco-editor/languages/definitions/python/register";
import "monaco-editor/languages/definitions/javascript/register";
import "monaco-editor/languages/definitions/cpp/register";
import "monaco-editor/languages/definitions/java/register";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import type { ProgrammingLanguage } from "@shared/types";

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });

// Neutral Obsidian Studio Theme (#111418 / #171B21) — đồng bộ --code-bg, tuyệt đối không sắc tím
monaco.editor.defineTheme("devordead", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "keyword", foreground: "7CC4E8", fontStyle: "bold" },
    { token: "keyword.control", foreground: "7CC4E8", fontStyle: "bold" },
    { token: "keyword.flow", foreground: "7CC4E8", fontStyle: "bold" },
    { token: "string", foreground: "86CFA6" },
    { token: "number", foreground: "E5B567" },
    { token: "comment", foreground: "6E7785", fontStyle: "italic" },
    { token: "type", foreground: "9DC6E0" },
    { token: "type.identifier", foreground: "9DC6E0" },
    { token: "identifier", foreground: "E5E9F0" },
    { token: "delimiter", foreground: "9AA2B1" },
    { token: "operator", foreground: "B8C2CC" },
  ],
  colors: {
    "editor.background": "#111418",
    "editor.foreground": "#E5E9F0",
    "editorLineNumber.foreground": "#5C6470",
    "editorLineNumber.activeForeground": "#E5E9F0",
    "editor.lineHighlightBackground": "#171B21",
    "editor.selectionBackground": "#253342",
    "editorCursor.foreground": "#2484B5",
    "editorIndentGuide.background1": "#1E232B",
    "editorIndentGuide.activeBackground1": "#2E3744",
  },
});

export interface CodeEditorProps {
  language?: ProgrammingLanguage;
  value: string;
  onChange?: (value: string) => void;
  fontSize?: number;
  readOnly?: boolean;
  height?: string | number;
}

export default function CodeEditor({
  language = "python",
  value,
  onChange,
  fontSize = 13.5,
  readOnly = false,
  height = "100%",
}: CodeEditorProps) {
  return (
    <Editor
      height={height}
      language={language === "cpp" ? "cpp" : language}
      theme="devordead"
      value={value}
      onChange={(v) => onChange?.(v ?? "")}
      loading={
        <div className="empty" style={{ color: "var(--code-ink)", height: "100%" }}>
          Đang tải trình soạn thảo...
        </div>
      }
      options={{
        fontSize,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        bracketPairColorization: { enabled: false },
        lineNumbers: "on",
        autoIndent: "full",
        tabSize: 4,
        scrollBeyondLastLine: false,
        readOnly,
        padding: { top: 14, bottom: 14 },
        renderLineHighlight: "line",
        smoothScrolling: true,
        automaticLayout: true,
        ariaLabel: "Trình soạn thảo mã",
      }}
    />
  );
}
