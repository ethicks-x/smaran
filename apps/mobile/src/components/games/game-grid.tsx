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

const BADGE_SIZE = scale(72);
const BADGE_ICON = scale(38);

/** Two to a row. Four tiles then read as one square block rather than a list. */
const COLUMNS = 2;

export type GameGridTile = {
	id: string;
	icon: AppIconName;
	/** The game's name, or the words for the way into the full list. */
	title: string;
	/** What tapping it is like. Announced as the hint, never drawn — a tile
	 * this size has room for a name and nothing else. */
	description: string;
	/**
	 * `game` goes straight to a board; `more` is the way to the rest of them.
	 * The two are tinted differently so the odd one out looks like the odd one
	 * out before it is read.
	 */
	kind: "game" | "more";
	onPress: () => void;
};

export type GameGridProps = {
	tiles: readonly GameGridTile[];
};

/**
 * The games, as a block of square tiles rather than a stack of rows.
 *
 * A row per game is the right shape for a list you read through — it is what
 * the Games screen does, where the sentence under each name is the point. On
 * Today the games are not the page, they are one thing on it, and four rows of
 * card would push the day's reminders off the screen. A tile keeps the name and
 * the picture and drops the sentence, which the reader has already met on the
 * way in.
 *
 * Every tile is a whole button and square, so the target is the tile: at two
 * columns on the narrowest phone this app runs on that is comfortably past the
 * touch floor, and there is nothing small to aim at inside it.
 *
 * A short last row leaves its gap rather than stretching the tile across it —
 * a wide tile among square ones reads as a different kind of thing, and it is
 * not one.
 */
export function GameGrid({ tiles }: GameGridProps) {
	return (
		<View style={styles.grid}>
			{rowsOf(tiles).map((row) => (
				<View key={row[0]?.id} style={styles.row}>
					{row.map((tile) => (
						<GridTile key={tile.id} tile={tile} />
					))}

					{/* Holds the short row's tile at its own width instead of letting
              it grow into the empty half. */}
					{row.length < COLUMNS ? <View style={styles.filler} /> : null}
				</View>
			))}
		</View>
	);
}

function GridTile({ tile }: { tile: GameGridTile }) {
	const colors = useThemeColors();

	const tint =
		tile.kind === "more"
			? { fill: colors.accentMuted, mark: colors.accent }
			: { fill: colors.primaryMuted, mark: colors.primary };

	return (
		<Pressable
			onPress={tile.onPress}
			accessibilityRole="button"
			accessibilityLabel={tile.title}
			accessibilityHint={tile.description}
			style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
		>
			<Surface elevated style={styles.tile}>
				<View style={[styles.badge, { backgroundColor: tint.fill }]}>
					<NativeHost>
						<Icon
							name={AppIcons[tile.icon]}
							size={BADGE_ICON}
							color={tint.mark}
						/>
					</NativeHost>
				</View>

				{/* Two lines is enough for every game name in all four languages;
            past that the name shortens rather than the tile growing, so the
            block stays square. */}
				<Text variant="label" center numberOfLines={2}>
					{tile.title}
				</Text>
			</Surface>
		</Pressable>
	);
}

/** The tiles, cut into rows of {@link COLUMNS}. */
function rowsOf(tiles: readonly GameGridTile[]): GameGridTile[][] {
	const rows: GameGridTile[][] = [];

	for (let start = 0; start < tiles.length; start += COLUMNS) {
		rows.push(tiles.slice(start, start + COLUMNS));
	}

	return rows;
}

const styles = StyleSheet.create({
	grid: {
		gap: Spacing.md,
	},
	row: {
		flexDirection: "row",
		gap: Spacing.md,
	},
	cell: {
		flex: 1,
	},
	filler: {
		flex: 1,
	},
	tile: {
		minHeight: TouchTarget.large * 2,
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.md,
	},
	badge: {
		width: BADGE_SIZE,
		height: BADGE_SIZE,
		borderRadius: Radius.md,
		alignItems: "center",
		justifyContent: "center",
	},
	pressed: {
		opacity: 0.9,
	},
});
