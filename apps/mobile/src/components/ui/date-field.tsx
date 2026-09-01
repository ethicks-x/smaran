import { useState } from "react";

import { FieldTrigger } from "@/components/ui/field-trigger";
import { SchedulePicker } from "@/components/ui/schedule-picker";
import { usesHour12 } from "@/components/ui/time-field";
import { useLocale } from "@/hooks/use-language";

export type DateFieldProps = {
	/** Always visible above the control, e.g. "Which day". */
	label: string;
	value: Date;
	onChange: (value: Date) => void;
	/** The earliest day worth offering. Defaults to today. */
	minimum?: Date;
};

/**
 * One date: the day written out on the form, and the platform's own calendar
 * behind it (`SchedulePicker`).
 *
 * The row says the weekday as well as the date — "Saturday, 5 September" —
 * because a reader deciding whether that is the right day is thinking in
 * weekdays, and a bare number would make them work it out.
 *
 * Nothing before today is offered. A reminder set for a day that has already
 * gone by would simply never appear, and the reader would have no way of
 * seeing why.
 */
export function DateField({ label, value, onChange, minimum }: DateFieldProps) {
	const locale = useLocale();
	const [open, setOpen] = useState(false);

	return (
		<>
			<FieldTrigger
				label={label}
				value={formatDate(value, locale)}
				onPress={() => setOpen(true)}
			/>

			<SchedulePicker
				visible={open}
				mode="date"
				title={label}
				value={value}
				hour12={usesHour12(locale)}
				minimum={minimum ?? new Date()}
				onChange={onChange}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}

/** The day in the language on screen, weekday first. */
export function formatDate(value: Date, locale: string): string {
	return value.toLocaleDateString(locale, {
		weekday: "long",
		day: "numeric",
		month: "long",
	});
}
