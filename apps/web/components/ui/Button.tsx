import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "danger"
  | "glow";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-400 dark:text-ink-900 dark:hover:bg-indigo-300 shadow-[0_2px_8px_rgba(44,31,88,0.06)]",
  secondary:
    "bg-lavender-100 text-indigo-800 dark:bg-lavender-100 dark:text-lavender-500 hover:bg-lavender-200 dark:hover:bg-lavender-200",
  outline:
    "border border-ink-300/40 text-ink-700 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] bg-transparent",
  ghost:
    "text-ink-700 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] bg-transparent",
  danger:
    "bg-coral-500 text-white hover:bg-coral-400 dark:bg-coral-500 dark:text-ink-900 dark:hover:bg-coral-400",
  glow: "border border-indigo-400/70 text-indigo-700 dark:text-indigo-200 bg-transparent hover:bg-indigo-50/60 dark:hover:bg-indigo-400/10 animate-glow-pulse",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-sm px-3.5 py-1.5 rounded-lg gap-1.5",
  md: "text-sm px-5 py-2.5 rounded-xl gap-2",
  lg: "text-base px-7 py-3.5 rounded-2xl gap-2.5",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
