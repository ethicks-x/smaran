import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { ActionButton } from "@/components/ui/action-button";
import { Dialog } from "@/components/ui/dialog";
import type { SchedulePickerProps } from "@/components/ui/schedule-picker-props";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { useLocale } from "@/hooks/use-language";
import { Spacing } from "@/theme";

/** Minutes move in fives: nothing this app reminds anyone of needs finer. */
const MINUTE_STEP = 5;

/** How far ahead a reminder may be set. Nobody is booking 2031 from this card. */
const YEARS_AHEAD = 2;

export type { SchedulePickerProps };

/**
 * A date or a time of day, picked with the platform's own controls.
 *
 * This is the fallback that iOS and web get: dropdowns, one per part, in a card
 * of our own. Android replaces the whole file with `schedule-picker.android.tsx`
 * and the Material 3 date and time dialogs — see D-43.
 *
 * Every part is a dropdown rather than a wheel or a dial for the reason D-25
 * gives: a spun rotor is the one gesture a hand with a tremor cannot reliably
 * finish. Each change lands on the value straight away, so the card can be left
 * by the one button on it and there is nothing to lose by closing it.
 */
export function SchedulePicker({
	visible,
	mode,
	value,
	title,
	hour12,
	minimum,
	onChange,
	onClose,
}: SchedulePickerProps) {
	const { t } = useTranslation();
	const locale = useLocale();

	return (
		<Dialog
			visible={visible}
			icon={mode === "date" ? "appointment" : "schedule"}
			title={title}
			onRequestClose={onClose}
			details={
				<View style={styles.parts}>
					{mode === "time" ? (
						<TimeParts
							value={value}
							hour12={hour12}
							labels={{ hour: t("common.hour"), minute: t("common.minutes") }}
							periods={[t("common.am"), t("common.pm")]}
							half={t("common.halfOfDay")}
							onChange={onChange}
						/>
					) : (
						<DateParts
							value={value}
							locale={locale}
							minimum={minimum}
							labels={{
								day: t("common.day"),
								month: t("common.month"),
								year: t("common.year"),
							}}
							onChange={onChange}
						/>
					)}
				</View>
			}
		>
			<ActionButton label={t("common.done")} onPress={onClose} />
		</Dialog>
	);
}

type TimePartsProps = {
	value: Date;
	hour12: boolean;
	labels: { hour: string; minute: string };
	periods: [string, string];
	half: string;
	onChange: (value: Date) => void;
};

function TimeParts({
	value,
	hour12,
	labels,
	periods,
	half,
	onChange,
}: TimePartsProps) {
	const hour = value.getHours();
	const afternoon = hour >= 12;

	const at = (hours: number, minutes: number) => {
		const next = new Date(value);

		next.setHours(hours, minutes, 0, 0);
		onChange(next);
	};

	// Midnight and noon are both "12" on a clock face, not "0".
	const hours = hour12
		? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
		: Array.from({ length: 24 }, (_, index) => index);

	return (
		<>
			<SelectField
				label={labels.hour}
				options={hours.map((value) => ({ value, label: String(value) }))}
				value={hour12 ? (hour % 12 === 0 ? 12 : hour % 12) : hour}
				onChange={(next) =>
					at(
						hour12 ? (next % 12) + (afternoon ? 12 : 0) : next,
						value.getMinutes(),
					)
				}
			/>

			<SelectField
				label={labels.minute}
				options={Array.from({ length: 60 / MINUTE_STEP }, (_, index) => {
					const minute = index * MINUTE_STEP;

					return { value: minute, label: pad(minute) };
				})}
				value={value.getMinutes() - (value.getMinutes() % MINUTE_STEP)}
				onChange={(minute) => at(hour, minute)}
			/>

			{hour12 ? (
				<SelectField
					label={half}
					options={[
						{ value: 0, label: periods[0] },
						{ value: 1, label: periods[1] },
					]}
					value={afternoon ? 1 : 0}
					onChange={(next) =>
						at((hour % 12) + (next === 1 ? 12 : 0), value.getMinutes())
					}
				/>
			) : null}
		</>
	);
}

type DatePartsProps = {
	value: Date;
	locale: string;
	minimum?: Date;
	labels: { day: string; month: string; year: string };
	onChange: (value: Date) => void;
};

function DateParts({
	value,
	locale,
	minimum,
	labels,
	onChange,
}: DatePartsProps) {
	const floor = minimum ?? value;
	const year = value.getFullYear();
	const month = value.getMonth();

	// Nothing before the floor is offered, so the reader cannot pick a day that
	// has already gone by and then wait for a reminder that will never come.
	const firstYear = Math.min(floor.getFullYear(), year);
	const firstMonth = year === floor.getFullYear() ? floor.getMonth() : 0;
	const firstDay =
		year === floor.getFullYear() && month === floor.getMonth()
			? floor.getDate()
			: 1;

	const at = (nextYear: number, nextMonth: number, nextDay: number) => {
		const next = new Date(value);

		// A 31st that survives a move to a 30-day month would silently roll into the
		// month after it, so it is clamped to the last day the reader can see.
		next.setFullYear(
			nextYear,
			nextMonth,
			Math.min(nextDay, daysIn(nextYear, nextMonth)),
		);

		// Changing the year can land the day behind the floor — last September, when
		// the floor is this one. The floor itself is the nearest answer to what the
		// reader just asked for, so that is where it lands rather than nowhere.
		if (dayNumber(next) < dayNumber(floor)) {
			next.setFullYear(floor.getFullYear(), floor.getMonth(), floor.getDate());
		}

		onChange(next);
	};

	const options = (
		from: number,
		to: number,
		label: (value: number) => string,
	): SelectOption<number>[] =>
		Array.from({ length: to - from + 1 }, (_, index) => ({
			value: from + index,
			label: label(from + index),
		}));

	return (
		<>
			<SelectField
				label={labels.day}
				options={options(firstDay, daysIn(year, month), String)}
				value={value.getDate()}
				onChange={(day) => at(year, month, day)}
			/>

			<SelectField
				label={labels.month}
				options={options(firstMonth, 11, (index) => monthName(index, locale))}
				value={month}
				onChange={(next) => at(year, next, value.getDate())}
			/>

			<SelectField
				label={labels.year}
				options={options(firstYear, firstYear + YEARS_AHEAD, String)}
				value={year}
				onChange={(next) => at(next, month, value.getDate())}
			/>
		</>
	);
}

/** A date as one comparable number, with the time of day left out of it. */
const dayNumber = (day: Date) =>
	day.getFullYear() * 10000 + day.getMonth() * 100 + day.getDate();

/** Day 0 of the next month is the last day of this one. */
const daysIn = (year: number, month: number) =>
	new Date(year, month + 1, 0).getDate();

const monthName = (month: number, locale: string) =>
	new Date(2024, month, 1).toLocaleDateString(locale, { month: "long" });

const pad = (value: number) => String(value).padStart(2, "0");

const styles = StyleSheet.create({
	parts: {
		alignSelf: "stretch",
		gap: Spacing.lg,
	},
});
