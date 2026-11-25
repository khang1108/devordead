import { Link } from "react-router-dom";

/** Biểu tượng ||) — chữ D ghép từ toán tử OR và dấu ngoặc. */
export function LogoMark({ size = 32, onDark = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="24" fill={onDark ? "var(--on-dark)" : "var(--ink)"} />
      <rect x="22" y="24" width="9" height="52" rx="4.5" fill="var(--accent)" />
      <rect x="36" y="24" width="9" height="52" rx="4.5" fill="var(--accent)" />
      <path d="M50 24 C80 24, 80 76, 50 76" fill="none" stroke={onDark ? "var(--ink)" : "var(--on-dark)"} strokeWidth="10" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ to = "/dashboard", onDark = false }) {
  return (
    <Link to={to} className={`logo ${onDark ? "logo--on-dark" : ""}`} aria-label="DevOrDead — trang chủ">
      <LogoMark onDark={onDark} />
      <span className="logo__word" aria-hidden="true">
        Dev<span className="logo__or">||</span>Dead
      </span>
    </Link>
  );
}
