"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, MapPin, Package, UploadCloud, Check } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MemoryKind } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";

const kinds: { key: MemoryKind; label: string; icon: any }[] = [
    { key: "person", label: "Person", icon: User },
    { key: "place", label: "Place", icon: MapPin },
    { key: "object", label: "Object", icon: Package },
];

export default function AddMemorySubjectPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const { showToast } = useToast();
    const [selected, setSelected] = useState<MemoryKind | null>(null);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        showToast("Memory subject saved");
        router.push(`/patients/${params.id}?tab=memories`);
    };

    return (
        <DashboardShell>
            <div className="mx-auto max-w-xl">
                <Link
                    href={`/patients/${params.id}?tab=memories`}
                    className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
                >
                    <ArrowLeft size={15} /> Back to Memory Subjects
                </Link>

                <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">Add a Memory Subject</h1>
                <p className="mt-1.5 text-sm text-ink-500">
                    This will be used to personalize cognitive recognition games.
                </p>

                <div className="mt-8">
                    {!selected ? (
                        <div className="grid grid-cols-3 gap-4">
                            {kinds.map((k) => (
                                <button
                                    key={k.key}
                                    onClick={() => setSelected(k.key)}
                                    className="flex flex-col items-center gap-3 rounded-2xl border border-black/[0.06] bg-surface p-6 text-center shadow-[0_2px_8px_rgba(44,31,88,0.06)] hover:border-indigo-300"
                                >
                                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                        <k.icon size={20} />
                                    </span>
                                    <span className="text-sm font-medium text-ink-900">{k.label}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <Card className="p-6 sm:p-8">
                            <div className="mb-6 flex items-center justify-between">
                                <p className="font-display text-lg font-semibold text-ink-900 capitalize">{selected}</p>
                                <button onClick={() => setSelected(null)} className="text-xs font-medium text-ink-500 hover:text-ink-900">
                                    Change type
                                </button>
                            </div>

                            <form className="space-y-5" onSubmit={handleSave}>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-ink-700">Upload Photo</label>
                                    <div className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/15 py-10 text-ink-400 hover:border-indigo-300 hover:text-indigo-500">
                                        <UploadCloud size={26} />
                                        <span className="text-xs font-medium">Click or drag a photo to upload</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-ink-700">Name</label>
                                    <input
                                        required
                                        placeholder={selected === "person" ? "e.g. Priya" : selected === "place" ? "e.g. College Street" : "e.g. His old radio"}
                                        className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
                                    />
                                </div>

                                {selected === "person" && (
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-ink-700">Relationship</label>
                                        <input
                                            placeholder="e.g. daughter, grandson"
                                            className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
                                        />
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 border-t border-black/[0.06] pt-5">
                                    <Button type="button" variant="ghost" onClick={() => setSelected(null)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="gap-2">
                                        <Check size={16} /> Save
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    )}
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
                    {memories.length}
                  </p>
                </div>
              </div>
            )}

            {tab === "memories" && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-ink-500">
                    Photos and people {patient.full_name.split(" ")[0]} will be
                    asked to recognize in cognitive games.
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
                    <p className="font-display text-lg font-semibold text-ink-900">
                      No memory subjects yet
                    </p>
                    <p className="mt-1.5 text-sm text-ink-500">
                      Add people, places, and objects to personalize cognitive
                      games.
                    </p>
                  </div>
                )}
              </div>
            )}

            {tab === "progress" && (
              <div className="space-y-8">
                <div>
                  <h4 className="mb-4 font-display text-sm font-semibold text-ink-700">
                    Accuracy per Session
                  </h4>
                  <SessionAccuracyChart data={sessionSummaries} />
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
                    {sessionSummaries.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-xl border border-black/6 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-ink-900">
                            {s.date}
                          </p>
                          <p className="text-xs text-ink-500">
                            {s.questionsAnswered}/{s.questionsPlanned} answered
                            · avg {Math.round(s.avgTimeMs / 1000)}s per question
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
                  Games played for enjoyment — no scoring, just time spent
                  engaged.
                </p>
                {casualPlay.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-black/6 px-4 py-3"
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
                      {Math.round(c.duration_sec / 60)} min
                    </span>
                  </div>
                ))}
                {casualPlay.length === 0 && (
                  <p className="text-sm text-ink-500">
                    No casual play logged yet.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
