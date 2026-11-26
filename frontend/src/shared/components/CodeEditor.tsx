// Trình soạn thảo Monaco (F08 / UC08): tô màu cú pháp, đánh số dòng, tự thụt lề, chỉnh cỡ chữ.
// Nạp Monaco cục bộ (không qua CDN) với 2 theme Studio: Light (kiểu LeetCode sạch) và Dark (Obsidian).
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

// Neutral Obsidian Studio Dark Theme (#111418 / #171B21) — tuyệt đối không sắc tím
monaco.editor.defineTheme("devordead-dark", {
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

// Crisp Studio Light Theme (giống LeetCode Light IDE — nền trắng tinh, chữ mực #111418, không tím)
monaco.editor.defineTheme("devordead-light", {
  base: "vs",
  inherit: true,
  rules: [
    { token: "keyword", foreground: "0F5F8F", fontStyle: "bold" },
    { token: "keyword.control", foreground: "0F5F8F", fontStyle: "bold" },
    { token: "keyword.flow", foreground: "0F5F8F", fontStyle: "bold" },
    { token: "string", foreground: "16794C" },
    { token: "number", foreground: "B4690E" },
    { token: "comment", foreground: "8A909E", fontStyle: "italic" },
    { token: "type", foreground: "1B6B94" },
    { token: "type.identifier", foreground: "1B6B94" },
    { token: "identifier", foreground: "111418" },
    { token: "delimiter", foreground: "525866" },
    { token: "operator", foreground: "334155" },
  ],
  colors: {
    "editor.background": "#FFFFFF",
    "editor.foreground": "#111418",
    "editorLineNumber.foreground": "#9AA1AE",
    "editorLineNumber.activeForeground": "#111418",
    "editor.lineHighlightBackground": "#F6F7F9",
    "editor.selectionBackground": "#DCEEF8",
    "editorCursor.foreground": "#111418",
    "editorIndentGuide.background1": "#ECEEF2",
    "editorIndentGuide.activeBackground1": "#D0D5DD",
  },
});

export interface CodeEditorProps {
  language?: ProgrammingLanguage;
  value: string;
  onChange?: (value: string) => void;
  fontSize?: number;
  readOnly?: boolean;
  height?: string | number;
  themeMode?: "light" | "dark";
}

export default function CodeEditor({
  language = "python",
  value,
  onChange,
  fontSize = 13.5,
  readOnly = false,
  height = "100%",
  themeMode = "light",
}: CodeEditorProps) {
  const isDark = themeMode === "dark";
  return (
    <Editor
      height={height}
      language={language === "cpp" ? "cpp" : language}
      theme={isDark ? "devordead-dark" : "devordead-light"}
      value={value}
      onChange={(v) => onChange?.(v ?? "")}
      loading={
        <div
          className="empty"
          style={{
            color: isDark ? "var(--code-ink)" : "var(--ink-2)",
            background: isDark ? "var(--code-bg)" : "var(--surface)",
            height: "100%",
          }}
        >
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
        padding: { top: 12, bottom: 12 },
        renderLineHighlight: "line",
        smoothScrolling: true,
        automaticLayout: true,
        ariaLabel: "Trình soạn thảo mã",
      }}
    />
  );
}
