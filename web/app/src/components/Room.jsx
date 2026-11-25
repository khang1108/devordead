import { useEffect, useRef } from "react";
import Logo from "./Logo.jsx";
import { Badge, Button } from "./ui.jsx";
import "./room.css";

/** Hộp xác nhận dùng <dialog> gốc: có focus trap, Esc để đóng. */
export function ConfirmDialog({ open, title, children, confirmLabel = "Xác nhận", confirmVariant = "accent", onConfirm, onCancel }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="room-dialog" onCancel={(e) => (e.preventDefault(), onCancel?.())} aria-labelledby="room-dialog-title">
      <h2 id="room-dialog-title" className="t-heading-m">
        {title}
      </h2>
      <div className="t-body-m c-ink2">{children}</div>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={onCancel}>
          Hủy
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}

/**
 * Thanh trên của phòng phỏng vấn: logo, loại phiên, đồng hồ hard-stop (BR1), kết thúc sớm.
 * Chỉ UI: thời gian truyền vào dạng chữ ("11:36"); tone: normal | warn | danger.
 */
export function RoomTopBar({ badge, title, remaining, total, tone = "normal", onEnd }) {
  return (
    <header className="room-bar">
      <Logo to="/dashboard" />
      <Badge tone="brand">{badge}</Badge>
      <p className="t-heading-s room-bar__title">{title}</p>
      <div className="room-bar__spacer" />
      <div className={`room-timer ${tone === "danger" ? "is-danger" : tone === "warn" ? "is-warn" : ""}`} role="timer" aria-label={`Còn lại ${remaining} trên ${total}`}>
        <span className="t-mono">Còn lại</span>
        <span className="room-timer__value">{remaining}</span>
        <span className="t-mono">/ {total}</span>
      </div>
      <span className="room-bar__rule t-mono">BR1 · Hard-stop</span>
      <Button variant="danger" onClick={onEnd}>
        Kết thúc phiên
      </Button>
    </header>
  );
}

/** Quả cầu AI: nhịp sáng khi AI đang nói. */
export function AiAvatar({ speaking }) {
  return (
    <div className={`ai-avatar ${speaking ? "is-speaking" : ""}`} aria-hidden="true">
      <span className="ai-avatar__ring" />
      <span className="ai-avatar__ring ai-avatar__ring--2" />
      <span className="ai-avatar__core">
        <i />
        <i />
      </span>
    </div>
  );
}

/** Danh sách lượt hội thoại. */
export function TranscriptList({ turns, interim, youLabel = "Bạn", aiLabel = "AI" }) {
  const listRef = useRef(null);
  // Chỉ cuộn khung transcript (scrollIntoView sẽ cuộn cả trang).
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns.length, interim]);
  return (
    <ol className="room-transcript" aria-live="polite" ref={listRef}>
      {turns.map((t, i) => (
        <li key={i} className={`room-turn room-turn--${t.who}`}>
          <span className="t-mono">{t.who === "ai" ? aiLabel : t.who === "hint" ? "Gợi ý" : youLabel}</span>
          <p className="t-body-s">{t.text}</p>
        </li>
      ))}
      {interim && (
        <li className="room-turn room-turn--you is-interim">
          <span className="t-mono">{youLabel} · đang nói</span>
          <p className="t-body-s">{interim}</p>
        </li>
      )}
    </ol>
  );
}
