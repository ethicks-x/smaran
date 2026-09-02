"use client";

import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ReminderForm, ReminderList } from "@/components/reminders";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { usePatientReminders } from "@/lib/api/usePatientReminders";
import type {
  ReminderApi,
  ReminderCreateInput,
  ReminderUpdateInput,
} from "@/lib/types";

export default function RemindersPage() {
  const params = useParams<{ id: string }>();
  const { showToast } = useToast();
  const {
    reminders,
    loading,
    error,
    createReminder,
    updateReminder,
    deleteReminder,
    isCreating,
    isUpdating,
    isDeleting,
  } = usePatientReminders(params.id);
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderApi | null>(
    null,
  );

  const handleCreate = async (data: Record<string, unknown>) => {
    try {
      await createReminder(data as ReminderCreateInput);
      showToast("Reminder created successfully");
      setShowForm(false);
    } catch (_err) {
      showToast("Failed to create reminder");
    }
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!editingReminder) return;
    try {
      await updateReminder(editingReminder.id, data as ReminderUpdateInput);
      showToast("Reminder updated successfully");
      setEditingReminder(null);
    } catch (_err) {
      showToast("Failed to update reminder");
    }
  };

  const handleDelete = async (reminderId: string) => {
    if (!confirm("Are you sure you want to delete this reminder?")) return;
    try {
      await deleteReminder(reminderId);
      showToast("Reminder deleted successfully");
    } catch (_err) {
      showToast("Failed to delete reminder");
    }
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/patients/${params.id}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft size={15} /> Back to Patient
        </Link>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
              Reminders
            </h1>
            <p className="mt-1.5 text-sm text-ink-500">
              Manage medication, hydration, activity, and appointment reminders.
            </p>
          </div>
          {!showForm && !editingReminder && (
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus size={18} /> Add Reminder
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-coral-200 bg-coral-50/40 p-3 text-sm text-coral-600 dark:border-coral-400/30">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-6">
            <ReminderForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              isLoading={isCreating}
            />
          </div>
        )}

        {editingReminder && (
          <div className="mb-6">
            <ReminderForm
              initialData={editingReminder}
              onSubmit={handleUpdate}
              onCancel={() => setEditingReminder(null)}
              isLoading={isUpdating}
            />
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]"
              />
            ))}
          </div>
        ) : (
          <ReminderList
            reminders={reminders.filter((r) => r.active)}
            onEdit={setEditingReminder}
            onDelete={handleDelete}
            isDeleting={isDeleting}
            disabled={isDeleting}
          />
        )}

        {reminders.filter((r) => !r.active).length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-ink-900">
              Inactive Reminders
            </h2>
            <ReminderList
              reminders={reminders.filter((r) => !r.active)}
              onEdit={setEditingReminder}
              onDelete={handleDelete}
              isDeleting={isDeleting}
              disabled={isDeleting}
            />
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
