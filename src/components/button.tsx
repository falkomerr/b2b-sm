import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
};

const variantMap = {
  primary:
    "bg-[var(--primary)] text-white shadow-[0_16px_40px_rgba(6,113,239,0.24)] hover:bg-[var(--primary-dark)]",
  secondary:
    "border border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)]",
  ghost: "bg-transparent text-[var(--muted)] hover:text-[var(--foreground)]",
};

export function Button({
  className = "",
  variant = "primary",
  leftSlot,
  rightSlot,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variantMap[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {leftSlot}
      <span>{children}</span>
      {rightSlot}
    </button>
  );
}
