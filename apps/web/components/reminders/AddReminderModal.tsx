"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useApi } from "@/hooks/use-api";
import type {
  ReminderApi,
  ReminderCreateInput,
  ReminderUpdateInput,
} from "@/lib/types";
import { ReminderForm } from "./ReminderForm";

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onSuccess?: () => void;
}

export function AddReminderModal({
  isOpen,
  onClose,
  patientId,
  onSuccess,
}: AddReminderModalProps) {
  const api = useApi();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (
    data: ReminderCreateInput | ReminderUpdateInput,
  ) => {
    setLoading(true);
    try {
      await api<ReminderApi>(`/dashboard/patients/${patientId}/reminders`, {
        method: "POST",
        body: data as unknown as ReminderCreateInput,
      });

      showToast("Reminder created and synced to patient device");
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to create reminder",
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div
        className="w-full max-w-lg rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-surface p-6 shadow-2xl transition-all sm:p-7 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-ink-900">
              Add Patient Reminder
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Schedule medication, hydration, activity, or appointments that
              sync to the patient&apos;s app.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-500 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] hover:text-ink-900"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4">
          <ReminderForm
            onSubmit={handleCreate}
            onCancel={onClose}
            isLoading={loading}
          />
        </div>
      </div>
    </div>
  );
}
