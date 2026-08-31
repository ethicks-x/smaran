import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  tone = "indigo",
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  tone?: "indigo" | "mint" | "amber" | "coral";
}) {
  const toneMap = {
    indigo: "bg-indigo-50 text-indigo-600",
    mint: "bg-mint-50 text-mint-600",
    amber: "bg-amber-50 text-amber-500",
    coral: "bg-coral-50 text-coral-500",
  };

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-surface p-5 shadow-[0_2px_8px_rgba(44,31,88,0.06)] transition-shadow hover:shadow-[0_4px_24px_rgba(44,31,88,0.07)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-ink-500">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold text-ink-900">{value}</p>
          {subtext && <p className="mt-1.5 text-xs text-ink-500">{subtext}</p>}
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", toneMap[tone])}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}