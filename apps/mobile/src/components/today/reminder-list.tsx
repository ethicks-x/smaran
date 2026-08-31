import { Icon } from "@expo/ui";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { KIND_ICON } from "@/components/today/kinds";
import {
	AppIcons,
	formatTime,
	NativeHost,
	Surface,
	Text,
} from "@/components/ui";
import { useLocale } from "@/hooks/use-language";
import { useThemeColors } from "@/hooks/use-theme";
import type { ReminderOccurrence } from "@/lib/reminders";
import { Radius, Spacing, scale, TouchTarget } from "@/theme";

const BADGE_SIZE = scale(48);
const BADGE_ICON = scale(26);
const CHECK_SIZE = scale(28);

export type ReminderListProps = {
	occurrences: readonly ReminderOccurrence[];
};

/**
 * The rest of the day, as one card of rows rather than a card each.
 *
 * A stack of separate cards spends most of the screen on the gaps between them,
 * and every one of them looks as important as the next — which is the opposite
 * of what this screen is for. Grouped behind one edge with hairline dividers,
 * the day reads as a list in time order and the card above it stays the thing
 * being asked about.
 *
 * Nothing here is tappable. Only the next reminder can be marked done, and it
 * has the button; a row is here to be read, and its tick is the answer to "have
 * I taken it yet?" — which is the question this screen exists to settle.
 */
export function ReminderList({ occurrences }: ReminderListProps) {
	const { t } = useTranslation();
	const colors = useThemeColors();
	const locale = useLocale();

	return (
		<Surface padded={false} style={styles.card}>
			{occurrences.map((occurrence, index) => {
				const done = occurrence.doneAt !== null;

				return (
					<View key={occurrence.id}>
						{index > 0 ? (
							<View
								style={[styles.divider, { backgroundColor: colors.border }]}
							/>
						) : null}

						<View style={styles.row}>
							<View
								style={[
									styles.badge,
									{
										backgroundColor: done
											? colors.surfaceMuted
											: colors.primaryMuted,
									},
								]}
							>
								<NativeHost>
									<Icon
										name={AppIcons[KIND_ICON[occurrence.kind]]}
										size={BADGE_ICON}
										color={done ? colors.textSecondary : colors.primary}
									/>
								</NativeHost>
							</View>

							<View style={styles.text}>
								<Text
									variant="bodyLarge"
									color={done ? "textSecondary" : "text"}
									numberOfLines={2}
								>
									{occurrence.title}
								</Text>
								<Text variant="caption" color="textSecondary">
									{done
										? t("today.doneAt", {
												time: formatTime(occurrence.doneAt ?? 0, locale),
											})
										: formatTime(occurrence.dueAt, locale)}
								</Text>
							</View>

							{/* The tick sits where the eye already is for a done row, and
                  leaves the row unmarked rather than nagging when it is not. */}
							{done ? (
								<NativeHost>
									<Icon
										name={AppIcons.check}
										size={CHECK_SIZE}
										color={colors.primary}
									/>
								</NativeHost>
							) : null}
						</View>
					</View>
				);
			})}
		</Surface>
	);
}

const styles = StyleSheet.create({
	card: {
		overflow: "hidden",
	},
	divider: {
		height: StyleSheet.hairlineWidth * 2,
		marginLeft: Spacing.lg,
	},
	row: {
		minHeight: TouchTarget.comfortable,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
	},
	badge: {
		width: BADGE_SIZE,
		height: BADGE_SIZE,
		borderRadius: Radius.sm,
		alignItems: "center",
		justifyContent: "center",
	},
	text: {
		flex: 1,
		gap: Spacing.xs / 2,
	},
});
