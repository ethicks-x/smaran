import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";

import { Text } from "@/components/ui";
import { useThemeColors } from "@/hooks/use-theme";
import { Radius } from "@/theme";

/** Long enough to read as a card being turned over rather than a cut. */
const FLIP_MS = 320;

/** The symbol, as a share of the card it sits on. */
const SYMBOL_RATIO = 0.5;

/** The emblem on the back of a card, as a share of the card. */
const EMBLEM_RATIO = 0.28;

export type MemoryCardState = "faceDown" | "faceUp" | "matched";

export type MemoryCardProps = {
	/** The picture on the face — one emoji from `Symbols`. */
	symbol: string;
	/** What that picture is called, in the reader's language. Announced instead
	 * of the emoji, which a screen reader would otherwise read as its CLDR name
	 * in English. */
	name: string;
	state: MemoryCardState;
	/** Announced while the card is face down, e.g. "Card, face down". */
	faceDownLabel: string;
	/** Announced once a card has found its pair, e.g. "Sun, matched". */
	matchedLabel: string;
	/** Side of the square, in points. The board works it out from its own width. */
	size: number;
	onPress: () => void;
};

/**
 * One card on the matching board: a plain tinted back, a picture on the face,
 * and a matched card that stays where it is in the app's success green.
 *
 * A matched pair is left on the board rather than cleared away. Cards
 * disappearing out from under a hand is the thing that makes this game hard for
 * the reader we are building for — the board they learnt would keep changing
 * shape. Left in place and tinted, the board is stable and the green squares
 * are a record of what has already been found.
 *
 * The card turns over rather than cross-fading, because that is what a card
 * does; a third of a second is quick enough to feel like a flick of the wrist
 * and slow enough to watch.
 */
export function MemoryCard({
	symbol,
	name,
	state,
	faceDownLabel,
	matchedLabel,
	size,
	onPress,
}: MemoryCardProps) {
	const colors = useThemeColors();
	const isShowing = state !== "faceDown";
	const flip = useSharedValue(isShowing ? 1 : 0);

	useEffect(() => {
		flip.value = withTiming(isShowing ? 1 : 0, { duration: FLIP_MS });
	}, [isShowing, flip]);

	// `backfaceVisibility` is honoured unevenly on Android, so each face also
	// hands over its opacity at the halfway point. The faces never overlap
	// visibly on either platform, whichever of the two is doing the work.
	const back = useAnimatedStyle(() => ({
		opacity: flip.value < 0.5 ? 1 : 0,
		transform: [
			{ perspective: 700 },
			{ rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` },
		],
	}));

	const face = useAnimatedStyle(() => ({
		opacity: flip.value < 0.5 ? 0 : 1,
		transform: [
			{ perspective: 700 },
			{ rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` },
		],
	}));

	const square = { width: size, height: size };

	return (
		<Pressable
			onPress={onPress}
			// A matched card is done, and a card already face up has nothing left to
			// say. Neither is disabled — a disabled control is announced as one, and
			// "dimmed" is not what has happened here — they simply do nothing.
			accessibilityRole="button"
			accessibilityLabel={
				state === "matched"
					? matchedLabel
					: state === "faceUp"
						? name
						: faceDownLabel
			}
			accessibilityState={{ selected: state === "matched" }}
			style={({ pressed }) => [square, pressed && styles.pressed]}
		>
			<Animated.View
				style={[
					styles.side,
					square,
					{ backgroundColor: colors.surfaceMuted, borderColor: colors.border },
					back,
				]}
			>
				{/* A quiet emblem rather than a question mark: nothing on this board
            asks the reader a question they can get wrong. */}
				<View
					style={[
						styles.emblem,
						{
							width: size * EMBLEM_RATIO,
							height: size * EMBLEM_RATIO,
							backgroundColor: colors.border,
						},
					]}
				/>
			</Animated.View>

			<Animated.View
				style={[
					styles.side,
					square,
					{
						backgroundColor:
							state === "matched" ? colors.successMuted : colors.surface,
						borderColor: state === "matched" ? colors.success : colors.border,
					},
					face,
				]}
			>
				{/* The symbol is a picture, not type, so it is sized against the card
            rather than from the type scale — a face that only filled a quarter
            of its card would be unreadable on the largest board. */}
				<Text
					style={{
						fontSize: size * SYMBOL_RATIO,
						// The leading has to grow with it: left at the body variant's, a
						// 40pt emoji would be drawn into a 22pt line and clipped.
						lineHeight: size * SYMBOL_RATIO * 1.25,
					}}
				>
					{symbol}
				</Text>
			</Animated.View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	side: {
		position: "absolute",
		left: 0,
		top: 0,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: Radius.md,
		borderWidth: StyleSheet.hairlineWidth * 3,
		backfaceVisibility: "hidden",
	},
	emblem: {
		borderRadius: Radius.pill,
		opacity: 0.7,
	},
	pressed: {
		opacity: 0.85,
	},
});
