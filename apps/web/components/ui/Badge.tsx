import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "indigo" | "mint" | "amber" | "coral" | "neutral";

const toneClasses: Record<Tone, string> = {
  indigo: "bg-indigo-50 text-indigo-700",
  mint: "bg-mint-50 text-mint-600",
  amber: "bg-amber-50 text-amber-500",
  coral: "bg-coral-50 text-coral-500",
  neutral: "bg-black/[0.05] text-ink-700",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}