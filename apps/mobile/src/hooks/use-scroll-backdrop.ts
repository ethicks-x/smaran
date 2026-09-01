import {
	Extrapolation,
	interpolate,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";

import { Spacing } from "@/theme";

/**
 * How far the page travels before the backdrop is fully opaque. Short on
 * purpose: the point is to be solid by the time any real content has reached
 * the top of the screen, not to be a slow effect on the way there.
 */
const FADE_DISTANCE = Spacing["2xl"];

/**
 * Drives a solid strip behind the status bar that is not there until it is
 * needed.
 *
 * At the top of a page there is nothing under the clock but the page's own
 * canvas, and a bar drawn over it would be a line across a screen that has no
 * seam in it. The moment anything scrolls up under the status bar that stops
 * being true — body copy, a photo, a coloured card — and the clock has to sit
 * on something opaque to stay readable. So the strip fades in with the scroll
 * and back out at the top, and neither state is ever wrong for what is behind
 * it.
 *
 * It animates opacity on a solid fill rather than the colour itself: a colour
 * interpolated to `transparent` travels through black on the way, which shows
 * as a grey bloom in light mode.
 */
export function useScrollBackdrop() {
	const offset = useSharedValue(0);

	const onScroll = useAnimatedScrollHandler((event) => {
		offset.value = event.contentOffset.y;
	});

	const backdropStyle = useAnimatedStyle(() => ({
		opacity: interpolate(
			offset.value,
			[0, FADE_DISTANCE],
			[0, 1],
			Extrapolation.CLAMP,
		),
	}));

	return { onScroll, backdropStyle };
}
