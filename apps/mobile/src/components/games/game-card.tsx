import { Icon } from "@expo/ui";
import { Pressable, StyleSheet, View } from "react-native";

import {
	type AppIconName,
	AppIcons,
	NativeHost,
	Surface,
	Text,
} from "@/components/ui";
import { useThemeColors } from "@/hooks/use-theme";
import { Radius, Spacing, scale, TouchTarget } from "@/theme";

const BADGE_SIZE = scale(64);
const BADGE_ICON = scale(34);
const CHEVRON_SIZE = scale(26);

export type GameCardProps = {
	icon: AppIconName;
	/** The game's name, in the reader's language. */
	title: string;
	/** One line saying what playing it is like — never how hard it is. */
	description: string;
	onPress: () => void;
};

/**
 * One game, offered as a whole card rather than a row with a small button on
 * it: the target is the card, so there is nothing to aim at and nothing to
 * miss. The tinted tile is a landmark for a reader who has been here before —
 * the name beside it says the same thing in words, so the picture is never the
 * only cue.
 */
export function GameCard({ icon, title, description, onPress }: GameCardProps) {
	const colors = useThemeColors();

	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={title}
			accessibilityHint={description}
			style={({ pressed }) => pressed && styles.pressed}
		>
			<Surface elevated style={styles.card}>
				<View style={[styles.badge, { backgroundColor: colors.primaryMuted }]}>
					<NativeHost>
						<Icon
							name={AppIcons[icon]}
							size={BADGE_ICON}
							color={colors.primary}
						/>
					</NativeHost>
				</View>

				<View style={styles.text}>
					<Text variant="heading">{title}</Text>
					<Text variant="caption" color="textSecondary">
						{description}
					</Text>
				</View>

				<NativeHost>
					<Icon
						name={AppIcons.chevronRight}
						size={CHEVRON_SIZE}
						color={colors.textSecondary}
					/>
				</NativeHost>
			</Surface>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: {
		minHeight: TouchTarget.large,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.lg,
	},
	badge: {
		width: BADGE_SIZE,
		height: BADGE_SIZE,
		borderRadius: Radius.md,
		alignItems: "center",
		justifyContent: "center",
	},
	text: {
		flex: 1,
		gap: Spacing.xs,
	},
	pressed: {
		opacity: 0.9,
	},
});
