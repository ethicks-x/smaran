import { Icon } from "@expo/ui";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { KIND_ICON } from "@/components/today/kinds";
import {
	ActionButton,
	AppIcons,
	formatTime,
	NativeHost,
	Surface,
	Text,
} from "@/components/ui";
import { useLocale } from "@/hooks/use-language";
import { useThemeColors } from "@/hooks/use-theme";
import type { ReminderOccurrence } from "@/lib/reminders";
import { Radius, Spacing, scale } from "@/theme";

const BADGE_SIZE = scale(72);
const BADGE_ICON = scale(40);

export type NextReminderCardProps = {
	/** The next thing to do, or null when there is nothing left today. */
	occurrence: ReminderOccurrence | null;
	onDone: () => void;
};

/**
 * The one card the screen is about: what to do next, and the button that says
 * it is done.
 *
 * The time is set in `display` — the largest step in the scale — because it is
 * the thing a reader looks for from across the room, and because a single very
 * large number is easier to land on than a row of equal-weight cards. Everything
 * else on the card is support: the label above it says which time this is, the
 * words under it say what to do, and the tinted picture on the right is a
 * landmark for someone who is recognising the card rather than reading it.
 *
 * It carries the screen's only filled button (`AGENTS.md` §2.3). When there is
 * nothing left to do the card stays, saying so — the reader learns one place to
 * look, and it should still be there on a day with nothing in it.
 */
export function NextReminderCard({
	occurrence,
	onDone,
}: NextReminderCardProps) {
	const { t } = useTranslation();
	const colors = useThemeColors();
	const locale = useLocale();

	return (
		<Surface tone="primary" elevated style={styles.card}>
			<View style={styles.row}>
				<View style={styles.text}>
					<Text variant="caption" color="textSecondary">
						{occurrence ? t("today.nextUp") : t("today.nothingScheduled")}
					</Text>

					{occurrence ? (
						<>
							<Text variant="display">
								{formatTime(occurrence.dueAt, locale)}
							</Text>
							<Text variant="bodyLarge">{occurrence.title}</Text>
							{occurrence.detail ? (
								<Text variant="caption" color="textSecondary">
									{occurrence.detail}
								</Text>
							) : null}
						</>
					) : (
						<Text variant="bodyLarge">{t("today.nextUpPlaceholder")}</Text>
					)}
				</View>

				<View style={[styles.badge, { backgroundColor: colors.surface }]}>
					<NativeHost>
						<Icon
							name={AppIcons[occurrence ? KIND_ICON[occurrence.kind] : "check"]}
							size={BADGE_ICON}
							color={colors.primary}
						/>
					</NativeHost>
				</View>
			</View>

			{occurrence ? (
				<ActionButton
					label={t("today.markDone")}
					size="comfortable"
					onPress={onDone}
					accessibilityLabel={t("today.markDoneOf", {
						title: occurrence.title,
					})}
				/>
			) : null}
		</Surface>
	);
}

const styles = StyleSheet.create({
	card: {
		padding: Spacing.lg,
		gap: Spacing.lg,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
	},
	text: {
		flex: 1,
		// Tighter than the card: the label, the time and the words are one block
		// to be read in a single pass, not three separate things.
		gap: Spacing.xs,
	},
	badge: {
		width: BADGE_SIZE,
		height: BADGE_SIZE,
		borderRadius: Radius.md,
		alignItems: "center",
		justifyContent: "center",
	},
});
