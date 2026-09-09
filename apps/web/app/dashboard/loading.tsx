import { DashboardShell } from "@/components/layout/DashboardShell";

export default function DashboardLoading() {
  return (
    <DashboardShell>
      <div className="mb-7">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-black/[0.06] dark:bg-white/[0.06]" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded-md bg-black/[0.04] dark:bg-white/[0.04]" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {["total", "activities", "memories", "attention"].map((key) => (
          <div
            key={key}
            className="h-24 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]"
          />
        ))}
      </div>

      <div className="mt-8">
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <div className="h-40 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />
          <div className="h-40 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />
        </div>

        <div className="mb-4 h-5 w-32 animate-pulse rounded-md bg-black/[0.06] dark:bg-white/[0.06]" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {["patient-1", "patient-2", "patient-3"].map((key) => (
            <div
              key={key}
              className="h-52 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]"
            />
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
