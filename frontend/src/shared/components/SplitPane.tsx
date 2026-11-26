import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { localStore } from "@shared/services/localStore";
import "./SplitPane.css";

export interface SplitPaneProps {
  direction?: "horizontal" | "vertical";
  initialRatio?: number;
  minRatio?: number;
  maxRatio?: number;
  storageKey?: string;
  first: ReactNode;
  second: ReactNode;
  className?: string;
  label?: string;
}

/**
 * LeetCode-style draggable tiled split pane.
 * Hỗ trợ kéo chuột/cảm ứng, bàn phím (mũi tên), nhấp đúp để khôi phục tỷ lệ, và tự xếp chồng trên màn hình nhỏ.
 */
export default function SplitPane({
  direction = "horizontal",
  initialRatio = 0.48,
  minRatio = 0.24,
  maxRatio = 0.76,
  storageKey,
  first,
  second,
  className = "",
  label = "Điều chỉnh kích thước khung",
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ratio, setRatio] = useState<number>(() => {
    const saved = storageKey ? localStore.getSplitRatio(storageKey, initialRatio) : initialRatio;
    return Math.min(maxRatio, Math.max(minRatio, saved));
  });
  const [dragging, setDragging] = useState(false);

  const commitRatio = useCallback(
    (next: number) => {
      const clamped = Math.min(maxRatio, Math.max(minRatio, Number(next.toFixed(4))));
      setRatio(clamped);
      if (storageKey) {
        localStore.setSplitRatio(storageKey, clamped);
      }
    },
    [maxRatio, minRatio, storageKey],
  );

  useEffect(() => {
    if (!dragging) return undefined;

    const handleMove = (event: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (direction === "horizontal") {
        if (rect.width <= 0) return;
        commitRatio((event.clientX - rect.left) / rect.width);
      } else {
        if (rect.height <= 0) return;
        commitRatio((event.clientY - rect.top) / rect.height);
      }
    };

    const handleUp = () => {
      setDragging(false);
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [dragging, direction, commitRatio]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.08 : 0.03;
    if (direction === "horizontal") {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        commitRatio(ratio - step);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        commitRatio(ratio + step);
      }
    } else {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        commitRatio(ratio - step);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        commitRatio(ratio + step);
      }
    }
    if (event.key === "Home") {
      event.preventDefault();
      commitRatio(initialRatio);
    }
  };

  const pct = `${(ratio * 100).toFixed(2)}%`;

  return (
    <div
      ref={containerRef}
      className={`lc-split lc-split--${direction} ${dragging ? "is-dragging" : ""} ${className}`.trim()}
    >
      <div className="lc-split__first" style={{ flexBasis: pct }}>
        {first}
      </div>

      <div
        role="separator"
        tabIndex={0}
        aria-orientation={direction === "horizontal" ? "vertical" : "horizontal"}
        aria-label={label}
        aria-valuemin={Math.round(minRatio * 100)}
        aria-valuemax={Math.round(maxRatio * 100)}
        aria-valuenow={Math.round(ratio * 100)}
        title="Kéo để thay đổi kích thước · Nhấp đúp để đặt lại"
        className="lc-split__gutter"
        onPointerDown={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDoubleClick={() => commitRatio(initialRatio)}
        onKeyDown={handleKeyDown}
      >
        <span className="lc-split__pill" aria-hidden="true" />
      </div>

      <div className="lc-split__second">{second}</div>
    </div>
  );
}
