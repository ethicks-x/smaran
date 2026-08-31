import { Icon } from "@expo/ui";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";

import { AppIcons } from "@/components/ui/icons";
import { NativeHost } from "@/components/ui/native-host";
import { Text } from "@/components/ui/text";
import { useLocale } from "@/hooks/use-language";
import { useThemeColors } from "@/hooks/use-theme";
import { Radius, Spacing, scale, TouchTarget } from "@/theme";

const STEP_ICON = scale(30);

/** Minutes move in fives: nothing this app reminds anyone of needs finer. */
const MINUTE_STEP = 5;

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
 * A time of day, chosen with four large buttons.
 *
 * Every other way of picking a time is a spinning wheel or a dragged dial, and
 * both are the one gesture a hand with a tremor cannot reliably finish. Here an
 * hour and five minutes are each a whole-finger target that only has to be
 * tapped, and both wrap around, so nothing can be over- or under-shot into a
 * dead end.
 *
 * The time itself is written out large, in the language on screen — so a reader
 * who cannot make out which button did what can still read the answer.
 */
export function TimeField({ label, value, onChange }: TimeFieldProps) {
	const { t } = useTranslation();
	const colors = useThemeColors();
	const locale = useLocale();

	const shift = (hours: number, minutes: number) => {
		const total =
			(value.hour * 60 + value.minute + hours * 60 + minutes + 24 * 60) %
			(24 * 60);

		onChange({ hour: Math.floor(total / 60), minute: total % 60 });
	};

	return (
		<View style={styles.field}>
			<Text variant="caption" color="textSecondary">
				{label}
			</Text>

			<View
				style={[
					styles.control,
					{ backgroundColor: colors.surfaceMuted, borderColor: colors.border },
				]}
			>
				<View style={styles.column}>
					<Step
						icon="chevronUp"
						label={t("common.hourLater")}
						onPress={() => shift(1, 0)}
					/>
					<Text variant="caption" color="textSecondary">
						{t("common.hour")}
					</Text>
					<Step
						icon="chevronDown"
						label={t("common.hourEarlier")}
						onPress={() => shift(-1, 0)}
					/>
				</View>

				<Text variant="display" center style={styles.reading}>
					{formatTime(value, locale)}
				</Text>

				<View style={styles.column}>
					<Step
						icon="chevronUp"
						label={t("common.minutesLater")}
						onPress={() => shift(0, MINUTE_STEP)}
					/>
					<Text variant="caption" color="textSecondary">
						{t("common.minutes")}
					</Text>
					<Step
						icon="chevronDown"
						label={t("common.minutesEarlier")}
						onPress={() => shift(0, -MINUTE_STEP)}
					/>
				</View>
			</View>
		</View>
	);
}

type StepProps = {
	icon: "chevronUp" | "chevronDown";
	/** Says what the button does in words — the arrow is never the only cue. */
	label: string;
	onPress: () => void;
};

function Step({ icon, label, onPress }: StepProps) {
	const colors = useThemeColors();

	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={label}
			style={({ pressed }) => [
				styles.step,
				{ backgroundColor: colors.surface, borderColor: colors.border },
				pressed && styles.pressed,
			]}
		>
			<NativeHost>
				<Icon name={AppIcons[icon]} size={STEP_ICON} color={colors.primary} />
			</NativeHost>
		</Pressable>
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

const styles = StyleSheet.create({
	field: {
		gap: Spacing.xs,
	},
	control: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: Spacing.md,
		padding: Spacing.md,
		borderRadius: Radius.md,
		borderWidth: 2,
	},
	column: {
		alignItems: "center",
		gap: Spacing.xs,
	},
	step: {
		width: TouchTarget.min,
		height: TouchTarget.min,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: Radius.md,
		borderWidth: 2,
	},
	reading: {
		flex: 1,
	},
	pressed: {
		opacity: 0.6,
	},
});
