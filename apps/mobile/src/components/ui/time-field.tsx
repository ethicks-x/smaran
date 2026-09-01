import { useState } from "react";

import { FieldTrigger } from "@/components/ui/field-trigger";
import { SchedulePicker } from "@/components/ui/schedule-picker";
import { useLocale } from "@/hooks/use-language";

export type TimeOfDay = {
	/** 0 - 23, local time. */
	hour: number;
	/** 0 - 59, local time. */
	minute: number;
};

export type TimeFieldProps = {
	/** Always visible above the control, e.g. "What time". */
	label: string;
	value: TimeOfDay;
	onChange: (value: TimeOfDay) => void;
};

/**
 * A time of day: the answer written out on the form, and the platform's own
 * clock behind it (`SchedulePicker`).
 *
 * The row is the whole control until it is tapped. The time on it is written in
 * the language on screen, large, so a reader who never opens the picker can
 * still read what the reminder is set to.
 */
export function TimeField({ label, value, onChange }: TimeFieldProps) {
	const locale = useLocale();
	const [open, setOpen] = useState(false);

	const at = new Date();

	at.setHours(value.hour, value.minute, 0, 0);

	return (
		<>
			<FieldTrigger
				label={label}
				value={formatTime(value, locale)}
				variant="title"
				onPress={() => setOpen(true)}
			/>

			<SchedulePicker
				visible={open}
				mode="time"
				title={label}
				value={at}
				hour12={usesHour12(locale)}
				onChange={(picked) =>
					onChange({ hour: picked.getHours(), minute: picked.getMinutes() })
				}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}

/**
 * The time in the language on screen, not the one the phone is set to — the
 * same rule the date on Today follows, and for the same reason.
 */
export function formatTime(value: TimeOfDay | number, locale: string): string {
	const at =
		typeof value === "number"
			? new Date(value)
			: new Date(new Date().setHours(value.hour, value.minute, 0, 0));

	return at.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

/**
 * Whether this language writes 9 pm rather than 21:00.
 *
 * The picker has to be told, because a Material clock set to the wrong one
 * would disagree with the time written on the row above it. `resolvedOptions`
 * is the only place that answer lives, and it is not on every engine — the
 * twelve-hour clock is the safer guess for the languages Smaran speaks.
 */
export function usesHour12(locale: string): boolean {
	try {
		return (
			new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions()
				.hour12 ?? true
		);
	} catch {
		return true;
	}
}
