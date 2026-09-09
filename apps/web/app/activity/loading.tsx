import { DashboardShell } from "@/components/layout/DashboardShell";

export default function ActivityLoading() {
  return (
    <DashboardShell>
      <div className="mb-6">
        <div className="h-8 w-72 animate-pulse rounded-lg bg-black/[0.06] dark:bg-white/[0.06]" />
        <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded-md bg-black/[0.04] dark:bg-white/[0.04]" />
      </div>

      <div className="mb-6 h-12 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />

      <div className="space-y-3">
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
