import { Icon } from "@expo/ui";
import { Pressable, StyleSheet, View } from "react-native";
import { AppIcons } from "@/components/ui/icons";
import { NativeHost } from "@/components/ui/native-host";
import { Text } from "@/components/ui/text";
import { useThemeColors } from "@/hooks/use-theme";
import type { TextVariant } from "@/theme";
import { Radius, Spacing, scale, TouchTarget } from "@/theme";

const CHEVRON = scale(28);

export type FieldTriggerProps = {
	/** Always visible above the row — never a placeholder standing in for it. */
	label: string;
	/** The current answer, in words. Read out after the label. */
	value: string;
	/** How large the answer is drawn. A time is worth more room than a word. */
	variant?: TextVariant;
	onPress: () => void;
};

/**
 * A labelled row that says what the field currently holds and opens the picker
 * that changes it.
 *
 * The answer is written out rather than hinted at, and the chevron only ever
 * repeats what the row already says in words: a reader who has forgotten what
 * they were answering can read the label, the answer and the way to change it
 * without opening anything.
 */
export function FieldTrigger({
	label,
	value,
	variant = "bodyLarge",
	onPress,
}: FieldTriggerProps) {
	const colors = useThemeColors();

	return (
		<View style={styles.field}>
			<Text variant="caption" color="textSecondary">
				{label}
			</Text>

			<Pressable
				onPress={onPress}
				accessibilityRole="button"
				accessibilityLabel={label}
				accessibilityValue={{ text: value }}
				style={({ pressed }) => [
					styles.trigger,
					{ backgroundColor: colors.surface, borderColor: colors.border },
					pressed && styles.pressed,
				]}
			>
				<Text variant={variant} style={styles.value}>
					{value}
				</Text>

				<NativeHost>
					<Icon
						name={AppIcons.chevronDown}
						size={CHEVRON}
						color={colors.primary}
					/>
				</NativeHost>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	field: {
		gap: Spacing.xs,
	},
	trigger: {
		minHeight: TouchTarget.comfortable,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
		borderRadius: Radius.md,
		borderWidth: 2,
	},
	value: {
		flex: 1,
	},
	pressed: {
		opacity: 0.9,
	},
});
