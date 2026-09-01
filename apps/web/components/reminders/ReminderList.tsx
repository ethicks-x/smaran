"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import type { ReminderApi, ReminderKind } from "@/lib/types";

interface ReminderListProps {
	reminders: ReminderApi[];
	onEdit?: (reminder: ReminderApi) => void;
	onDelete?: (reminderId: string) => void;
	isDeleting?: boolean;
	disabled?: boolean;
}

const KIND_LABELS: Record<ReminderKind, string> = {
	medicine: "Medicine",
	hydration: "Hydration",
	activity: "Activity",
	appointment: "Appointment",
};

const KIND_TONES: Record<ReminderKind, "coral" | "indigo" | "mint" | "amber"> =
	{
		medicine: "coral",
		hydration: "indigo",
		activity: "mint",
		appointment: "amber",
	};

function parseSchedule(schedule: string): { time: string; days: string } {
	const [time, daysMask] = schedule.split("|");
	const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	const activeDays = daysMask
		.split("")
		.map((bit, i) => (bit === "1" ? daysOfWeek[i] : null))
		.filter(Boolean)
		.join(", ");

	return { time, days: activeDays || "Never" };
}

export function ReminderList({
	reminders,
	onEdit,
	onDelete,
	isDeleting = false,
	disabled = false,
}: ReminderListProps) {
	if (reminders.length === 0) {
		return (
			<div className="rounded-2xl border border-dashed border-black/15 dark:border-white/15 bg-surface p-8 text-center">
				<p className="text-sm text-ink-500">
					No reminders yet. Create one to get started.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{reminders.map((reminder) => {
				const { time, days } = parseSchedule(reminder.schedule);
				const isActive = reminder.active;

				return (
					<div
						key={reminder.id}
						className={`rounded-2xl border p-4 transition-opacity ${
							isActive
								? "border-black/[0.06] dark:border-white/[0.08] bg-surface shadow-[0_2px_8px_rgba(44,31,88,0.06)] dark:shadow-none"
								: "border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] opacity-60"
						}`}
					>
						<div className="flex items-start justify-between gap-3">
							<div className="flex-1">
								<div className="flex items-center gap-2">
									<Badge tone={KIND_TONES[reminder.kind]}>
										{KIND_LABELS[reminder.kind]}
									</Badge>
									{!isActive && (
										<span className="text-xs font-medium text-ink-500">
											(Inactive)
										</span>
									)}
								</div>
								<h3 className="mt-2 text-base font-semibold text-ink-900">
									{reminder.title}
								</h3>
								{reminder.detail && (
									<p className="mt-1 text-sm text-ink-500">{reminder.detail}</p>
								)}
								<div className="mt-2 flex gap-4 text-xs text-ink-500">
									<span>⏰ {time}</span>
									<span>📅 {days}</span>
								</div>
							</div>
							<div className="ml-4 flex gap-2">
								{onEdit && (
									<button
										type="button"
										onClick={() => onEdit(reminder)}
										disabled={disabled}
										className="rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-50 disabled:opacity-50"
										aria-label="Edit reminder"
									>
										Edit
									</button>
								)}
								{onDelete && (
									<button
										type="button"
										onClick={() => onDelete(reminder.id)}
										disabled={isDeleting || disabled}
										className="rounded-lg px-3 py-1.5 text-xs font-medium text-coral-500 hover:bg-coral-50 dark:hover:bg-coral-50 disabled:opacity-50"
										aria-label="Delete reminder"
									>
										Delete
									</button>
								)}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
