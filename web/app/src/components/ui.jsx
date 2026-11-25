// Bộ component giao diện dùng chung — hệ thống Neutral Studio (Linear / Attio / Vercel craft).
// Giữ nguyên 100% tên export và chữ ký props để tương thích toàn bộ 15 màn hình.
import { useId } from "react";

export function Button({ variant = "primary", size, block, onDark, className = "", children, ...rest }) {
  const cls = [
    "btn",
    `btn--${variant}`,
    size === "sm" && "btn--sm",
    block && "btn--block",
    onDark && "btn--on-dark",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}

/** tone: neutral | brand | success | warning | danger — chip trung tính 1px kèm chấm màu ngữ nghĩa */
export function Badge({ tone = "neutral", dot, children, className = "", ...rest }) {
  const showDot = Boolean(dot || tone !== "neutral");
  const cls = ["badge", `badge--${tone}`, className].filter(Boolean).join(" ");
  return (
    <span className={cls} {...rest}>
      {showDot && <span className="badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Card({ as: Tag = "section", variant, interactive = false, className = "", children, ...rest }) {
  const cls = [
    "card",
    variant && `card--${variant}`,
    interactive && "card--interactive",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
}

/** Tiêu đề phần bên trong card (sentence-case, tinh gọn), kèm phần tử bên phải */
export function CardHead({ title, children, className = "" }) {
  return (
    <div className={`card__head ${className}`.trim()}>
      <h2 className="card__title">{title}</h2>
      {children}
    </div>
  );
}

export function Eyebrow({ children, className = "", ...rest }) {
  return (
    <p className={`eyebrow ${className}`.trim()} {...rest}>
      {children}
    </p>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions, className = "" }) {
  return (
    <header className={`page-header ${className}`.trim()}>
      <div className="page-header__text">
        {eyebrow && <p className="page-header__eyebrow">{eyebrow}</p>}
        <h1 className="t-display-l">{title}</h1>
        {subtitle && <p className="page-header__sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}

export function StatCard({ label, value, delta, deltaTone = "success", className = "" }) {
  return (
    <div className={`stat ${className}`.trim()}>
      <p className="stat__label">{label}</p>
      <p className="t-number stat__value">{value}</p>
      {delta && <p className={`t-body-s stat__delta c-${deltaTone}`}>{delta}</p>}
    </div>
  );
}

/** Ô nhập có nhãn. multiline → textarea. Tương thích truyền ref trực tiếp trong React 19. */
export function Field({ label, hint, error, multiline, id, className = "", ...rest }) {
  const autoId = useId();
  const fid = id || autoId;
  const Tag = multiline ? "textarea" : "input";
  return (
    <div className={`field ${className}`.trim()}>
      {label && (
        <label className="field__label" htmlFor={fid}>
          {label}
        </label>
      )}
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
export function Segmented({ options, value, onChange, label, className = "" }) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <div className={`segmented ${className}`.trim()} role="radiogroup" aria-label={label}>
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

export function Chip({ active, onClick, className = "", children, ...rest }) {
  return (
    <button
      type="button"
      className={`chip ${className}`.trim()}
      aria-pressed={!!active}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, label, className = "", ...rest }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={label}
      className={`toggle ${className}`.trim()}
      onClick={() => onChange?.(!checked)}
      {...rest}
    />
  );
}

/** tabs: [{ value, label }] */
export function Tabs({ tabs, value, onChange, label, className = "" }) {
  return (
    <div className={`tabs ${className}`.trim()} role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          className="tabs__tab"
          onClick={() => onChange?.(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** value 0..1; tone: brand | success | warning | accent */
export function ProgressBar({ value, tone = "brand", label, className = "" }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      className={`progress progress--${tone} ${className}`.trim()}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
    >
      <div className="progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Callout({ tone = "brand", title, className = "", children, ...rest }) {
  const titleToneClass =
    tone === "brand"
      ? "c-brand"
      : tone === "warning"
        ? "c-warning"
        : tone === "success"
          ? "c-success"
          : tone === "danger"
            ? "c-accent"
            : "";
  return (
    <div className={`callout callout--${tone} ${className}`.trim()} {...rest}>
      {title && <p className={`callout__title ${titleToneClass}`.trim()}>{title}</p>}
      <div className="t-body-s callout__body">{children}</div>
    </div>
  );
}

/** Nhãn quy định nghiệp vụ & phi chức năng (BR1–BR4, NFR01–NFR10) — chip đơn sắc 1px tinh gọn. */
export function RuleTag({ code, children, className = "" }) {
  return (
    <span className={`rule-tag ${className}`.trim()}>
      <span className="rule-tag__code">{code}</span>
      {children ? (
        <>
          <span className="rule-tag__sep" aria-hidden="true">
            {" · "}
          </span>
          <span className="rule-tag__label">{children}</span>
        </>
      ) : null}
    </span>
  );
}
