// Trình soạn thảo Monaco (F08 / UC08): tô màu cú pháp, đánh số dòng, tự thụt lề, chỉnh cỡ chữ.
// Nạp Monaco cục bộ (không qua CDN) với 2 theme Studio: Light (kiểu LeetCode sạch) và Dark (Obsidian).
import { useEffect, useRef, useState } from "react";
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

/**
 * Lớp bảo vệ cho Chế độ thi: chỉ cho dán nội dung đã được copy ngay trong trang,
 * chặn kéo-thả văn bản từ ngoài và báo các lần chèn khối mã lớn bất thường.
 */
export interface EditorPasteGuard {
  isAllowedPaste: (text: string) => boolean;
  onInternalCopy: (text: string) => void;
  onBlocked: (kind: "paste" | "drop", chars: number) => void;
  onLargeInsert: (chars: number) => void;
}

/** Một lần chèn có từ ngần này ký tự (không tính khoảng trắng) trở lên mà không qua dán nội bộ bị coi là bất thường. */
const LARGE_INSERT_MIN_CHARS = 50;
/**
 * Gõ nhanh bất thường: từ BURST_MIN_CHARS ký tự trở lên trong BURST_WINDOW_MS (≈40 ký tự/giây, gấp vài lần người gõ nhanh).
 * Bắt được công cụ tự gõ phím (autotype) — loại này gõ từng ký tự nên không bao giờ tạo ra một lần chèn lớn.
 */
const BURST_WINDOW_MS = 3000;
const BURST_MIN_CHARS = 120;

function countNonWhitespace(text: string): number {
  return text.replace(/\s/g, "").length;
}

export interface CodeEditorProps {
  language?: ProgrammingLanguage;
  value: string;
  onChange?: (value: string) => void;
  fontSize?: number;
  readOnly?: boolean;
  height?: string | number;
  themeMode?: "light" | "dark";
  pasteGuard?: EditorPasteGuard;
}

export default function CodeEditor({
  language = "python",
  value,
  onChange,
  fontSize = 13.5,
  readOnly = false,
  height = "100%",
  themeMode = "light",
  pasteGuard,
}: CodeEditorProps) {
  const isDark = themeMode === "dark";
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Giá trị gần nhất do component cha truyền vào. Khi model đổi mà khớp giá trị này thì đó là
  // cập nhật từ props (đặt lại mã, đổi ngôn ngữ…), không phải do người dùng gõ hay dán.
  const valueRef = useRef(value);
  valueRef.current = value;
  const guardRef = useRef(pasteGuard);
  guardRef.current = pasteGuard;
  const guarded = Boolean(pasteGuard);

  useEffect(() => {
    if (!editor || !guarded) return undefined;
    const container = editor.getContainerDomNode();
    // Bật trong lúc Monaco xử lý một lần dán đã được duyệt (đồng bộ trong sự kiện paste), tắt ngay sau đó.
    let approvedPaste = false;
    let approvedTimer: number | null = null;
    let pendingLargeInsert: number | null = null;
    let pendingTimer: number | null = null;
    let burst: { t: number; n: number }[] = [];

    const onPaste = (e: ClipboardEvent) => {
      const guard = guardRef.current;
      if (!guard) return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (text && guard.isAllowedPaste(text)) {
        approvedPaste = true;
        if (approvedTimer !== null) window.clearTimeout(approvedTimer);
        approvedTimer = window.setTimeout(() => {
          approvedPaste = false;
          approvedTimer = null;
        }, 0);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      guard.onBlocked("paste", text.length);
    };

    const onDrop = (e: DragEvent) => {
      const text = e.dataTransfer?.getData("text/plain") ?? "";
      e.preventDefault();
      e.stopPropagation();
      guardRef.current?.onBlocked("drop", text.length);
    };

    // Chạy ở pha bubble, sau khi Monaco đã ghi vùng chọn vào clipboardData.
    const onCopy = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (text) guardRef.current?.onInternalCopy(text);
    };

    container.addEventListener("paste", onPaste, true);
    container.addEventListener("drop", onDrop, true);
    container.addEventListener("copy", onCopy);
    container.addEventListener("cut", onCopy);

    const contentSub = editor.onDidChangeModelContent((e) => {
      // Không bỏ qua isFlush: setValue() từ DevTools / tiện ích cũng là đưa mã từ ngoài vào.
      // Cập nhật hợp lệ từ props (kể cả setValue khi readOnly) đã được loại nhờ so với valueRef.
      if (e.isUndoing || e.isRedoing) return;
      const model = editor.getModel();
      if (!model || model.getValue() === valueRef.current) return;
      if (approvedPaste) return;
      const inserted = e.changes.reduce((sum, c) => sum + countNonWhitespace(c.text), 0);
      if (inserted === 0) return;

      if (inserted < LARGE_INSERT_MIN_CHARS) {
        const now = Date.now();
        burst = burst.filter((b) => now - b.t <= BURST_WINDOW_MS);
        burst.push({ t: now, n: inserted });
        const total = burst.reduce((sum, b) => sum + b.n, 0);
        if (total >= BURST_MIN_CHARS) {
          burst = [];
          guardRef.current?.onLargeInsert(total);
        }
        return;
      }
      // Hoãn một nhịp: nếu đây là lần dán lọt qua đường khác thì onDidPaste bên dưới xử lý thay.
      pendingLargeInsert = inserted;
      if (pendingTimer !== null) window.clearTimeout(pendingTimer);
      pendingTimer = window.setTimeout(() => {
        if (pendingLargeInsert !== null) guardRef.current?.onLargeInsert(pendingLargeInsert);
        pendingLargeInsert = null;
        pendingTimer = null;
      }, 0);
    });

    // Chốt chặn cuối: lệnh dán không đi qua sự kiện DOM (ví dụ qua Clipboard API) thì hoàn tác lại.
    const pasteSub = editor.onDidPaste((e) => {
      if (approvedPaste) return;
      pendingLargeInsert = null;
      const model = editor.getModel();
      const chars = model ? model.getValueInRange(e.range).length : 0;
      editor.trigger("exam-guard", "undo", null);
      guardRef.current?.onBlocked("paste", chars);
    });

    // Tắt bảng lệnh F1 vì có thể gọi lệnh Paste qua Clipboard API.
    const blockPalette = editor.addAction({
      id: "devordead.examGuard.blockCommandPalette",
      label: "Bảng lệnh bị tắt trong Chế độ thi",
      keybindings: [monaco.KeyCode.F1],
      run: () => undefined,
    });

    return () => {
      container.removeEventListener("paste", onPaste, true);
      container.removeEventListener("drop", onDrop, true);
      container.removeEventListener("copy", onCopy);
      container.removeEventListener("cut", onCopy);
      contentSub.dispose();
      pasteSub.dispose();
      blockPalette.dispose();
      if (pendingTimer !== null) window.clearTimeout(pendingTimer);
      if (approvedTimer !== null) window.clearTimeout(approvedTimer);
    };
  }, [editor, guarded]);

  return (
    <Editor
      onMount={(instance) => setEditor(instance)}
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
        // Chế độ thi: menu chuột phải có lệnh Paste đọc thẳng clipboard nên phải tắt
        contextmenu: !guarded,
        dropIntoEditor: { enabled: !guarded },
      }}
    />
  );
}
