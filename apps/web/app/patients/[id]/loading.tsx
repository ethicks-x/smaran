import { DashboardShell } from "@/components/layout/DashboardShell";

const tabLabels = [
  "Overview",
  "AI Insights",
  "Memories",
  "Reminders",
  "Progress",
  "Casual",
];
const statCards = ["sessions", "accuracy", "memories"];

export default function PatientProfileLoading() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-surface p-6 shadow-[0_2px_8px_rgba(44,31,88,0.06)] dark:shadow-none">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 animate-pulse rounded-2xl bg-black/[0.06] dark:bg-white/[0.06] sm:h-24 sm:w-24" />
              <div className="space-y-2.5">
                <div className="h-6 w-40 animate-pulse rounded-lg bg-black/[0.06] dark:bg-white/[0.06]" />
                <div className="h-4 w-56 animate-pulse rounded-lg bg-black/[0.04] dark:bg-white/[0.04]" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {["edit", "memory", "reminder"].map((key) => (
                <div
                  key={key}
                  className="h-10 w-32 animate-pulse rounded-xl bg-black/[0.04] dark:bg-white/[0.04]"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/6 dark:border-white/[0.08] bg-surface shadow-[0_2px_8px_rgba(44,31,88,0.06)] dark:shadow-none">
          <div className="flex gap-1 overflow-x-auto border-b border-black/[0.07] dark:border-white/[0.08]">
            {tabLabels.map((label) => (
              <div key={label} className="px-4 py-3">
                <div className="h-4 w-20 animate-pulse rounded-md bg-black/[0.06] dark:bg-white/[0.06]" />
              </div>
            ))}
          </div>

          <div className="space-y-6 p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {statCards.map((key) => (
                <div
                  key={key}
                  className="h-24 animate-pulse rounded-xl bg-black/[0.04] dark:bg-white/[0.04]"
                />
              ))}
            </div>
            <div className="h-24 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
