"use client";

import { Filter } from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/Badge";
import {
  caregiver,
  getPatient,
  getPatientsForCaregiver,
  questionEvents,
} from "@/lib/mock-data";

const activityLabel: Record<string, string> = {
  who_is_this: "Who is this?",
  what_is_this: "What is this?",
  where_is_this: "Where is this?",
};

export default function ActivityPage() {
  const myPatients = getPatientsForCaregiver(caregiver.id);
  const [patientFilter, setPatientFilter] = useState("all");

  const filtered = useMemo(() => {
    return questionEvents
      .filter((e) => patientFilter === "all" || e.patient_id === patientFilter)
      .filter((e) => e.is_correct !== null)
      .sort(
        (a, b) =>
          new Date(b.asked_at).getTime() - new Date(a.asked_at).getTime(),
      );
  }, [patientFilter]);

  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, e) => {
    const day = e.asked_at.slice(0, 10);
    acc[day] = acc[day] ? [...acc[day], e] : [e];
    return acc;
  }, {});

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
          Activity & Progress
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Every recognition question asked across everyone in your care.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-black/6 bg-surface p-3">
        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
          <Filter size={13} /> Filter:
        </span>
        <select
          value={patientFilter}
          onChange={(e) => setPatientFilter(e.target.value)}
          className="rounded-xl border border-black/8 bg-white px-3 py-2 text-xs font-medium text-ink-700 focus:outline-none"
        >
          <option value="all">All Patients</option>
          {myPatients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-8">
        {Object.entries(grouped).map(([day, events]) => (
          <div key={day}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
              {day}
            </p>
            <div className="space-y-2.5">
              {events.map((e) => {
                const patient = getPatient(e.patient_id);
                return (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-black/6 bg-surface p-4 shadow-[0_2px_8px_rgba(44,31,88,0.06)]"
                  >
                    <div className="flex items-center gap-3.5">
                      {/** biome-ignore lint/performance/noImgElement: Image is used for visual purposes only */}
                      <img
                        src={patient?.avatar_url ?? undefined}
                        alt={patient?.full_name}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-semibold text-ink-900">
                          {patient?.full_name}
                        </p>
                        <p className="text-xs text-ink-500">
                          {activityLabel[e.activity]} · {e.n_options} options ·{" "}
                          {new Date(e.asked_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge tone={e.is_correct ? "mint" : "coral"}>
                      {e.is_correct ? "Correct" : "Incorrect"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-black/15 bg-surface py-16 text-center">
            <p className="font-display text-lg font-semibold text-ink-900">
              No activity found
            </p>
            <p className="mt-1 text-sm text-ink-500">
              Try a different patient filter.
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
