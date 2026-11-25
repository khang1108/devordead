import { Link } from "react-router-dom";

/** Biểu tượng ||) — chữ D ghép từ toán tử OR và dấu ngoặc. */
export function LogoMark({ size = 26, onDark = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="logo__mark">
      <rect width="100" height="100" rx="22" fill={onDark ? "var(--on-dark)" : "var(--ink)"} />
      <rect x="23" y="25" width="8.5" height="50" rx="4.25" fill="var(--accent)" />
      <rect x="36.5" y="25" width="8.5" height="50" rx="4.25" fill="var(--accent)" />
      <path
        d="M50 25 C79 25, 79 75, 50 75"
        fill="none"
        stroke={onDark ? "var(--ink)" : "var(--on-dark)"}
        strokeWidth="9.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Logo({ to = "/dashboard", onDark = false, size = 26, className = "" }) {
  const cls = ["logo", onDark && "logo--on-dark", className].filter(Boolean).join(" ");
  return (
    <Link to={to} className={cls} aria-label="DevOrDead — trang chủ ứng dụng">
      <LogoMark size={size} onDark={onDark} />
      <span className="logo__word" aria-hidden="true">
        Dev<span className="logo__or">||</span>Dead
      </span>
    </Link>
  );
}
