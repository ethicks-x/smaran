import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui";
import { useThemeColors } from "@/hooks/use-theme";
import { Radius, Spacing, scale, TouchTarget } from "@/theme";

/** A picture option is square and at least the large touch target across —
 * this is the answer to the only question on the screen, so it is the biggest
 * thing on it that can be tapped. */
const PICTURE_SIZE = Math.max(scale(112), TouchTarget.large);

/** The picture, as a share of its tile. */
const SYMBOL_RATIO = 0.5;

/** Two to a row at the narrowest, so a word option is never a thin strip and
 * four of them are never four full-width bars pushing the board off screen. */
const WORD_BASIS = "44%";

/**
 * Whether an option wears the thing or its name — the dial that makes this
 * game's later boards harder.
 *
 * A picture is recognised; a name has to be turned back into a picture first
 * and then looked for. That second step is the harder task, and it is the one
 * the top of the ladder asks for.
 */
export type OptionMode = "picture" | "word";

export type MissingOptionState = "idle" | "wrong" | "correct";

export type MissingOption = {
	id: string;
	/** The picture — one emoji from `Symbols`. */
	symbol: string;
	/** What it is called, in the reader's language. */
	name: string;
	state: MissingOptionState;
};

export type MissingOptionsProps = {
	options: readonly MissingOption[];
	mode: OptionMode;
	/** Names the whole set for screen readers, e.g. "Choose the one that is
	 * missing". */
	label: string;
	/** Given a name, the whole sentence a screen reader hears for an option
	 * already tried and still on the board. */
	wrongLabel: (name: string) => string;
	onPress: (id: string) => void;
};

/**
 * The answers to choose between, laid out as a handful of large tiles.
 *
 * **A picture option still announces its name.** In picture mode the name is
 * not drawn — that is the whole difference between the two modes — but it is
 * what a screen reader is given, so the picture is never the only cue (§2.3).
 * Someone listening rather than looking gets the word either way, which means
 * the modes differ in difficulty for a reader who can see and not in whether
 * the game can be played at all.
 *
 * An option tapped and found wrong stays on screen, tinted, rather than
 * disappearing or being disabled: it is a record of what has already been
 * tried, nothing here scolds, and a disabled control is announced as "dimmed",
 * which is not what happened. Tapping it again simply does nothing.
 */
export function MissingOptions({
	options,
	mode,
	label,
	wrongLabel,
	onPress,
}: MissingOptionsProps) {
	const colors = useThemeColors();

	return (
		<View
			style={styles.row}
			accessibilityRole="radiogroup"
			accessibilityLabel={label}
		>
			{options.map((option) => {
				const tone =
					option.state === "wrong"
						? { fill: colors.dangerMuted, edge: colors.danger }
						: option.state === "correct"
							? { fill: colors.successMuted, edge: colors.success }
							: { fill: colors.surface, edge: colors.border };

				return (
					<Pressable
						key={option.id}
						onPress={() => onPress(option.id)}
						accessibilityRole="radio"
						accessibilityLabel={
							option.state === "wrong" ? wrongLabel(option.name) : option.name
						}
						accessibilityState={{
							checked: option.state === "correct",
							selected: option.state === "correct",
						}}
						style={({ pressed }) => [
							styles.option,
							mode === "picture" ? styles.picture : styles.word,
							{ backgroundColor: tone.fill, borderColor: tone.edge },
							pressed && styles.pressed,
						]}
					>
						{mode === "picture" ? (
							<Text
								style={{
									fontSize: PICTURE_SIZE * SYMBOL_RATIO,
									// The leading has to grow with the picture, or a 56pt emoji
									// would be drawn into a 22pt line and clipped.
									lineHeight: PICTURE_SIZE * SYMBOL_RATIO * 1.25,
								}}
							>
								{option.symbol}
							</Text>
						) : (
							<Text variant="bodyLarge" center>
								{option.name}
							</Text>
						)}
					</Pressable>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "center",
		gap: Spacing.md,
	},
	option: {
		alignItems: "center",
		justifyContent: "center",
		borderRadius: Radius.md,
		borderWidth: StyleSheet.hairlineWidth * 3,
	},
	picture: {
		width: PICTURE_SIZE,
		height: PICTURE_SIZE,
	},
	word: {
		flexGrow: 1,
		flexBasis: WORD_BASIS,
		minHeight: TouchTarget.large,
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
	},
	pressed: {
		opacity: 0.85,
	},
});
