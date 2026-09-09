import { DashboardShell } from "@/components/layout/DashboardShell";

export default function PatientsLoading() {
  return (
    <DashboardShell>
      <div className="mb-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-black/[0.06] dark:bg-white/[0.06]" />
        <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded-md bg-black/[0.04] dark:bg-white/[0.04]" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="h-40 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />
        <div className="h-40 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]"
          />
        ))}
      </div>
    </DashboardShell>
  );
}
