"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EditMemorySubjectModal } from "@/components/memories/EditMemorySubjectModal";
import { MemorySubjectCard } from "@/components/memories/MemorySubjectCard";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { usePatientMemories } from "@/lib/api/usePatientMemories";
import type { MemoryKind, MemorySubjectApi } from "@/lib/types";

const KINDS: MemoryKind[] = ["person", "place", "object"];

export function PatientMemoriesTab({
  patientId,
  patientFirstName,
}: {
  patientId: string;
  patientFirstName: string;
}) {
  const { showToast } = useToast();
  const { memories, loading, error, refetch, deleteMemory, isDeleting } =
    usePatientMemories(patientId);

  const [editingSubject, setEditingSubject] = useState<MemorySubjectApi | null>(
    null,
  );

  const handleDelete = async (subject: MemorySubjectApi) => {
    if (
      !confirm(
        `Remove ${subject.name ?? "this memory"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await deleteMemory(subject.id);
      showToast("Memory subject removed");
    } catch {
      showToast("Failed to remove memory subject");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">
          Photos and people {patientFirstName} will be asked to recognize in
          cognitive games.
        </p>
        <Link href={`/patients/${patientId}/memories/add`}>
          <Button size="sm" className="gap-1.5 shrink-0">
            <Plus size={14} /> Add Memory Subject
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-coral-200 bg-coral-50/40 p-3 text-sm text-coral-600 dark:border-coral-400/30">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]"
            />
          ))}
        </div>
      ) : (
        <>
          {KINDS.map((kind) => {
            const items = memories.filter((m) => m.kind === kind);
            if (items.length === 0) return null;
            return (
              <div key={kind}>
                <h4 className="mb-3 font-display text-sm font-semibold capitalize text-ink-700">
                  {kind}s ({items.length})
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {items.map((m) => (
                    <MemorySubjectCard
                      key={m.id}
                      subject={m}
                      onEdit={setEditingSubject}
                      onDelete={handleDelete}
                      disabled={isDeleting}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {memories.length === 0 && (
            <div className="rounded-2xl border border-dashed border-black/15 dark:border-white/15 py-16 text-center">
              <p className="font-display text-lg font-semibold text-ink-900">
                No memory subjects yet
              </p>
              <p className="mt-1.5 text-sm text-ink-500">
                Add people, places, and objects to personalize cognitive games.
              </p>
            </div>
          )}
        </>
      )}

      {editingSubject && (
        <EditMemorySubjectModal
          isOpen
          onClose={() => setEditingSubject(null)}
          subject={editingSubject}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
