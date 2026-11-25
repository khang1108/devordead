// Bộ component giao diện dùng chung — khớp component trong file Figma "DevOrDead — App Screens".
// Mọi màn hình chỉ dùng các component này + class tiện ích trong styles/app.css.
import { useId } from "react";

export function Button({ variant = "primary", size, block, onDark, className = "", children, ...rest }) {
  const cls = ["btn", `btn--${variant}`, size === "sm" && "btn--sm", block && "btn--block", onDark && "btn--on-dark", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}

/** tone: neutral | brand | success | warning | danger */
export function Badge({ tone = "neutral", dot, children, className = "" }) {
  return (
    <span className={`badge badge--${tone} ${className}`}>
      {dot && <span className="badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Card({ as: Tag = "section", variant, className = "", children, ...rest }) {
  const cls = ["card", variant && `card--${variant}`, className].filter(Boolean).join(" ");
  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
}

/** Tiêu đề nhỏ dạng mono của một card, kèm phần tử bên phải (link, badge…) */
export function CardHead({ title, children }) {
  return (
    <div className="card__head">
      <h2 className="t-mono card__title">{title}</h2>
      {children}
    </div>
  );
}

export function Eyebrow({ children, className = "" }) {
  return <p className={`t-mono ${className}`}>{children}</p>;
}

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        {eyebrow && <p className="t-mono page-header__eyebrow">{eyebrow}</p>}
        <h1 className="t-display-l">{title}</h1>
        {subtitle && <p className="page-header__sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}

export function StatCard({ label, value, delta, deltaTone = "success" }) {
  return (
    <div className="stat">
      <p className="t-mono stat__label">{label}</p>
      <p className="t-number">{value}</p>
      {delta && <p className={`t-body-s c-${deltaTone}`}>{delta}</p>}
    </div>
  );
}

/** Ô nhập có nhãn. multiline → textarea. */
export function Field({ label, hint, error, multiline, id, className = "", ...rest }) {
  const autoId = useId();
  const fid = id || autoId;
  const Tag = multiline ? "textarea" : "input";
  return (
    <div className={`field ${className}`}>
      <label className="field__label" htmlFor={fid}>
        {label}
      </label>
      <Tag
        id={fid}
        className={multiline ? "textarea" : "input"}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
        {...rest}
      />
      {hint && !error && (
        <p className="field__hint" id={`${fid}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={`${fid}-err`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Nhóm lựa chọn một trong nhiều (radiogroup). options: [{ value, label }] hoặc chuỗi */
export function Segmented({ options, value, onChange, label }) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className="segmented__opt"
          onClick={() => onChange?.(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, onClick, children }) {
  return (
    <button type="button" className="chip" aria-pressed={!!active} onClick={onClick}>
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={!!checked} aria-label={label} className="toggle" onClick={() => onChange?.(!checked)} />
  );
}

/** tabs: [{ value, label }] */
export function Tabs({ tabs, value, onChange, label }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={value === t.value} className="tabs__tab" onClick={() => onChange?.(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** value 0..1; tone: brand | success | warning | accent */
export function ProgressBar({ value, tone = "brand", label }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={`progress progress--${tone}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
      <div className="progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Callout({ tone = "brand", title, children }) {
  return (
    <div className={`callout callout--${tone}`}>
      {title && <p className={`t-mono ${tone === "brand" ? "c-brand" : tone === "warning" ? "c-warning" : tone === "success" ? "c-success" : ""}`}>{title}</p>}
      <div className="t-body-s">{children}</div>
    </div>
  );
}

/** Nhãn quy định nghiệp vụ (BR1–BR4, NFR…) hiển thị tại chỗ áp dụng. */
export function RuleTag({ code, children }) {
  return (
    <Badge tone="neutral">
      {code}
      {children ? ` · ${children}` : ""}
    </Badge>
  );
}
