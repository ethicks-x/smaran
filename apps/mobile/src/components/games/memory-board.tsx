import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { ScrollView, StyleSheet, View } from "react-native";

import {
	MemoryCard,
	type MemoryCardState,
} from "@/components/games/memory-card";
import { Spacing, TouchTarget } from "@/theme";

/**
 * A card never goes below the platform's touch floor, whatever the arithmetic
 * says. On a twelve-wide board on a phone that means the grid is wider than the
 * screen and scrolls sideways — which is bad, and still the better of the two
 * bad options: a 25pt card is one nobody with an unsteady hand can hit at all.
 */
const MinCardSize = TouchTarget.min;

/** Wide boards give their gaps back to the cards; there is not room for both.
 * The tighter gap is what lets six by six still fit across a phone at the full
 * touch size — at the roomier one it would be scrolling by a few points. */
const gapFor = (columns: number) => (columns > 4 ? Spacing.xs : Spacing.md);

export type BoardCard = {
	/** Unique per card, so a symbol's two cards are still two cards. */
	id: string;
	symbol: string;
	name: string;
	state: MemoryCardState;
};

export type MemoryBoardProps = {
	cards: readonly BoardCard[];
	/** Cards to a row. The board is always this many by this many. */
	columns: number;
	faceDownLabel: string;
	/** Given a card's name, the sentence a screen reader hears once it is
	 * matched — a whole string per language, never a name with a word after it. */
	matchedLabel: (name: string) => string;
	onPressCard: (id: string) => void;
};

/**
 * The grid: a square of cards, laid out row by row.
 *
 * Rows are built explicitly rather than left to wrap, because a wrapped row is
 * only as long as the space allows and this board's shape is part of the game —
 * four by four has to stay four by four on every screen it is dealt on.
 *
 * Card size is divided out of the board's own measured width, so the same board
 * fills a small phone and a tablet. Where even the smallest card will not fit
 * across, the grid scrolls sideways instead of shrinking under the touch floor.
 */
export function MemoryBoard({
	cards,
	columns,
	faceDownLabel,
	matchedLabel,
	onPressCard,
}: MemoryBoardProps) {
	const [width, setWidth] = useState(0);

	const measure = (event: LayoutChangeEvent) => {
		const measured = event.nativeEvent.layout.width;

		setWidth((current) => (current === measured ? current : measured));
	};

	const gap = gapFor(columns);
	const size = Math.max(
		MinCardSize,
		Math.floor((width - gap * (columns - 1)) / columns),
	);
	const overflows = size * columns + gap * (columns - 1) > width;

	const grid = (
		<View style={[styles.grid, { gap }]}>
			{rowsOf(cards, columns).map((row) => (
				<View key={row[0]?.id} style={[styles.row, { gap }]}>
					{row.map((card) => (
						<MemoryCard
							key={card.id}
							symbol={card.symbol}
							name={card.name}
							state={card.state}
							faceDownLabel={faceDownLabel}
							matchedLabel={matchedLabel(card.name)}
							size={size}
							onPress={() => onPressCard(card.id)}
						/>
					))}
				</View>
			))}
		</View>
	);

	return (
		<View onLayout={measure}>
			{/* Nothing is drawn until the board knows how wide it is: cards laid out
          at a guessed size and corrected a frame later would deal themselves
          twice in front of the reader. */}
			{width === 0 ? null : overflows ? (
				<ScrollView horizontal showsHorizontalScrollIndicator>
					{grid}
				</ScrollView>
			) : (
				grid
			)}
		</View>
	);
}

/** The deck, cut into rows of `columns`. */
function rowsOf(cards: readonly BoardCard[], columns: number): BoardCard[][] {
	const rows: BoardCard[][] = [];

	for (let start = 0; start < cards.length; start += columns) {
		rows.push(cards.slice(start, start + columns));
	}

	return rows;
}

const styles = StyleSheet.create({
	grid: {
		alignSelf: "center",
	},
	row: {
		flexDirection: "row",
	},
});
