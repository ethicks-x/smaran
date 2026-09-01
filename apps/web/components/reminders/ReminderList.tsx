"use client";

import { useState } from "react";
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

const KIND_COLORS: Record<ReminderKind, string> = {
	medicine: "bg-red-100 text-red-800",
	hydration: "bg-blue-100 text-blue-800",
	activity: "bg-green-100 text-green-800",
	appointment: "bg-purple-100 text-purple-800",
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
			<div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
				<p className="text-gray-600">No reminders yet. Create one to get started.</p>
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
						className={`rounded-lg border p-4 transition-opacity ${
							isActive
								? "border-gray-200 bg-white"
								: "border-gray-200 bg-gray-50 opacity-60"
						}`}
					>
						<div className="flex items-start justify-between">
							<div className="flex-1">
								<div className="flex items-center gap-2">
									<span
										className={`inline-block rounded px-2 py-1 text-xs font-semibold ${
											KIND_COLORS[reminder.kind]
										}`}
									>
										{KIND_LABELS[reminder.kind]}
									</span>
									{!isActive && (
										<span className="text-xs font-medium text-gray-500">
											(Inactive)
										</span>
									)}
								</div>
								<h3 className="mt-2 text-base font-semibold text-gray-900">
									{reminder.title}
								</h3>
								{reminder.detail && (
									<p className="mt-1 text-sm text-gray-600">{reminder.detail}</p>
								)}
								<div className="mt-2 flex gap-4 text-xs text-gray-500">
									<span>⏰ {time}</span>
									<span>📅 {days}</span>
								</div>
							</div>
							<div className="ml-4 flex gap-2">
								{onEdit && (
									<button
										onClick={() => onEdit(reminder)}
										disabled={disabled}
										className="rounded px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
										aria-label="Edit reminder"
									>
										Edit
									</button>
								)}
								{onDelete && (
									<button
										onClick={() => onDelete(reminder.id)}
										disabled={isDeleting || disabled}
										className="rounded px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
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
