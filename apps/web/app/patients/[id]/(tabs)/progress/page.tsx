import { ActivityBreakdown } from "@/components/progress/ActivityBreakdown";
import { SessionAccuracyChart } from "@/components/progress/SessionAccuracyChart";
import { api } from "@/lib/api-server";
import type { PatientProgressApi } from "@/lib/types";

export default async function PatientProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let progress: PatientProgressApi | null = null;
  let error: string | null = null;

  try {
    progress = await api<PatientProgressApi>(
      `/dashboard/patients/${id}/progress`,
    );
  } catch (err) {
    console.error("Failed to fetch patient progress:", err);
    error = "Couldn't load this patient's progress. Please try again.";
  }

  if (error || !progress) {
    return (
      <div className="rounded-2xl border border-coral-200 bg-coral-50/40 p-4">
        <p className="text-sm font-semibold text-coral-600">{error}</p>
      </div>
    );
  }

  const { sessions, activity_breakdown: activityBreakdown } = progress;

  return (
    <div className="space-y-8">
      <div>
        <h4 className="mb-4 font-display text-sm font-semibold text-ink-700">
          Accuracy per Session
        </h4>
        <SessionAccuracyChart data={sessions} />
      </div>

      <div>
        <h4 className="mb-4 font-display text-sm font-semibold text-ink-700">
          Accuracy by Activity Type
        </h4>
        <ActivityBreakdown data={activityBreakdown} />
      </div>

      <div>
        <h4 className="mb-3 font-display text-sm font-semibold text-ink-700">
          Sessions
        </h4>
        <div className="space-y-2.5">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-black/6 dark:border-white/[0.08] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-ink-900">{s.date}</p>
                <p className="text-xs text-ink-500">
                  {s.questions_answered ?? "—"}/{s.questions_planned ?? "—"}{" "}
                  answered · avg {Math.round(s.avg_time_ms / 1000)}s per
                  question
                </p>
              </div>
              <span className="rounded-full bg-mint-50 px-2.5 py-1 text-xs font-semibold text-mint-600">
                {s.accuracy}% accuracy
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
