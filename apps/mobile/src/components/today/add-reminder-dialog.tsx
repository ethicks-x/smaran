import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import {
	ActionButton,
	type Choice,
	ChoiceGroup,
	Dialog,
	Text,
	TextField,
	TimeField,
	type TimeOfDay,
} from "@/components/ui";
import type { ReminderKind } from "@/db/schema";
import { EveryDay, type NewReminder } from "@/lib/reminders";
import { Spacing } from "@/theme";

const KINDS: readonly ReminderKind[] = [
	"medicine",
	"hydration",
	"activity",
	"appointment",
];

export type AddReminderDialogProps = {
	visible: boolean;
	/** The way out without adding anything. Android's back gesture lands here. */
	onClose: () => void;
	onAdd: (reminder: NewReminder) => void;
};

/**
 * Adding a reminder, asked as three questions on one card: what it is for, what
 * it should say, and when.
 *
 * Every question is answered by tapping except the words themselves, and the
 * words start out already filled in from the kind — so a reader who wants
 * "Medicine, every day at nine" never has to open the keyboard at all. Nothing
 * here is required of them twice, and nothing is validated at them: the only
 * way to get it wrong is to leave the words empty, and then the button is
 * simply not offered yet.
 *
 * It repeats every day. A days-of-the-week picker is a fourth question for a
 * reader who is answering three, and the schedule format already carries the
 * mask for when the caregiver dashboard starts sending definitions down.
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

	const options: readonly Choice<ReminderKind>[] = KINDS.map((value) => ({
		value,
		label: t(`today.kinds.${value}`),
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
	};

	const close = () => {
		reset();
		onClose();
	};

	const add = () => {
		onAdd({
			kind,
			title,
			schedule: { hour: time.hour, minute: time.minute, days: EveryDay },
		});
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
					<View style={styles.question}>
						<Text variant="caption" color="textSecondary">
							{t("today.add.kindLabel")}
						</Text>
						<ChoiceGroup
							label={t("today.add.kindLabel")}
							options={options}
							value={kind}
							onChange={chooseKind}
						/>
					</View>

					<TextField
						label={t("today.add.nameLabel")}
						hint={t("today.add.nameHint")}
						value={title}
						onChangeText={(next) => {
							setWritten(true);
							setTitle(next);
						}}
					/>

					<TimeField
						label={t("today.add.timeLabel")}
						value={time}
						onChange={setTime}
					/>
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

const styles = StyleSheet.create({
	form: {
		alignSelf: "stretch",
		gap: Spacing.lg,
	},
	question: {
		gap: Spacing.xs,
	},
});
