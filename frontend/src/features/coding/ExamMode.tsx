import { useEffect, useRef, useState, type ReactNode } from "react";
import type {
  CodingProblem,
  Difficulty,
  ExamEventType,
  ExamIntegrityLevel,
  ExamSession,
  SandboxExecutionResult,
} from "@shared/types";
import { Badge, Button, Segmented } from "@shared/ui";
import { formatAwayDuration, formatCountdown, isFullscreenSupported } from "./useExamMode";
import "./ExamMode.css";

export const EXAM_DURATIONS = [15, 30, 45, 60] as const;

export const DEFAULT_EXAM_MINUTES: Record<Difficulty, number> = {
  easy: 15,
  medium: 30,
  hard: 45,
};

export const EXAM_EVENT_LABELS: Record<ExamEventType, string> = {
  fullscreen_exit: "Thoát toàn màn hình",
  tab_hidden: "Chuyển tab / thu nhỏ cửa sổ",
  window_blur: "Chuyển sang cửa sổ khác",
  paste_blocked: "Dán nội dung từ bên ngoài (đã chặn)",
  drop_blocked: "Kéo-thả văn bản từ bên ngoài (đã chặn)",
  large_insert: "Chèn / gõ khối mã lớn bất thường",
  resumed: "Tải lại trang giữa giờ thi",
};

const LEVEL_META: Record<ExamIntegrityLevel, { label: string; tone: "success" | "warning" | "danger"; hint: string }> = {
  clean: {
    label: "Không phát hiện bất thường",
    tone: "success",
    hint: "Bạn giữ nguyên trang thi trong suốt thời gian làm bài.",
  },
  warning: {
    label: "Cần lưu ý",
    tone: "warning",
    hint: "Có vài lần rời trang hoặc thao tác bị chặn. Kết quả vẫn được ghi nhận kèm cảnh báo.",
  },
  suspicious: {
    label: "Nghi vấn gian lận",
    tone: "danger",
    hint: "Nhiều dấu hiệu rời trang hoặc đưa mã từ ngoài vào. Bài nộp được đánh dấu để xem xét lại.",
  },
};

const EXAM_RULES: readonly string[] = [
  "Bài thi chạy toàn màn hình. Thoát ra (Esc) sẽ khóa trình soạn thảo cho tới khi bạn quay lại, và bị ghi nhận.",
  "Mỗi lần chuyển tab, thu nhỏ cửa sổ hoặc chuyển sang ứng dụng khác đều được ghi lại kèm thời lượng.",
  "Chỉ được dán đoạn đã copy ngay trong trang thi. Dán hoặc kéo-thả mã từ bên ngoài sẽ bị chặn và ghi nhận.",
  "Bài thi bắt đầu từ mã khởi tạo — bản nháp luyện tập trước đó không được dùng.",
  "Được chạy thử (Run) nhiều lần nhưng chỉ nộp (Submit) một lần. Hết giờ hệ thống tự nộp.",
];

// ——— Hộp thoại dùng chung (native <dialog>, hiển thị được cả khi đang toàn màn hình) ———

interface ExamDialogProps {
  open: boolean;
  labelledBy: string;
  onDismiss?: () => void;
  wide?: boolean;
  children: ReactNode;
}

function ExamDialog({ open, labelledBy, onDismiss, wide, children }: ExamDialogProps) {
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
      className={`pe-dialog exam-dialog ${wide ? "exam-dialog--wide" : ""}`.trim()}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault();
        onDismiss?.();
      }}
    >
      {children}
    </dialog>
  );
}

// ——— Bắt đầu thi ———

interface ExamStartDialogProps {
  open: boolean;
  problem: CodingProblem | null;
  starting: boolean;
  error: string | null;
  onStart: (minutes: number) => void;
  onCancel: () => void;
}

