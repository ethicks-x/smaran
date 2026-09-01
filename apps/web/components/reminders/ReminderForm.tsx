"use client";

import { useState } from "react";
import type { ReminderApi, ReminderKind, ReminderCreateInput, ReminderUpdateInput } from "@/lib/types";

interface ReminderFormProps {
	onSubmit: (data: Record<string, any>) => Promise<void>;
	onCancel?: () => void;
	initialData?: ReminderApi;
	isLoading?: boolean;
}

const REMINDER_KINDS: ReminderKind[] = ["medicine", "hydration", "activity", "appointment"];

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
	const [kind, setKind] = useState<ReminderKind>(initialData?.kind || "medicine");
	const [title, setTitle] = useState(initialData?.title || "");
	const [detail, setDetail] = useState(initialData?.detail || "");
	const [time, setTime] = useState(
		initialData?.schedule?.split("|")[0] || "09:00"
	);
	const [daysMask, setDaysMask] = useState(
		initialData?.schedule?.split("|")[1] || "1111111"
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
		if (!/^[01]{7}$/.test(daysMask)) {
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

		const schedule = `${time}|${daysMask}`;
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
		<form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
			{error && (
				<div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
					{error}
				</div>
			)}

			{/* Kind */}
			<div>
				<label className="block text-sm font-medium text-gray-700">Type</label>
				<select
					value={kind}
					onChange={(e) => setKind(e.target.value as ReminderKind)}
					disabled={isLoading}
					className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-50"
				>
					{REMINDER_KINDS.map((k) => (
						<option key={k} value={k}>
							{KIND_LABELS[k]}
						</option>
					))}
				</select>
			</div>

			{/* Title */}
			<div>
				<label className="block text-sm font-medium text-gray-700">Title</label>
				<input
					type="text"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					disabled={isLoading}
					placeholder="e.g., Take blood pressure medication"
					maxLength={200}
					className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-50"
				/>
			</div>

			{/* Detail */}
			<div>
				<label className="block text-sm font-medium text-gray-700">
					Details (optional)
				</label>
				<textarea
					value={detail}
					onChange={(e) => setDetail(e.target.value)}
					disabled={isLoading}
					placeholder="e.g., Take with water after breakfast"
					maxLength={500}
					rows={3}
					className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-50"
				/>
			</div>

			{/* Time */}
			<div>
				<label className="block text-sm font-medium text-gray-700">Time</label>
				<input
					type="time"
					value={time}
					onChange={(e) => setTime(e.target.value)}
					disabled={isLoading}
					className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-50"
				/>
			</div>

			{/* Days */}
			<div>
				<label className="block text-sm font-medium text-gray-700">
					Repeat on
				</label>
				<div className="mt-2 flex flex-wrap gap-2">
					{daysOfWeek.map((day, index) => (
						<button
							key={day}
							type="button"
							onClick={() => handleDayToggle(index)}
							disabled={isLoading}
							className={`rounded px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
								daysMask[index] === "1"
									? "bg-blue-600 text-white"
									: "bg-gray-200 text-gray-700 hover:bg-gray-300"
							}`}
						>
							{day}
						</button>
					))}
				</div>
			</div>

			{/* Active toggle */}
			<div className="flex items-center">
				<input
					type="checkbox"
					id="active"
					checked={active}
					onChange={(e) => setActive(e.target.checked)}
					disabled={isLoading}
					className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
				/>
				<label htmlFor="active" className="ml-2 text-sm text-gray-700">
					Active reminder
				</label>
			</div>

			{/* Actions */}
			<div className="flex gap-3 pt-4">
				<button
					type="submit"
					disabled={isLoading}
					className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
				>
					{isLoading ? "Saving..." : "Save Reminder"}
				</button>
				{onCancel && (
					<button
						type="button"
						onClick={onCancel}
						disabled={isLoading}
						className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
					>
						Cancel
					</button>
				)}
			</div>
		</form>
	);
}
