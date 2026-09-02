"use client";

import { Filter } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/Badge";
import { useApi } from "@/hooks/use-api";
import { useMyPatients } from "@/lib/api/useMyPatients";
import type { ActivityFeedApi, QuestionEventApi } from "@/lib/types";

export default function ActivityPage() {
  const { patients: myPatients } = useMyPatients();
  const api = useApi();
  const [patientFilter, setPatientFilter] = useState("all");
  const [events, setEvents] = useState<QuestionEventApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadActivity() {
      setLoading(true);
      setError(null);
      try {
        const path =
          patientFilter === "all"
            ? "/dashboard/activity?limit=100"
            : `/dashboard/activity?patient_id=${patientFilter}&limit=100`;
        const res = await api<ActivityFeedApi>(path);
        if (!cancelled) {
          setEvents(res.events || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load activity feed",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadActivity();
    return () => {
      cancelled = true;
    };
  }, [api, patientFilter]);

  const grouped = useMemo(() => {
    return events.reduce<Record<string, QuestionEventApi[]>>((acc, e) => {
      const day = e.asked_at ? e.asked_at.slice(0, 10) : "Recent";
      acc[day] = acc[day] ? [...acc[day], e] : [e];
      return acc;
    }, {});
  }, [events]);

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
          Activity & Progress
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Every game and cognitive exercise completed across everyone in your
          care.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-black/6 dark:border-white/[0.08] bg-surface p-3">
        <label
          htmlFor="patient-filter-select"
          className="flex items-center gap-1.5 text-xs font-medium text-ink-500"
        >
          <Filter size={13} /> Filter:
        </label>
        <select
          id="patient-filter-select"
          value={patientFilter}
          onChange={(e) => setPatientFilter(e.target.value)}
          className="rounded-xl border border-black/10 dark:border-white/10 bg-surface px-3 py-2 text-xs font-medium text-ink-700 focus:outline-none"
        >
          <option value="all" className="bg-surface text-ink-900">
            All Patients
          </option>
          {myPatients.map((p) => (
            <option key={p.id} value={p.id} className="bg-surface text-ink-900">
              {p.full_name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-dashed border-amber-400/40 bg-amber-50 p-4 text-sm text-amber-500">
          Couldn&apos;t reach the activity feed: {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([day, dayEvents]) => (
            <div key={day}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
                {day}
              </p>
              <div className="space-y-2.5">
                {dayEvents.map((e) => {
                  return (
                    <div
                      key={e.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-black/6 dark:border-white/[0.08] bg-surface p-4 shadow-[0_2px_8px_rgba(44,31,88,0.06)] dark:shadow-none"
                    >
                      <div className="flex items-center gap-3.5">
                        {e.patient_avatar_url ? (
                          <Image
                            src={e.patient_avatar_url}
                            alt={e.patient_name ?? "Patient"}
                            width={44}
                            height={44}
                            className="h-11 w-11 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-display text-sm font-semibold text-indigo-700">
                            {(e.patient_name || "P").charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-ink-900">
                            {e.patient_name || "Patient"}
                          </p>
                          <p className="text-xs text-ink-500">
                            {e.activity_label}
                            {e.n_options ? ` · ${e.n_options} items` : ""}
                            {e.time_taken_ms
                              ? ` · ${Math.round(e.time_taken_ms / 1000)}s`
                              : ""}{" "}
                            ·{" "}
                            {new Date(e.asked_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <Badge tone={e.is_correct ? "mint" : "coral"}>
                        {e.is_correct ? "Completed" : "Incomplete"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {events.length === 0 && !error && (
            <div className="rounded-2xl border border-dashed border-black/15 dark:border-white/15 bg-surface py-16 text-center">
              <p className="font-display text-lg font-semibold text-ink-900">
                No activity found
              </p>
              <p className="mt-1 text-sm text-ink-500">
                Games played by patients will automatically show up here.
              </p>
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
