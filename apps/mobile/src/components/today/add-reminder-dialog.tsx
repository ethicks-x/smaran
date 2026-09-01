import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import {
	ActionButton,
	DateField,
	Dialog,
	RepeatField,
	SelectField,
	type SelectOption,
	TextField,
	TimeField,
	type TimeOfDay,
} from "@/components/ui";
import type { ReminderKind } from "@/db/schema";
import {
	EveryDay,
	localDate,
	type NewReminder,
	type ReminderSchedule,
} from "@/lib/reminders";
import { Spacing } from "@/theme";

const KINDS: readonly ReminderKind[] = [
	"medicine",
	"hydration",
	"activity",
	"appointment",
];

/** How often a reminder comes back, as the card asks it. */
type Repeat = "everyDay" | "someDays" | "once";

const REPEATS: readonly Repeat[] = ["everyDay", "someDays", "once"];

export type AddReminderDialogProps = {
	visible: boolean;
	/** The way out without adding anything. Android's back gesture lands here. */
	onClose: () => void;
	onAdd: (reminder: NewReminder) => void;
};

/**
 * Adding a reminder, asked as four questions on one card: what it should say,
 * what it is for, what time, and how often.
 *
 * Every question but the words themselves is answered by tapping, and the words
 * start out already filled in from the kind — so a reader who wants "Medicine,
 * every day at nine" never has to open the keyboard at all. Nothing here is
 * required of them twice, and nothing is validated at them: the only way to get
 * it wrong is to leave the words empty, and then the button is simply not
 * offered yet.
 *
 * The words come first because they are the one answer nothing else can supply,
 * and because the kind is a suggestion for them — a question that arrives after
 * the thing it is suggesting has already been written would be the wrong way
 * round.
 *
 * "How often" only opens what it needs: the days matter when some of them are
 * chosen, and the date matters when the reminder happens once. A reader taking
 * the default answer sees three rows and a button.
 */
export function AddReminderDialog({
	visible,
	onClose,
	onAdd,
}: AddReminderDialogProps) {
	const { t } = useTranslation();

	const [kind, setKind] = useState<ReminderKind>("medicine");
	const [title, setTitle] = useState(() => t("today.kinds.medicine"));
	// Once the reader has written their own words, the kind stops overwriting
	// them — their sentence outranks our suggestion.
	const [written, setWritten] = useState(false);
	const [time, setTime] = useState<TimeOfDay>(nextHour);
	const [repeat, setRepeat] = useState<Repeat>("everyDay");
	const [days, setDays] = useState<readonly number[]>(EveryDay);
	const [date, setDate] = useState<Date>(today);

	const kinds: readonly SelectOption<ReminderKind>[] = KINDS.map((value) => ({
		value,
		label: t(`today.kinds.${value}`),
	}));

	const repeats: readonly SelectOption<Repeat>[] = REPEATS.map((value) => ({
		value,
		label: t(`today.add.repeats.${value}`),
	}));

	const chooseKind = (next: ReminderKind) => {
		setKind(next);

		if (!written) {
			setTitle(t(`today.kinds.${next}`));
		}
	};

	const reset = () => {
		setKind("medicine");
		setTitle(t("today.kinds.medicine"));
		setWritten(false);
		setTime(nextHour());
		setRepeat("everyDay");
		setDays(EveryDay);
		setDate(today());
	};

	const close = () => {
		reset();
		onClose();
	};

	const add = () => {
		const schedule: ReminderSchedule =
			repeat === "once"
				? { hour: time.hour, minute: time.minute, date: localDate(date) }
				: {
						hour: time.hour,
						minute: time.minute,
						days: repeat === "everyDay" ? EveryDay : days,
					};

		onAdd({ kind, title, schedule });
		close();
	};

	return (
		<Dialog
			visible={visible}
			icon="reminder"
			title={t("today.add.title")}
			message={t("today.add.message")}
			onRequestClose={close}
			details={
				<View style={styles.form}>
					<TextField
						label={t("today.add.nameLabel")}
						hint={t("today.add.nameHint")}
						value={title}
						onChangeText={(next) => {
							setWritten(true);
							setTitle(next);
						}}
					/>

					<SelectField
						label={t("today.add.kindLabel")}
						options={kinds}
						value={kind}
						onChange={chooseKind}
					/>

					<TimeField
						label={t("today.add.timeLabel")}
						value={time}
						onChange={setTime}
					/>

					<SelectField
						label={t("today.add.repeatLabel")}
						options={repeats}
						value={repeat}
						onChange={setRepeat}
					/>

					{repeat === "someDays" ? (
						<RepeatField
							label={t("today.add.daysLabel")}
							value={days}
							onChange={setDays}
						/>
					) : null}

					{repeat === "once" ? (
						<DateField
							label={t("today.add.dateLabel")}
							value={date}
							onChange={setDate}
						/>
					) : null}
				</View>
			}
		>
			<ActionButton
				label={t("today.add.save")}
				onPress={add}
				disabled={title.trim().length === 0}
			/>
			<ActionButton label={t("common.cancel")} variant="text" onPress={close} />
		</Dialog>
	);
}

/** The top of the coming hour: near enough to be useful, round enough to read. */
function nextHour(): TimeOfDay {
	return { hour: (new Date().getHours() + 1) % 24, minute: 0 };
}

/** Today, at midnight — a one-off reminder takes its time from the time field. */
function today(): Date {
	const day = new Date();

	day.setHours(0, 0, 0, 0);

	return day;
}

const styles = StyleSheet.create({
	form: {
		alignSelf: "stretch",
		gap: Spacing.lg,
	},
});
