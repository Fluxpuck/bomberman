import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

/**
 * Shared UI primitives. Styles live in globals.css (`.ui-*`); every screen
 * composes these so buttons, panels and type look and behave the same.
 */

export type ButtonVariant =
  | "green"
  | "blue"
  | "orange"
  | "red"
  | "purple"
  | "discord"
  | "neutral"
  | "card";

// Full class names (not built dynamically) so Tailwind/grep can see them.
const VARIANT_CLASS: Record<ButtonVariant, string> = {
  green: "ui-btn--green",
  blue: "ui-btn--blue",
  orange: "ui-btn--orange",
  red: "ui-btn--red",
  purple: "ui-btn--purple",
  discord: "ui-btn--discord",
  neutral: "ui-btn--neutral",
  card: "ui-btn--card",
};

const SIZE_CLASS = { sm: "ui-btn--sm", md: "", lg: "ui-btn--lg" } as const;

const TITLE_TONE_CLASS = {
  yellow: "",
  red: "ui-title--red",
  green: "ui-title--green",
  cyan: "ui-title--cyan",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: keyof typeof SIZE_CLASS;
  /** Stretch to the full width of the parent. */
  block?: boolean;
}

export function Button({
  variant = "neutral",
  size = "md",
  block,
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  const cls = ["ui-btn", VARIANT_CLASS[variant], SIZE_CLASS[size], block ? "w-full" : "", className]
    .filter(Boolean)
    .join(" ");
  return <button type={type} className={cls} {...rest} />;
}

/** Quiet text-style action, e.g. "Back to menu". */
export function LinkButton({
  className = "",
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={`ui-link ${className}`} {...rest} />;
}

/** Full-screen scrim hosting a centered panel. */
export function Screen({ children }: { children: ReactNode }) {
  return <div className="ui-screen">{children}</div>;
}

/** Raised dialog panel. `width` is the max width in px. */
export function Panel({
  children,
  width = 440,
  className = "",
}: {
  children: ReactNode;
  width?: number;
  className?: string;
}) {
  return (
    <div className={`ui-panel ${className}`} style={{ "--ui-w": `${width}px` } as CSSProperties}>
      {children}
    </div>
  );
}

/** Screen heading: display-font title with an optional muted subtitle. */
export function Heading({
  title,
  subtitle,
  tone = "yellow",
}: {
  title: string;
  subtitle?: string;
  tone?: keyof typeof TITLE_TONE_CLASS;
}) {
  return (
    <div className="mb-6">
      <h1 className={`ui-title ${TITLE_TONE_CLASS[tone]}`}>{title}</h1>
      {subtitle && <p className="ui-subtitle">{subtitle}</p>}
    </div>
  );
}

/** Titled group of rows (stats, players). */
export function Section({
  title,
  dotColor,
  children,
  className = "",
}: {
  title: string;
  dotColor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`ui-section ${className}`}>
      <div className="ui-section-title">
        {dotColor && <span className="ui-dot" style={{ backgroundColor: dotColor }} />}
        <span className="ui-label">{title}</span>
      </div>
      {children}
    </div>
  );
}

/** Label / value line inside a Section. */
export function StatRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="ui-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
