import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PatientProfileHeader } from "@/components/patients/PatientProfileHeader";
import { PatientTabs } from "@/components/patients/PatientTabs";
import { MemorySubjectCard } from "@/components/memories/MemorySubjectCard";
import { SessionAccuracyChart } from "@/components/progress/SessionAccuracyChart";
import { ActivityBreakdown } from "@/components/progress/ActivityBreakdown";
import { Button } from "@/components/ui/Button";
import {
    getPatient,
    patientCaregivers,
    getMemorySubjects,
    getSessionsForPatient,
    getPatientAccuracy,
    getSessionSummaries,
    getActivityBreakdown,
    getCasualPlayForPatient,
} from "@/lib/mock-data";
import { MemoryKind } from "@/lib/types";

export default async function PatientProfilePage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ tab?: string }>;
}) {
    const { id } = await params;
    const { tab: tabParam } = await searchParams;

    const patient = getPatient(id);
    if (!patient) notFound();

    const link = patientCaregivers.find((pc) => pc.patient_id === patient.id);
    const tab = tabParam ?? "overview";

    const memories = getMemorySubjects(patient.id);
    const sessions = getSessionsForPatient(patient.id);
    const accuracy = getPatientAccuracy(patient.id);
    const sessionSummaries = getSessionSummaries(patient.id);
    const activityBreakdown = getActivityBreakdown(patient.id);
    const casualPlay = getCasualPlayForPatient(patient.id);

    const kinds: MemoryKind[] = ["person", "place", "object"];

    return (
        <DashboardShell>
            <div className="space-y-6">
                <PatientProfileHeader patient={patient} relationship={link?.relationship ?? "caregiver"} />

                <div className="rounded-2xl border border-black/[0.06] bg-surface shadow-[0_2px_8px_rgba(44,31,88,0.06)]">
                    <PatientTabs patientId={patient.id} />

                    <div className="p-6">
                        {tab === "overview" && (
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="rounded-xl bg-indigo-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Sessions</p>
                                    <p className="mt-2 font-display text-2xl font-bold text-ink-900">{sessions.length}</p>
                                </div>
                                <div className="rounded-xl bg-mint-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-mint-600">Accuracy</p>
                                    <p className="mt-2 font-display text-2xl font-bold text-ink-900">{accuracy}%</p>
                                </div>
                                <div className="rounded-xl bg-amber-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">Memory Subjects</p>
                                    <p className="mt-2 font-display text-2xl font-bold text-ink-900">{memories.length}</p>
                                </div>
                            </div>
                        )}

                        {tab === "memories" && (
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-ink-500">
                                        Photos and people {patient.full_name.split(" ")[0]} will be asked to recognize in cognitive games.
                                    </p>
                                    <Link href={`/patients/${patient.id}/memories/add`}>
                                        <Button size="sm" className="gap-1.5 shrink-0">
                                            <Plus size={14} /> Add Memory Subject
                                        </Button>
                                    </Link>
                                </div>

                                {kinds.map((kind) => {
                                    const items = memories.filter((m) => m.kind === kind);
                                    if (items.length === 0) return null;
                                    return (
                                        <div key={kind}>
                                            <h4 className="mb-3 font-display text-sm font-semibold capitalize text-ink-700">
                                                {kind}s ({items.length})
                                            </h4>
                                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                                {items.map((m) => (
                                                    <MemorySubjectCard key={m.id} subject={m} />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}

                                {memories.length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-black/15 py-16 text-center">
                                        <p className="font-display text-lg font-semibold text-ink-900">No memory subjects yet</p>
                                        <p className="mt-1.5 text-sm text-ink-500">
                                            Add people, places, and objects to personalize cognitive games.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === "progress" && (
                            <div className="space-y-8">
                                <div>
                                    <h4 className="mb-4 font-display text-sm font-semibold text-ink-700">Accuracy per Session</h4>
                                    <SessionAccuracyChart data={sessionSummaries} />
                                </div>

                                <div>
                                    <h4 className="mb-4 font-display text-sm font-semibold text-ink-700">Accuracy by Activity Type</h4>
                                    <ActivityBreakdown data={activityBreakdown} />
                                </div>

                                <div>
                                    <h4 className="mb-3 font-display text-sm font-semibold text-ink-700">Sessions</h4>
                                    <div className="space-y-2.5">
                                        {sessionSummaries.map((s) => (
                                            <div
                                                key={s.id}
                                                className="flex items-center justify-between rounded-xl border border-black/[0.06] px-4 py-3"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium text-ink-900">{s.date}</p>
                                                    <p className="text-xs text-ink-500">
                                                        {s.questionsAnswered}/{s.questionsPlanned} answered · avg{" "}
                                                        {Math.round(s.avgTimeMs / 1000)}s per question
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
                        )}

                        {tab === "casual" && (
                            <div className="space-y-2.5">
                                <p className="mb-3 text-sm text-ink-500">
                                    Games played for enjoyment — no scoring, just time spent engaged.
                                </p>
                                {casualPlay.map((c) => (
                                    <div key={c.id} className="flex items-center justify-between rounded-xl border border-black/[0.06] px-4 py-3">
                                        <div>
                                            <p className="text-sm font-medium capitalize text-ink-900">{c.game_key}</p>
                                            <p className="text-xs text-ink-500">{new Date(c.played_at).toLocaleString()}</p>
                                        </div>
                                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
                                            {Math.round(c.duration_sec / 60)} min
                                        </span>
                                    </div>
                                ))}
                                {casualPlay.length === 0 && <p className="text-sm text-ink-500">No casual play logged yet.</p>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}