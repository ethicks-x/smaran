import { useWindowDimensions } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { useReducedMotion } from "react-native-reanimated";

import { useThemeColors } from "@/hooks/use-theme";

/** Enough to read as a shower rather than a handful, few enough that every
 * piece is still its own thing on a small screen. */
const PIECE_COUNT = 60;

/** Slower than the library's default. The point is something pleasant to
 * watch, not a flash that is gone before a reader who looks up a moment later
 * has seen anything. */
const FALL_MS = 4200;

export type ConfettiProps = {
	/** Changing this fires a fresh burst. */
	run?: number;
};

/**
 * A burst of coloured paper across whatever it is laid over.
 *
 * `react-native-confetti-cannon` does the animation — it is a hundred lines of
 * `Animated` with no native module of its own, so it needs no rebuild and
 * nothing about it can reach the network. What this wrapper adds is the two
 * things the app cares about: the paper is coloured from the theme's own accent
 * tokens rather than the library's stock palette, so it still looks like Smaran
 * in either scheme, and a reader who has turned motion down in the OS gets no
 * confetti at all rather than a gentler version — the honest reduced form of
 * falling paper is no falling paper.
 *
 * It is decoration and only decoration: it takes no touches and says nothing to
 * a screen reader. Give it an absolutely positioned parent; the pieces place
 * themselves.
 */
export function Confetti({ run = 0 }: ConfettiProps) {
	const colors = useThemeColors();
	const { width } = useWindowDimensions();
	const reduceMotion = useReducedMotion();

	if (reduceMotion) {
		return null;
	}

	return (
		<ConfettiCannon
			// Remounts the cannon, which is how it is fired again for a new board.
			key={run}
			count={PIECE_COUNT}
			// Thrown from above the middle of the screen, so it falls across the
			// whole width rather than arriving from one corner.
			origin={{ x: width / 2, y: 0 }}
			fallSpeed={FALL_MS}
			fadeOut
			colors={[colors.primary, colors.accent, colors.success, colors.warning]}
		/>
	);
}
