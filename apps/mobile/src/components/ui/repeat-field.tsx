import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useLocale } from "@/hooks/use-language";
import { useThemeColors } from "@/hooks/use-theme";
import { Radius, Spacing, TouchTarget } from "@/theme";

/** Sunday first, matching `Date#getDay` and the stored days mask. */
const WEEK = [0, 1, 2, 3, 4, 5, 6];

/** Any Sunday will do: this one only exists to be asked for its day names. */
const A_SUNDAY = new Date(2024, 0, 7);

export type RepeatFieldProps = {
	/** Names the question, e.g. "Which days". */
	label: string;
	/** The days it repeats on. 0 is Sunday. */
	value: readonly number[];
	onChange: (days: readonly number[]) => void;
};

/**
 * Which days a reminder comes back on: seven round buttons, one per day, with
 * the answer written out in words above them.
 *
 * The circles are the same shape every alarm clock uses, which is the point —
 * this is a control the reader has met before. What they cannot do here is
 * switch the last day off: a reminder on no days is one that never arrives
 * again, and the reader would have no way of seeing that had happened. So the
 * tap that would empty the week is ignored rather than refused, and nothing is
 * said about it.
 *
 * The day names come from the language on screen rather than the phone's, the
 * same rule the date on Today follows.
 */
export function RepeatField({ label, value, onChange }: RepeatFieldProps) {
	const { t } = useTranslation();
	const locale = useLocale();
	const colors = useThemeColors();

	// The three sets worth naming are named — a reader should not have to add up
	// seven circles to see that it is every day — and anything else is listed.
	const named = nameFor(value);

	const toggle = (day: number) => {
		if (value.includes(day)) {
			if (value.length === 1) {
				return;
			}

			onChange(value.filter((chosen) => chosen !== day));
			return;
		}

		onChange([...value, day].sort((a, b) => a - b));
	};

	return (
		<View style={styles.field}>
			<Text variant="caption" color="textSecondary">
				{label}
			</Text>

			<Text variant="bodyLarge">
				{named
					? t(`common.${named}`)
					: value.map((day) => dayName(day, locale, "short")).join(", ")}
			</Text>

			<View style={styles.week}>
				{WEEK.map((day) => {
					const chosen = value.includes(day);

					return (
						<Pressable
							key={day}
							onPress={() => toggle(day)}
							accessibilityRole="checkbox"
							accessibilityLabel={dayName(day, locale, "long")}
							accessibilityState={{ checked: chosen }}
							style={({ pressed }) => [
								styles.day,
								{
									backgroundColor: chosen
										? colors.primary
										: colors.surfaceMuted,
									borderColor: chosen ? colors.primary : colors.border,
								},
								pressed && styles.pressed,
							]}
						>
							<Text
								variant="caption"
								center
								color={chosen ? "onPrimary" : "text"}
								style={chosen && styles.chosenLabel}
							>
								{dayName(day, locale, "narrow")}
							</Text>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}

/** The name for a set of days, if it has one worth saying. */
function nameFor(
	days: readonly number[],
): "everyDay" | "weekdays" | "weekends" | null {
	if (days.length === 7) {
		return "everyDay";
	}

	if (days.length === 5 && [1, 2, 3, 4, 5].every((day) => days.includes(day))) {
		return "weekdays";
	}

	if (days.length === 2 && days.includes(0) && days.includes(6)) {
		return "weekends";
	}

	return null;
}

function dayName(
	day: number,
	locale: string,
	length: "narrow" | "short" | "long",
): string {
	const date = new Date(A_SUNDAY);

	date.setDate(date.getDate() + day);

	return date.toLocaleDateString(locale, { weekday: length });
}

const styles = StyleSheet.create({
	field: {
		gap: Spacing.xs,
	},
	week: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: Spacing.xs,
		marginTop: Spacing.xs,
	},
	day: {
		width: TouchTarget.min,
		height: TouchTarget.min,
		flexShrink: 1,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: Radius.pill,
		borderWidth: 2,
	},
	chosenLabel: {
		fontWeight: "700",
	},
	pressed: {
		opacity: 0.9,
	},
});
