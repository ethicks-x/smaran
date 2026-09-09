import { api } from "@/lib/api-server";
import type { CasualPlayApi } from "@/lib/types";

export default async function PatientCasualPlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let casualPlay: CasualPlayApi[] = [];
  let error: string | null = null;

  try {
    casualPlay = await api<CasualPlayApi[]>(
      `/dashboard/patients/${id}/casual-play`,
    );
  } catch (err) {
    console.error("Failed to fetch casual play history:", err);
    error = "Couldn't load casual play history. Please try again.";
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-coral-200 bg-coral-50/40 p-4">
        <p className="text-sm font-semibold text-coral-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="mb-3 text-sm text-ink-500">
        Games played for enjoyment — no scoring, just time spent engaged.
      </p>
      {casualPlay.map((c) => (
        <div
          key={c.id}
          className="flex items-center justify-between rounded-xl border border-black/6 dark:border-white/[0.08] px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium capitalize text-ink-900">
              {c.game_key}
            </p>
            <p className="text-xs text-ink-500">
              {new Date(c.played_at).toLocaleString()}
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
            {c.duration_sec ? Math.round(c.duration_sec / 60) : 0} min
          </span>
        </div>
      ))}
      {casualPlay.length === 0 && (
        <p className="text-sm text-ink-500">No casual play logged yet.</p>
      )}
    </div>
  );
}
