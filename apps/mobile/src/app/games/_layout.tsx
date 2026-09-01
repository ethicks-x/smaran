import { Stack } from "expo-router";

import { useThemeColors } from "@/hooks/use-theme";

/**
 * The boards themselves. The list of games is the Games tab; a board is pushed
 * on top of the tabs from there, so a game fills the screen and there is no
 * swipe between tabs to carry the reader out of one mid-round.
 *
 * Every game is its own file in this folder, so adding one is adding a screen
 * and a row on the list; each carries its own large "Back" control, so the way
 * out of a game is a labelled button and never a gesture.
 */
export default function GamesLayout() {
	const colors = useThemeColors();

	return (
		<Stack
			screenOptions={{
				headerShown: false,
				contentStyle: { backgroundColor: colors.background },
			}}
		/>
	);
}
