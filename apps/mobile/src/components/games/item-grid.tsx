import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui";
import { useThemeColors } from "@/hooks/use-theme";
import { Radius, Spacing, scale, TouchTarget } from "@/theme";

/**
 * A tile is never smaller than the touch floor even though nothing here is
 * tappable: below it an emoji stops being a thing you can recognise, and
 * recognising it is the entire task.
 */
const MinTileSize = TouchTarget.min;

/** And never bigger than this, or three tiles on a tablet would be three
 * enormous pictures with the rest of the screen empty around them. */
const MaxTileSize = scale(148);

/** The picture, as a share of the tile it sits on. Matched to `MemoryCard`, so
 * a thing is drawn at the same weight in both games. */
const SYMBOL_RATIO = 0.52;

/**
 * What a gap wears.
 *
 * Punctuation rather than copy — it is the same mark in all four of the app's
 * languages, so it is not a string literal escaping the catalogues (§2.3). The
 * words for it are in `label`, which is what a screen reader is given.
 *
 * `MemoryCard` deliberately puts a *quiet emblem* on a face-down card instead
 * of this, because nothing on that board asks the reader a question they can
 * get wrong. Here the board is the question, so the mark is right.
 */
const GAP_MARK = "?";

export type GridItem = {
	id: string;
	/** The picture — one emoji from `Symbols`. Empty for a gap. */
	symbol: string;
	/**
	 * The whole sentence a screen reader hears for this tile, already in the
	 * reader's language — never a name with a word bolted onto the end. It is
	 * what is announced instead of the emoji, which a screen reader would
	 * otherwise read as its English CLDR name.
	 */
	label: string;
	/** `gap` is a place something has gone from; `restored` is a gap that has
	 * just been named and filled back in. */
	state: "shown" | "gap" | "restored";
};

export type ItemGridProps = {
	items: readonly GridItem[];
	/** Tiles to a row. The last row is short whenever the count does not divide. */
	columns: number;
};

/**
 * A grid of things to look at. Nothing in it can be tapped.
 *
 * That is what separates it from `MemoryBoard`, which is a grid of the same
 * shape made of buttons: here the board is the question and the answer is given
 * somewhere else on the screen, so a tile is announced as a picture and a tap on
 * one does nothing. Rendering these as `Pressable`s to save a file would tell a
 * screen reader there are sixteen buttons here, and there are none.
 *
 * Tile size is divided out of the grid's own measured width so the same board
 * fills a phone and a tablet, clamped at both ends. Three and four columns fit
 * across every screen this app runs on at the smallest tile, so unlike
 * `MemoryBoard` there is nothing here that can overflow and nothing to scroll.
 */
export function ItemGrid({ items, columns }: ItemGridProps) {
	const [width, setWidth] = useState(0);

	const measure = (event: LayoutChangeEvent) => {
		const measured = event.nativeEvent.layout.width;

		setWidth((current) => (current === measured ? current : measured));
	};

	const size = Math.min(
		MaxTileSize,
		Math.max(
			MinTileSize,
			Math.floor((width - Spacing.md * (columns - 1)) / columns),
		),
	);

	return (
		<View onLayout={measure}>
			{/* Nothing is drawn until the grid knows how wide it is: tiles laid out
          at a guessed size and corrected a frame later would deal themselves
          twice in front of the reader. */}
			{width === 0 ? null : (
				<View style={styles.grid}>
					{rowsOf(items, columns).map((row) => (
						<View key={row[0]?.id} style={styles.row}>
							{row.map((item) => (
								<Tile key={item.id} item={item} size={size} />
							))}
						</View>
					))}
				</View>
			)}
		</View>
	);
}

function Tile({ item, size }: { item: GridItem; size: number }) {
	const colors = useThemeColors();

	// A gap is the warm accent rather than the danger red: something is missing,
	// which is the game, and not something has gone wrong.
	const tone =
		item.state === "restored"
			? {
					fill: colors.successMuted,
					edge: colors.success,
					mark: colors.success,
				}
			: item.state === "gap"
				? { fill: colors.accentMuted, edge: colors.accent, mark: colors.accent }
				: { fill: colors.surface, edge: colors.border, mark: colors.text };

	return (
		<View
			accessible
			accessibilityRole="image"
			accessibilityLabel={item.label}
			style={[
				styles.tile,
				{
					width: size,
					height: size,
					backgroundColor: tone.fill,
					borderColor: tone.edge,
				},
				// A gap is drawn as an outline so the board reads as having a hole in
				// it rather than one more filled square among the others.
				item.state === "gap" && styles.gap,
			]}
		>
			{/* The symbol is a picture, not type, so it is sized against its tile
          rather than from the type scale — a face that only filled a quarter
          of its tile would be unreadable at arm's length. The mark on a gap is
          sized to match, so a hole is as big as the thing that left it. */}
			<Text
				style={{
					fontSize: size * SYMBOL_RATIO,
					// The leading has to grow with it: left at the body variant's, a
					// 60pt emoji would be drawn into a 22pt line and clipped.
					lineHeight: size * SYMBOL_RATIO * 1.25,
					...(item.state === "gap" ? { color: tone.mark } : null),
				}}
			>
				{item.state === "gap" ? GAP_MARK : item.symbol}
			</Text>
		</View>
	);
}

/** The items, cut into rows of `columns`. */
function rowsOf(items: readonly GridItem[], columns: number): GridItem[][] {
	const rows: GridItem[][] = [];

	for (let start = 0; start < items.length; start += columns) {
		rows.push(items.slice(start, start + columns));
	}

	return rows;
}

const styles = StyleSheet.create({
	grid: {
		alignSelf: "center",
		gap: Spacing.md,
	},
	row: {
		flexDirection: "row",
		gap: Spacing.md,
	},
	tile: {
		alignItems: "center",
		justifyContent: "center",
		borderRadius: Radius.md,
		borderWidth: StyleSheet.hairlineWidth * 3,
	},
	gap: {
		borderStyle: "dashed",
	},
});
