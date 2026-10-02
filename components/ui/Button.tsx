import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "solid" | "outline" | "ghost" | "inverse";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] " +
  "border-0 font-ui font-bold uppercase tracking-[var(--ls-label)] leading-none " +
  "no-underline transition-[var(--transition-control)] outline-none " +
  "focus-visible:shadow-[var(--ring-focus)] " +
  "disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40";

const sizes: Record<Size, string> = {
  sm: "text-[11px] px-[14px] py-[9px]",
  md: "text-[13px] px-[22px] py-[13px]",
  lg: "text-[15px] px-[32px] py-[18px]",
};

const variants: Record<Variant, string> = {
  primary: "bg-clay-3 text-text-on-accent hover:bg-clay-4 active:bg-clay-5",
  solid: "bg-ink-1 text-paper-1 hover:bg-ink-3 active:bg-ink-2",
  outline:
    "bg-transparent text-text-strong shadow-[inset_0_0_0_var(--border-w-strong)_var(--border-strong)] " +
    "hover:bg-ink-1 hover:text-paper-1 active:bg-ink-2 active:text-paper-1",
  ghost: "bg-transparent text-text-strong hover:bg-paper-3 active:bg-paper-4",
  inverse: "bg-paper-1 text-ink-1 hover:bg-paper-3 active:bg-paper-4",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  children?: ReactNode;
  className?: string;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps | "type"> & {
    href?: undefined;
  };

type ButtonAsAnchor = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

export function Button({
  variant = "primary",
  size = "md",
  href,
  disabled,
  fullWidth,
  iconLeft,
  iconRight,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const classes = [
    base,
    sizes[size],
    variants[variant],
    fullWidth ? "w-full" : "",
    "active:translate-y-px",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <>
      {iconLeft}
      {children}
      {iconRight}
    </>
  );

  if (href && !disabled) {
    return (
      <a
        href={href}
        className={classes}
        {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className={classes}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {inner}
    </button>
  );
}
