// Bộ component giao diện dùng chung — hệ thống Neutral Studio (Linear / Attio / Vercel craft).
import {
  useId,
  type ButtonHTMLAttributes,
  type ElementType,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import type { DeltaTone, ProgressTone, RuleCode, Tone } from "@shared/types";

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  block?: boolean;
  onDark?: boolean;
}

export function Button({
  variant = "primary",
  size,
  block,
  onDark,
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps) {
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
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
}

/** tone: neutral | brand | success | warning | danger — chip trung tính 1px kèm chấm màu ngữ nghĩa */
export function Badge({ tone = "neutral", dot, children, className = "", ...rest }: BadgeProps) {
  const showDot = Boolean(dot || tone !== "neutral");
  const cls = ["badge", `badge--${tone}`, className].filter(Boolean).join(" ");
  return (
    <span className={cls} {...rest}>
      {showDot && <span className="badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  variant?: "flat" | "subtle" | "dark";
  interactive?: boolean;
}

export function Card({
  as: Tag = "section",
  variant,
  interactive = false,
  className = "",
  children,
  ...rest
}: CardProps) {
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

export interface CardHeadProps {
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** Tiêu đề phần bên trong card (sentence-case, tinh gọn), kèm phần tử bên phải */
export function CardHead({ title, children, className = "" }: CardHeadProps) {
  return (
    <div className={`card__head ${className}`.trim()}>
      <h2 className="card__title">{title}</h2>
      {children}
    </div>
  );
}

export function Eyebrow({ children, className = "", ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`eyebrow ${className}`.trim()} {...rest}>
      {children}
    </p>
  );
}

export interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, subtitle, actions, className = "" }: PageHeaderProps) {
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

export interface StatCardProps {
  label: string;
  value: ReactNode;
  delta?: string;
  deltaTone?: DeltaTone;
  className?: string;
}

export function StatCard({ label, value, delta, deltaTone = "success", className = "" }: StatCardProps) {
  return (
    <div className={`stat ${className}`.trim()}>
      <p className="stat__label">{label}</p>
      <p className="t-number stat__value">{value}</p>
      {delta && <p className={`t-body-s stat__delta c-${deltaTone}`}>{delta}</p>}
    </div>
  );
}

interface FieldBaseProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  id?: string;
  className?: string;
}

export type FieldProps =
  | (FieldBaseProps & { multiline?: false } & InputHTMLAttributes<HTMLInputElement>)
  | (FieldBaseProps & { multiline: true } & TextareaHTMLAttributes<HTMLTextAreaElement>);

/** Ô nhập có nhãn. multiline → textarea. */
export function Field(props: FieldProps) {
  const autoId = useId();
  const { label, hint, error, id, className = "", multiline } = props;
  const fid = id || autoId;
  const describedBy = error ? `${fid}-err` : hint ? `${fid}-hint` : undefined;

  return (
    <div className={`field ${className}`.trim()}>
      {label && (
        <label className="field__label" htmlFor={fid}>
          {label}
        </label>
      )}
      {multiline ? (
        (() => {
          const {
            label: _l,
            hint: _h,
            error: _e,
            id: _i,
            className: _c,
            multiline: _m,
            ...textareaProps
          } = props;
          return (
            <textarea
              id={fid}
              className="textarea"
              aria-invalid={error ? "true" : undefined}
              aria-describedby={describedBy}
              {...textareaProps}
            />
          );
        })()
      ) : (
        (() => {
          const {
            label: _l,
            hint: _h,
            error: _e,
            id: _i,
            className: _c,
            multiline: _m,
            ...inputProps
          } = props;
          return (
            <input
              id={fid}
              className="input"
              aria-invalid={error ? "true" : undefined}
              aria-describedby={describedBy}
              {...inputProps}
            />
          );
        })()
      )}
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

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string | number> {
  options: readonly (T | SegmentedOption<T>)[];
  value: T;
  onChange?: (value: T) => void;
  label?: string;
  className?: string;
}

/** Nhóm lựa chọn một trong nhiều (radiogroup). */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  className = "",
}: SegmentedProps<T>) {
  const opts: SegmentedOption<T>[] = options.map((o) =>
    typeof o === "object" && o !== null ? o : { value: o, label: String(o) },
  );
  return (
    <div className={`segmented ${className}`.trim()} role="radiogroup" aria-label={label}>
      {opts.map((o) => (
        <button
          key={String(o.value)}
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

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function Chip({ active, onClick, className = "", children, ...rest }: ChipProps) {
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

export interface ToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label: string;
}

export function Toggle({ checked, onChange, label, className = "", ...rest }: ToggleProps) {
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

export interface TabItem<T extends string> {
  value: T;
  label: string;
}

export interface TabsProps<T extends string> {
  tabs: readonly TabItem<T>[];
  value: T;
  onChange?: (value: T) => void;
  label?: string;
  className?: string;
}

export function Tabs<T extends string>({ tabs, value, onChange, label, className = "" }: TabsProps<T>) {
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

export interface ProgressBarProps {
  value: number;
  tone?: ProgressTone;
  label?: string;
  className?: string;
}

/** value 0..1; tone: brand | success | warning | accent */
export function ProgressBar({ value, tone = "brand", label, className = "" }: ProgressBarProps) {
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

export interface CalloutProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  title?: string;
}

export function Callout({ tone = "brand", title, className = "", children, ...rest }: CalloutProps) {
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

export interface RuleTagProps {
  code: RuleCode | string;
  children?: ReactNode;
  className?: string;
}

/** Nhãn quy định nghiệp vụ & phi chức năng (BR1–BR4, NFR01–NFR10) — chip đơn sắc 1px tinh gọn. */
export function RuleTag({ code, children, className = "" }: RuleTagProps) {
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

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({ width = "100%", height = 16, className = "" }: SkeletonProps) {
  return <span className={`skeleton ${className}`.trim()} style={{ width, height }} aria-hidden="true" />;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, actions, className = "" }: EmptyStateProps) {
  return (
    <div className={`empty-state ${className}`.trim()} role="status">
      <p className="empty-state__title">{title}</p>
      {description && <p className="empty-state__desc">{description}</p>}
      {actions && <div className="empty-state__actions">{actions}</div>}
    </div>
  );
}

export interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  actions?: ReactNode;
  className?: string;
}

export function ErrorBanner({
  title = "Chưa kết nối được tới máy chủ API",
  message,
  onRetry,
  retryLabel = "Thử lại",
  actions,
  className = "",
}: ErrorBannerProps) {
  return (
    <div className={`error-banner ${className}`.trim()} role="alert">
      <div className="error-banner__content">
        <p className="error-banner__title">{title}</p>
        <p className="error-banner__msg">{message}</p>
      </div>
      {(onRetry || actions) && (
        <div className="error-banner__actions">
          {actions}
          {onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
