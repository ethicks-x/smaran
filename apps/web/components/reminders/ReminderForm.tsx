"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type {
  ReminderApi,
  ReminderCreateInput,
  ReminderKind,
  ReminderUpdateInput,
} from "@/lib/types";

interface ReminderFormProps {
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
  initialData?: ReminderApi;
  isLoading?: boolean;
}

const REMINDER_KINDS: ReminderKind[] = [
  "medicine",
  "hydration",
  "activity",
  "appointment",
];

function todayIso(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const KIND_LABELS: Record<ReminderKind, string> = {
  medicine: "Medicine",
  hydration: "Hydration",
  activity: "Activity",
  appointment: "Appointment",
};

export function ReminderForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: ReminderFormProps) {
  const [kind, setKind] = useState<ReminderKind>(
    initialData?.kind || "medicine",
  );
  const [title, setTitle] = useState(initialData?.title || "");
  const [detail, setDetail] = useState(initialData?.detail || "");
  const [time, setTime] = useState(
    initialData?.schedule?.split(/[|@]/)[0] || "09:00",
  );
  // A reminder the patient set for a single day on their phone arrives as
  // `HH:MM@YYYY-MM-DD`. Editing it as a weekly one would quietly turn a one-off
  // appointment into something that repeats forever, so the form keeps the shape
  // it was given and lets it be changed deliberately.
  const [once, setOnce] = useState(
    initialData?.schedule?.includes("@") ?? false,
  );
  const [date, setDate] = useState(
    initialData?.schedule?.split("@")[1] || todayIso(),
  );
  const [daysMask, setDaysMask] = useState(
    (initialData?.schedule?.includes("|") &&
      initialData.schedule.split("|")[1]) ||
      "1111111",
  );
  const [active, setActive] = useState(initialData?.active !== false);
  const [error, setError] = useState<string | null>(null);

  const handleDayToggle = (index: number) => {
    const days = daysMask.split("");
    days[index] = days[index] === "1" ? "0" : "1";
    setDaysMask(days.join(""));
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      setError("Title is required");
      return false;
    }
    if (title.length > 200) {
      setError("Title must be 200 characters or less");
      return false;
    }
    if (detail && detail.length > 500) {
      setError("Details must be 500 characters or less");
      return false;
    }
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(time)) {
      setError("Invalid time format (use HH:MM)");
      return false;
    }
    if (once) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        setError("Pick the day this reminder happens on");
        return false;
      }
    } else if (!/^[01]{7}$/.test(daysMask)) {
      setError("Invalid days selection");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    const schedule = once ? `${time}@${date}` : `${time}|${daysMask}`;
    const data: ReminderCreateInput | ReminderUpdateInput = {
      kind,
      title,
      detail: detail || null,
      schedule,
      active,
    };

    try {
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save reminder");
    }
  };

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-surface p-6 shadow-[0_2px_8px_rgba(44,31,88,0.06)] dark:shadow-none"
    >
      {error && (
        <div className="rounded-xl border border-coral-200 bg-coral-50/40 p-3 text-sm text-coral-600 dark:border-coral-400/30">
          {error}
        </div>
      )}

      {/* Kind */}
      <div>
        <label
          htmlFor="kind-select-elem"
          className="block text-sm font-medium text-ink-700"
        >
          Type
        </label>
        <select
          id="kind-select-elem"
          value={kind}
          onChange={(e) => setKind(e.target.value as ReminderKind)}
          disabled={isLoading}
          className="mt-1 block w-full rounded-xl border border-black/10 dark:border-white/10 bg-surface px-3 py-2 text-sm text-ink-900 focus:border-indigo-400 focus:outline-none disabled:bg-black/5 dark:disabled:bg-white/5"
        >
          {REMINDER_KINDS.map((k) => (
            <option key={k} value={k} className="bg-surface text-ink-900">
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div>
        <label
          htmlFor="title-input"
          className="block text-sm font-medium text-ink-700"
        >
          Title
        </label>
        <input
          id="title-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isLoading}
          placeholder="e.g., Take blood pressure medication"
          maxLength={200}
          className="mt-1 block w-full rounded-xl border border-black/10 dark:border-white/10 bg-surface px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:border-indigo-400 focus:outline-none disabled:bg-black/5 dark:disabled:bg-white/5"
        />
      </div>

      {/* Detail */}
      <div>
        <label
          htmlFor="details-input"
          className="block text-sm font-medium text-ink-700"
        >
          Details (optional)
        </label>
        <textarea
          id="details-input"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          disabled={isLoading}
          placeholder="e.g., Take with water after breakfast"
          maxLength={500}
          rows={3}
          className="mt-1 block w-full rounded-xl border border-black/10 dark:border-white/10 bg-surface px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:border-indigo-400 focus:outline-none disabled:bg-black/5 dark:disabled:bg-white/5"
        />
      </div>

      {/* Time */}
      <div>
        <label
          htmlFor="time-input"
          className="block text-sm font-medium text-ink-700"
        >
          Time
        </label>
        <input
          id="time-input"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          disabled={isLoading}
          className="mt-1 block w-full rounded-xl border border-black/10 dark:border-white/10 bg-surface px-3 py-2 text-sm text-ink-900 focus:border-indigo-400 focus:outline-none disabled:bg-black/5 dark:disabled:bg-white/5"
        />
      </div>

      {/* Repeat */}
      <div>
        <label
          htmlFor="repeat-select"
          className="block text-sm font-medium text-ink-700"
        >
          Repeats
        </label>
        <select
          id="repeat-select"
          value={once ? "once" : "weekly"}
          onChange={(e) => setOnce(e.target.value === "once")}
          disabled={isLoading}
          className="mt-1 block w-full rounded-xl border border-black/10 dark:border-white/10 bg-surface px-3 py-2 text-sm text-ink-900 focus:border-indigo-400 focus:outline-none disabled:bg-black/5 dark:disabled:bg-white/5"
        >
          <option value="weekly" className="bg-surface text-ink-900">
            Every week, on chosen days
          </option>
          <option value="once" className="bg-surface text-ink-900">
            Once, on a single day
          </option>
        </select>
      </div>

      {/* Date */}
      {once && (
        <div>
          <label
            htmlFor="date-input"
            className="block text-sm font-medium text-ink-700"
          >
            Day
          </label>
          <input
            id="date-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isLoading}
            className="mt-1 block w-full rounded-xl border border-black/10 dark:border-white/10 bg-surface px-3 py-2 text-sm text-ink-900 focus:border-indigo-400 focus:outline-none disabled:bg-black/5 dark:disabled:bg-white/5"
          />
        </div>
      )}

      {/* Days */}
      {!once && (
        <div>
          <label
            htmlFor="day-sel-btn"
            className="block text-sm font-medium text-ink-700"
          >
            Repeat on
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {daysOfWeek.map((day, index) => (
              <button
                id="day-sel-btn"
                key={day}
                type="button"
                onClick={() => handleDayToggle(index)}
                disabled={isLoading}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  daysMask[index] === "1"
                    ? "bg-indigo-600 dark:bg-indigo-400 text-white dark:text-ink-900"
                    : "bg-black/[0.04] dark:bg-white/[0.06] text-ink-700 hover:bg-black/[0.08] dark:hover:bg-white/[0.1]"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active toggle */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="active"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          disabled={isLoading}
          className="h-4 w-4 rounded border-black/20 dark:border-white/20 text-indigo-600 accent-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
        />
        <label htmlFor="active" className="ml-2 text-sm text-ink-700">
          Active reminder
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Saving..." : "Save Reminder"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
