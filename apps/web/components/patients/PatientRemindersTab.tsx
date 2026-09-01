"use client";

import { BellPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ReminderList, ReminderForm, AddReminderModal } from "@/components/reminders";
import { usePatientReminders } from "@/lib/api/usePatientReminders";
import type { ReminderApi, ReminderUpdateInput } from "@/lib/types";

export function PatientRemindersTab({ patientId }: { patientId: string }) {
  const { showToast } = useToast();
  const {
    reminders,
    loading,
    error,
    updateReminder,
    deleteReminder,
    refetch,
    isUpdating,
    isDeleting,
  } = usePatientReminders(patientId);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderApi | null>(null);

  const handleUpdate = async (data: Record<string, any>) => {
    if (!editingReminder) return;
    try {
      await updateReminder(editingReminder.id, data as ReminderUpdateInput);
      showToast("Reminder updated successfully");
      setEditingReminder(null);
    } catch {
      showToast("Failed to update reminder");
    }
  };

  const handleDelete = async (reminderId: string) => {
    if (!confirm("Are you sure you want to delete this reminder?")) return;
    try {
      await deleteReminder(reminderId);
      showToast("Reminder deleted successfully");
    } catch {
      showToast("Failed to delete reminder");
    }
  };

  const activeReminders = reminders.filter((r) => r.active);
  const inactiveReminders = reminders.filter((r) => !r.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-ink-900">
            Daily Reminders &amp; Schedule
          </h3>
          <p className="text-sm text-ink-500">
            Medication, hydration, and activity reminders that sync to the patient&apos;s device.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => setIsAddOpen(true)}
        >
          <BellPlus size={14} /> Add Reminder
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-coral-200 bg-coral-50/40 p-3 text-sm text-coral-600 dark:border-coral-400/30">
          {error}
        </div>
      )}

      {editingReminder && (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-display text-sm font-semibold text-ink-900">
              Edit Reminder
            </h4>
          </div>
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
              className="h-24 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold text-ink-700">
              Active ({activeReminders.length})
            </h4>
            <ReminderList
              reminders={activeReminders}
              onEdit={setEditingReminder}
              onDelete={handleDelete}
              isDeleting={isDeleting}
              disabled={isDeleting}
            />
          </div>

          {inactiveReminders.length > 0 && (
            <div>
              <h4 className="mb-3 font-display text-sm font-semibold text-ink-700">
                Inactive ({inactiveReminders.length})
              </h4>
              <ReminderList
                reminders={inactiveReminders}
                onEdit={setEditingReminder}
                onDelete={handleDelete}
                isDeleting={isDeleting}
                disabled={isDeleting}
              />
            </div>
          )}
        </div>
      )}

      <AddReminderModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        patientId={patientId}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