export function ExamStartDialog({ open, problem, starting, error, onStart, onCancel }: ExamStartDialogProps) {
  const [minutes, setMinutes] = useState<number>(30);
  const supported = isFullscreenSupported();

  useEffect(() => {
    if (open && problem) setMinutes(DEFAULT_EXAM_MINUTES[problem.difficulty]);
  }, [open, problem]);

  return (
    <ExamDialog open={open} labelledBy="exam-start-title" onDismiss={starting ? undefined : onCancel} wide>
      <div className="pe-dialog__head">
        <p className="exam-eyebrow">Chế độ thi</p>
        <h2 id="exam-start-title" className="t-heading-m">
          {problem ? `#${problem.id} · ${problem.title}` : "Bắt đầu bài thi"}
        </h2>
      </div>

      <ul className="exam-rules">
        {EXAM_RULES.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>

      <div className="exam-field">
        <span className="exam-field__label" id="exam-duration-label">
          Thời gian làm bài
        </span>
        <Segmented
          label="Thời gian làm bài"
          options={EXAM_DURATIONS.map((m) => ({ value: m, label: `${m} phút` }))}
          value={minutes}
          onChange={setMinutes}
        />
      </div>

      <p className="exam-consent">
        Bấm <strong>Bắt đầu</strong> nghĩa là bạn đồng ý để DevOrDead ghi lại các sự kiện trên trong suốt bài thi. Hệ thống
        không ghi màn hình, camera hay nội dung clipboard — chỉ ghi loại sự kiện, thời điểm và thời lượng.
      </p>

      {!supported && (
        <div className="pe-alert" role="alert">
          Trình duyệt này không hỗ trợ toàn màn hình (thường gặp trên iPhone). Hãy làm bài thi trên máy tính.
        </div>
      )}
      {error && (
        <div className="pe-alert" role="alert">
          {error}
        </div>
      )}

      <div className="row pe-dialog__actions">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={starting}>
          Để sau
        </Button>
        <Button variant="primary" size="sm" onClick={() => onStart(minutes)} disabled={starting || !supported || !problem}>
          {starting ? "Đang chuẩn bị…" : "Bắt đầu toàn màn hình"}
        </Button>
      </div>
    </ExamDialog>
  );
}

// ——— Lớp khóa khi thoát toàn màn hình / khi tiếp tục sau tải lại trang ———

interface ExamLockOverlayProps {
  mode: "fullscreen" | "resume" | "starting";
  violations: number;
  remainingSec: number | null;
  error: string | null;
  onContinue: () => void;
  onAbandon: () => void;
}

export function ExamLockOverlay({ mode, violations, remainingSec, error, onContinue, onAbandon }: ExamLockOverlayProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // Rút focus khỏi trình soạn thảo để không gõ được phía sau lớp khóa.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    buttonRef.current?.focus();
  }, [mode]);

  if (mode === "starting") {
    return (
      <div className="exam-lock" role="status" aria-live="polite">
        <div className="exam-lock__card">
          <p className="exam-eyebrow">Chế độ thi</p>
          <h2 className="t-heading-m">Đang chuẩn bị phòng thi…</h2>
        </div>
      </div>
    );
  }

  const isResume = mode === "resume";
  return (
    <div className="exam-lock" role="alertdialog" aria-modal="true" aria-labelledby="exam-lock-title">
      <div className="exam-lock__card">
        <p className="exam-eyebrow">{isResume ? "Bài thi đang dở" : "Trình soạn thảo đã bị khóa"}</p>
        <h2 id="exam-lock-title" className="t-heading-m">
          {isResume ? "Bạn vừa tải lại trang trong lúc thi" : "Bạn đã thoát chế độ toàn màn hình"}
        </h2>
        <p className="t-body-s c-ink2">
          {isResume
            ? "Đồng hồ vẫn chạy trên máy chủ. Lần tải lại này sẽ được ghi nhận khi bạn tiếp tục."
            : "Lần thoát này đã được ghi nhận. Quay lại toàn màn hình để làm tiếp — đồng hồ vẫn đang chạy."}
        </p>
        <div className="exam-lock__stats pe-tabular">
          {remainingSec !== null && <span>Còn lại {formatCountdown(remainingSec)}</span>}
          {!isResume && <span>{violations} lần ghi nhận</span>}
        </div>
        {error && (
          <div className="pe-alert" role="alert">
            {error}
          </div>
        )}
        <div className="row exam-lock__actions">
          <Button variant="secondary" size="sm" onClick={onAbandon}>
            Bỏ bài thi
          </Button>
          <button ref={buttonRef} type="button" className="btn btn--primary btn--sm" onClick={onContinue}>
            {isResume ? "Tiếp tục bài thi" : "Quay lại toàn màn hình"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ——— Thanh trạng thái trên top bar ———

interface ExamHudProps {
  remainingSec: number | null;
  violations: number;
  onAbandon: () => void;
}

export function ExamHud({ remainingSec, violations, onAbandon }: ExamHudProps) {
  const urgent = remainingSec !== null && remainingSec <= 300;
  return (
    <div className="exam-hud" role="group" aria-label="Trạng thái bài thi">
      <span className="exam-hud__live">
        <span className="exam-hud__dot" aria-hidden="true" />
        Đang thi
      </span>
      <span
        className={`exam-hud__timer pe-tabular ${urgent ? "is-urgent" : ""}`.trim()}
        role="timer"
        aria-label={remainingSec !== null ? `Còn lại ${formatCountdown(remainingSec)}` : "Đang đồng bộ thời gian"}
      >
        {remainingSec !== null ? formatCountdown(remainingSec) : "--:--"}
      </span>
      <span
        className={`exam-hud__flags pe-tabular ${violations > 0 ? "has-flags" : ""}`.trim()}
        title="Số lần rời trang, thoát toàn màn hình hoặc thao tác bị chặn"
      >
        {violations} ghi nhận
      </span>
      <button type="button" className="exam-hud__quit" onClick={onAbandon}>
        Bỏ thi
      </button>
    </div>
  );
}

// ——— Thông báo nhanh ———

export function ExamNotice({ message }: { message: string | null }) {
  return (
    <div className="exam-notice-slot" aria-live="assertive">
      {message && <div className="exam-notice">{message}</div>}
    </div>
  );
}

// ——— Báo cáo sau khi nộp / hết giờ ———

interface ExamResultDialogProps {
  open: boolean;
  session: ExamSession | null;
  result: SandboxExecutionResult | null;
  onClose: () => void;
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export function ExamResultDialog({ open, session, result, onClose }: ExamResultDialogProps) {
  if (!session) return null;
  const integrity = session.integrity;
  const level = LEVEL_META[integrity.level];
  const usedSec = session.endedAt
    ? Math.max(0, Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000))
    : session.durationSec;
  const entries = (Object.keys(EXAM_EVENT_LABELS) as ExamEventType[])
    .map((type) => ({ type, count: integrity.counts[type] ?? 0 }))
    .filter((e) => e.count > 0);
  const passed = result ? result.tests.filter((t) => t.status === "passed").length : 0;

  return (
    <ExamDialog open={open} labelledBy="exam-result-title" onDismiss={onClose} wide>
      <div className="pe-dialog__head">
        <p className="exam-eyebrow">Kết quả bài thi</p>
        <h2 id="exam-result-title" className="t-heading-m">
          {session.status === "expired"
            ? "Hết giờ — phiên thi đã đóng"
            : result
              ? result.summary
              : "Bài thi đã kết thúc"}
        </h2>
      </div>

      <dl className="exam-summary pe-tabular">
        <div>
          <dt>Kết quả chấm</dt>
          <dd>{result ? `${passed}/${result.tests.length} test` : "Không có bài nộp"}</dd>
        </div>
        <div>
          <dt>Thời gian làm</dt>
          <dd>{formatCountdown(Math.min(usedSec, session.durationSec))}</dd>
        </div>
        <div>
          <dt>Rời trang</dt>
          <dd>{integrity.awayMs > 0 ? formatAwayDuration(integrity.awayMs) : "0 giây"}</dd>
        </div>
      </dl>

      <div className={`exam-integrity exam-integrity--${integrity.level}`}>
        <div className="exam-integrity__head">
          <Badge tone={level.tone}>{level.label}</Badge>
          <span className="exam-integrity__score pe-tabular">Điểm nghi vấn {integrity.score}</span>
        </div>
        <p className="t-body-s c-ink2">{level.hint}</p>
        {entries.length > 0 && (
          <ul className="exam-integrity__list">
            {entries.map((e) => (
              <li key={e.type}>
                <span>{EXAM_EVENT_LABELS[e.type]}</span>
                <span className="pe-tabular">×{e.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {integrity.events.length > 0 && (
        <details className="exam-timeline">
          <summary>Dòng thời gian ({integrity.events.length} sự kiện)</summary>
          <ol>
            {integrity.events.map((e, idx) => (
              <li key={`${e.at}-${idx}`} className="pe-tabular">
                <span>{formatClock(e.at)}</span>
                <span>{EXAM_EVENT_LABELS[e.type]}</span>
                <span>
                  {e.durationMs > 0 ? formatAwayDuration(e.durationMs) : e.chars > 0 ? `${e.chars} ký tự` : ""}
                </span>
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="row pe-dialog__actions">
        <Button variant="primary" size="sm" onClick={onClose}>
          Về chế độ luyện tập
        </Button>
      </div>
    </ExamDialog>
  );
}
