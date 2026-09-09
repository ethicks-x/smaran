import { Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-server";
import type { MemorySubjectApi, PatientProgressApi } from "@/lib/types";

export default async function PatientOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let sessionsCount = 0;
  let accuracy = 0;
  let memoriesCount = 0;
  let error: string | null = null;

  try {
    const [progress, memories] = await Promise.all([
      api<PatientProgressApi>(`/dashboard/patients/${id}/progress`),
      api<MemorySubjectApi[]>(`/dashboard/patients/${id}/memories`),
    ]);
    sessionsCount = progress.sessions.length;
    accuracy = progress.overall_accuracy;
    memoriesCount = memories.length;
  } catch (err) {
    console.error("Failed to fetch patient overview:", err);
    error = "Couldn't load this patient's overview. Please try again.";
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-coral-200 bg-coral-50/40 p-4">
          <p className="text-sm font-semibold text-coral-600">{error}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-indigo-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Sessions
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-ink-900">
            {sessionsCount}
          </p>
        </div>
        <div className="rounded-xl bg-mint-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-mint-600">
            Accuracy
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-ink-900">
            {accuracy}%
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">
            Memory Subjects
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-ink-900">
            {memoriesCount}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-r from-indigo-50/60 via-purple-50/30 to-surface p-5">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <Sparkles size={20} />
          </div>
          <div className="space-y-0.5">
            <h4 className="font-display text-sm font-bold text-ink-900">
              AI Clinical & Daily Insights
            </h4>
            <p className="text-xs text-ink-500">
              Get real-time pattern analysis, circadian adherence insights, and
              caregiver suggestions.
            </p>
          </div>
        </div>
        <Link href={`/patients/${id}/insights`}>
          <Button size="sm" className="gap-1.5 shrink-0">
            <Sparkles size={14} /> View AI Insights
          </Button>
        </Link>
      </div>
    </div>
  );
}
