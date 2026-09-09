import { DashboardShell } from "@/components/layout/DashboardShell";

export default function SettingsLoading() {
  return (
    <DashboardShell>
      <div className="mb-6">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-black/[0.06] dark:bg-white/[0.06]" />
        <div className="mt-2 h-4 w-56 animate-pulse rounded-md bg-black/[0.04] dark:bg-white/[0.04]" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-40 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />
        <div className="h-72 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />
        <div className="h-40 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04] lg:col-start-2" />
      </div>
    </DashboardShell>
  );
}
