import { Stack } from "expo-router";

import { useThemeColors } from "@/hooks/use-theme";

/**
 * The games. They are pushed on top of the tabs rather than living in one,
 * because five tabs is already the ceiling for this audience — see the games
 * card on Today, which is how anyone gets here.
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
