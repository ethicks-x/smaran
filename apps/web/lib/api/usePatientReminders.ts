"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ReminderApi,
  ReminderCreateInput,
  ReminderUpdateInput,
} from "@/lib/types";
import { useApi } from "./client";

interface UsePatientRemindersResult {
  reminders: ReminderApi[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createReminder: (data: ReminderCreateInput) => Promise<ReminderApi>;
  updateReminder: (
    reminderId: string,
    data: ReminderUpdateInput,
  ) => Promise<ReminderApi>;
  deleteReminder: (reminderId: string) => Promise<void>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

export function usePatientReminders(
  patientId: string,
): UsePatientRemindersResult {
  const { apiFetch } = useApi();
  const [reminders, setReminders] = useState<ReminderApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchReminders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<ReminderApi[]>(
        `/dashboard/patients/${patientId}/reminders?include_inactive=true`,
      );
      setReminders(res);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load reminders";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [patientId, apiFetch]);

  const refetch = async () => {
    await fetchReminders();
  };

  const createReminder = async (
    data: ReminderCreateInput,
  ): Promise<ReminderApi> => {
    try {
      setIsCreating(true);
      const res = await apiFetch<ReminderApi>(
        `/dashboard/patients/${patientId}/reminders`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
      setReminders((prev) => [...prev, res]);
      return res;
    } finally {
      setIsCreating(false);
    }
  };

  const updateReminder = async (
    reminderId: string,
    data: ReminderUpdateInput,
  ): Promise<ReminderApi> => {
    try {
      setIsUpdating(true);
      const res = await apiFetch<ReminderApi>(
        `/dashboard/patients/${patientId}/reminders/${reminderId}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      );
      setReminders((prev) => prev.map((r) => (r.id === reminderId ? res : r)));
      return res;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteReminder = async (reminderId: string): Promise<void> => {
    try {
      setIsDeleting(true);
      await apiFetch(
        `/dashboard/patients/${patientId}/reminders/${reminderId}`,
        {
          method: "DELETE",
        },
      );
      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchReminders();
    }
  }, [patientId, fetchReminders]);

  return {
    reminders,
    loading,
    error,
    refetch,
    createReminder,
    updateReminder,
    deleteReminder,
    isCreating,
    isUpdating,
    isDeleting,
  };
}
