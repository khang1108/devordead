import { useMemo, useState } from "react";
import { localStore } from "@shared/services/localStore";
import "./StudyCalendar.css";

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;

function toIsoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function computeStreak(dates: readonly string[], todayIso: string): number {
  if (dates.length === 0) return 0;
  const set = new Set(dates);
  const cursor = new Date(`${todayIso}T00:00:00`);
  let streak = 0;
  while (true) {
    const iso = toIsoDate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    if (!set.has(iso)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface StudyCalendarProps {
  className?: string;
}

/**
 * Lịch luyện tập hàng ngày (LeetCode-style right rail widget).
 * Dùng ngày thực của hệ thống + lưu dấu ngày đã học trên trình duyệt (localStore).
 */
export default function StudyCalendar({ className = "" }: StudyCalendarProps) {
  const now = useMemo(() => new Date(), []);
  const todayIso = toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [practiceDates, setPracticeDates] = useState<string[]>(() => localStore.getPracticeDates());

  const dateSet = useMemo(() => new Set(practiceDates), [practiceDates]);
  const checkedToday = dateSet.has(todayIso);
  const streak = useMemo(() => computeStreak(practiceDates, todayIso), [practiceDates, todayIso]);

  const monthCells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: Array<{ day: number | null; iso?: string }> = [];
    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ day: null });
    }
    for (let day = 1; day <= totalDays; day++) {
      cells.push({ day, iso: toIsoDate(viewYear, viewMonth, day) });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleCheckIn = () => {
    const next = localStore.recordTodayPractice();
    setPracticeDates(next);
  };

  return (
    <section className={`lc-cal ${className}`.trim()} aria-label="Lịch luyện tập tháng">
      <div className="lc-cal__head">
        <div>
          <p className="lc-cal__month">
            Tháng {viewMonth + 1}/{viewYear}
          </p>
          <p className="lc-cal__sub">
            Ngày {now.getDate()} · Chuỗi {streak} ngày
          </p>
        </div>
        <div className="lc-cal__nav">
          <button type="button" className="lc-cal__nav-btn" onClick={handlePrevMonth} aria-label="Tháng trước">
            ‹
          </button>
          <button type="button" className="lc-cal__nav-btn" onClick={handleNextMonth} aria-label="Tháng sau">
            ›
          </button>
        </div>
      </div>

      <div className="lc-cal__grid lc-cal__weekdays" aria-hidden="true">
        {WEEKDAYS.map((d) => (
          <span key={d} className="lc-cal__wd">
            {d}
          </span>
        ))}
      </div>

      <div className="lc-cal__grid" role="grid" aria-label={`Lịch tháng ${viewMonth + 1} năm ${viewYear}`}>
        {monthCells.map((cell, idx) => {
          if (cell.day === null || !cell.iso) {
            return <span key={`empty-${idx}`} className="lc-cal__cell is-empty" aria-hidden="true" />;
          }
          const isToday = cell.iso === todayIso;
          const isDone = dateSet.has(cell.iso);
          return (
            <span
              key={cell.iso}
              role="gridcell"
              aria-current={isToday ? "date" : undefined}
              className={`lc-cal__cell ${isToday ? "is-today" : ""} ${isDone ? "is-done" : ""}`.trim()}
            >
              {cell.day}
            </span>
          );
        })}
      </div>

      <div className="lc-cal__foot">
        <span className="lc-cal__foot-note">
          {checkedToday ? "Đã điểm danh hôm nay" : "Ghi nhận buổi luyện hôm nay"}
        </span>
        <button
          type="button"
          className={`lc-cal__checkin ${checkedToday ? "is-done" : ""}`.trim()}
          onClick={handleCheckIn}
          disabled={checkedToday}
        >
          {checkedToday ? "Đã ghi nhận" : "Điểm danh"}
        </button>
      </div>
    </section>
  );
}
