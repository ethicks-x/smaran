import { DashboardShell } from "@/components/layout/DashboardShell";

export default function NotificationsLoading() {
  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="h-8 w-56 animate-pulse rounded-lg bg-black/[0.06] dark:bg-white/[0.06]" />
          <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded-md bg-black/[0.04] dark:bg-white/[0.04]" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-xl bg-black/[0.06] dark:bg-white/[0.06]" />
      </div>

      <div className="space-y-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]"
          />
        ))}
      </div>
    </DashboardShell>
  );
}
