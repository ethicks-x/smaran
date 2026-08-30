import { Icon } from "@expo/ui";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import type { BoardCard, SymbolId, SymbolPool } from "@/components/games";
import { MemoryBoard, SymbolPools, Symbols } from "@/components/games";
import {
	ActionButton,
	AppIcons,
	NativeHost,
	ProgressBar,
	Screen,
	Section,
	Surface,
	Text,
} from "@/components/ui";
import { useThemeColors } from "@/hooks/use-theme";
import { Spacing, scale } from "@/theme";

/**
 * The boards, easiest first. Always square: as many rows as columns, so the
 * shape the reader is asked to remember is the one shape a grid can have.
 *
 * Difficulty is three dials, not one: how many cards there are, how big the
 * square is — sixteen cards you can take in at a glance, a hundred and
 * forty-four you cannot — and whether the faces are drawn from two dozen things
 * that share nothing or from every face there is, look-alikes included
 * (`SymbolPools`).
 *
 * Boards are only ever offered in order and only after the one before it has
 * been finished, so nobody is dropped onto a hundred and forty-four cards cold.
 * The last two are honestly enormous for the reader this app is for; they are
 * here because a board that is too big to finish is still a board you can put
 * down, and nothing in this game punishes putting it down.
 */
const LEVELS = [
	{ id: "four", columns: 4, pool: "plain" },
	{ id: "six", columns: 6, pool: "plain" },
	{ id: "eight", columns: 8, pool: "wide" },
	{ id: "twelve", columns: 12, pool: "wide" },
] as const satisfies readonly {
	id: string;
	columns: number;
	pool: SymbolPool;
}[];

type Level = (typeof LEVELS)[number];

/** A square board of an even width has exactly half its cards in pairs. */
const pairsOf = (level: Level) => (level.columns * level.columns) / 2;

/** How long the cards are shown before they turn over, and how much longer for
 * every extra pair on the board. Generous, and capped: this is the only part of
 * the game that moves on its own, and a hundred and forty-four cards would
 * otherwise sit there for the better part of a minute. Nobody memorises a board
 * that size from a preview anyway — the button below ends it whenever the
 * reader has seen enough. */
const PREVIEW_BASE_MS = 2200;
const PREVIEW_PER_PAIR_MS = 500;
const PREVIEW_MAX_MS = 9000;

/** A pair is left up long enough to be seen as a pair; two cards that do not
 * match stay up longer, because that is the moment worth remembering. */
const PAIR_HELD_MS = 700;
const MISMATCH_HELD_MS = 700;

const CELEBRATION_ICON = scale(44);

type Card = { id: string; symbol: SymbolId };
type Phase = "preview" | "playing" | "won";

/**
 * Matching pairs — a grid of cards face down, two turned over at a time, and
 * the ones that match stay up.
 *
 * The board opens face up so every card has been seen before any of it has to
 * be remembered; it turns over on its own after a long look, or sooner if the
 * reader says they are ready. After that nothing is timed, nothing is counted
 * against them, and there is no way to lose — two cards that do not match turn
 * back over and the board is exactly as it was.
 *
 * Everything here is on-device and in memory. TODO: when the local store lands
 * (`expo-sqlite` + Drizzle), write one session row per board — cards, pairs,
 * turns taken and how long each turn was held — and let `adjustDifficulty`
 * (D-07) choose the opening board from **this** reader's own history rather
 * than always starting at six (D-08).
 */
export default function MatchingScreen() {
	const { t } = useTranslation();
	const colors = useThemeColors();

	const [levelIndex, setLevelIndex] = useState(0);
	const level = LEVELS[levelIndex] ?? LEVELS[0];

	const [deck, setDeck] = useState<Card[]>(() => deal(LEVELS[0]));
	const [phase, setPhase] = useState<Phase>("preview");
	const [faceUp, setFaceUp] = useState<string[]>([]);
	const [matched, setMatched] = useState<string[]>([]);

	const pairs = pairsOf(level);
	const pairsFound = matched.length / 2;
	const isPair =
		faceUp.length === 2 &&
		symbolOf(deck, faceUp[0]) === symbolOf(deck, faceUp[1]);

	// The look at the board is the only thing in the game that happens on a
	// clock, and the button below can always end it early.
	useEffect(() => {
		if (phase !== "preview") {
			return;
		}

		const timer = setTimeout(
			() => setPhase("playing"),
			Math.min(PREVIEW_BASE_MS + PREVIEW_PER_PAIR_MS * pairs, PREVIEW_MAX_MS),
		);

		return () => clearTimeout(timer);
	}, [phase, pairs]);

	// Two cards are up: hold them there long enough to be looked at, then either
	// keep them or turn them back. The board is locked while this runs, so a
	// third card cannot be tapped into the middle of a comparison.
	useEffect(() => {
		if (faceUp.length < 2) {
			return;
		}

		const [first, second] = faceUp;
		const timer = setTimeout(
			() => {
				if (
					first &&
					second &&
					symbolOf(deck, first) === symbolOf(deck, second)
				) {
					setMatched((cards) => [...cards, first, second]);
				}

				setFaceUp([]);
			},
			isPair ? PAIR_HELD_MS : MISMATCH_HELD_MS,
		);

		return () => clearTimeout(timer);
	}, [faceUp, deck, isPair]);

	useEffect(() => {
		if (deck.length > 0 && matched.length === deck.length) {
			setPhase("won");
		}
	}, [matched.length, deck.length]);

	const start = (index: number) => {
		const next = LEVELS[index] ?? LEVELS[0];

		setLevelIndex(index);
		setDeck(deal(next));
		setMatched([]);
		setFaceUp([]);
		setPhase("preview");
	};

	const turnOver = (id: string) => {
		if (
			phase !== "playing" ||
			faceUp.length >= 2 ||
			faceUp.includes(id) ||
			matched.includes(id)
		) {
			return;
		}

		setFaceUp((cards) => [...cards, id]);
	};

	const cards: BoardCard[] = deck.map((card) => ({
		id: card.id,
		symbol: Symbols[card.symbol],
		name: t(`games.matching.symbols.${card.symbol}`),
		state: matched.includes(card.id)
			? "matched"
			: phase === "preview" || faceUp.includes(card.id)
				? "faceUp"
				: "faceDown",
	}));

	const hasNextLevel = levelIndex + 1 < LEVELS.length;

	return (
		<Screen
			title={t("games.matching.name")}
			subtitle={t("games.matching.subtitle")}
			onBack={() => router.back()}
			withTabBar={false}
		>
			<Section
				title={t(`games.matching.levels.${level.id}.name`)}
				description={t(`games.matching.levels.${level.id}.description`)}
			>
				<View style={styles.meter}>
					<ProgressBar
						value={pairsFound / pairs}
						tone={phase === "won" ? "success" : "primary"}
						accessibilityLabel={t("games.matching.progressLabel")}
					/>
					{/* One line that always says what is happening, and is read out
              whenever it changes — the whole state of the game in a sentence,
              for anyone who cannot see the board. */}
					<Text
						variant="bodyLarge"
						color={phase === "won" || isPair ? "success" : "textSecondary"}
						center
						accessibilityLiveRegion="polite"
					>
						{statusOf({ t, phase, faceUp, isPair, pairsFound, pairs })}
					</Text>
				</View>

				<MemoryBoard
					cards={cards}
					columns={level.columns}
					faceDownLabel={t("games.matching.faceDown")}
					matchedLabel={(name) => t("games.matching.matchedCard", { name })}
					onPressCard={turnOver}
				/>
			</Section>

			{phase === "preview" ? (
				<ActionButton
					label={t("games.matching.hideNow")}
					size="large"
					onPress={() => setPhase("playing")}
				/>
			) : null}

			{phase === "won" ? (
				<>
					<Surface tone="primary" style={styles.done}>
						<NativeHost>
							<Icon
								name={AppIcons.celebrate}
								size={CELEBRATION_ICON}
								color={colors.primary}
							/>
						</NativeHost>
						<Text variant="heading" center accessibilityRole="header">
							{t("games.matching.doneTitle")}
						</Text>
						<Text variant="bodyLarge" center>
							{t("games.matching.doneMessage", { count: pairs })}
						</Text>
					</Surface>

					<View style={styles.actions}>
						{hasNextLevel ? (
							<ActionButton
								label={t("games.matching.bigger")}
								size="large"
								onPress={() => start(levelIndex + 1)}
							/>
						) : null}
						<ActionButton
							label={t("games.matching.again")}
							variant={hasNextLevel ? "outlined" : "filled"}
							size={hasNextLevel ? "comfortable" : "large"}
							onPress={() => start(levelIndex)}
						/>
						<ActionButton
							label={t("games.matching.finish")}
							variant="text"
							onPress={() => router.back()}
						/>
					</View>
				</>
			) : null}
		</Screen>
	);
}

/**
 * The sentence under the bar. Each state gets a whole string of its own rather
 * than a stem with a clause bolted on, so a translator can say it the way their
 * language says it (D-12).
 */
function statusOf({
	t,
	phase,
	faceUp,
	isPair,
	pairsFound,
	pairs,
}: {
	t: ReturnType<typeof useTranslation>["t"];
	phase: Phase;
	faceUp: string[];
	isPair: boolean;
	pairsFound: number;
	/** How many there are to find on this board. */
	pairs: number;
}) {
	if (phase === "preview") {
		return t("games.matching.previewBody");
	}

	if (phase === "won") {
		return t("games.matching.doneTitle");
	}

	if (faceUp.length === 2) {
		return isPair
			? t("games.matching.pairFound")
			: t("games.matching.notAPair");
	}

	return t("games.matching.pairsFound", {
		count: pairsFound,
		total: pairs,
	});
}

/**
 * A board: as many pairs as the level asks for, drawn from its pool and laid
 * out in a fresh order.
 *
 * The symbols are shuffled before they are cut down to size as well, so playing
 * the same board twice is not the same board twice — otherwise the second run
 * would be remembering the first rather than the cards in front of you.
 */
function deal(level: Level): Card[] {
	return shuffled(
		shuffled(SymbolPools[level.pool])
			.slice(0, pairsOf(level))
			.flatMap((symbol) => [
				{ id: `${symbol}-a`, symbol },
				{ id: `${symbol}-b`, symbol },
			]),
	);
}

const symbolOf = (deck: readonly Card[], id: string | undefined) =>
	deck.find((card) => card.id === id)?.symbol;

/**
 * Decorate, sort, undecorate: it says what it does in three lines and never
 * reaches into the array by index, which is where the off-by-one in a
 * hand-written shuffle always hides.
 */
function shuffled<T>(items: readonly T[]): T[] {
	return items
		.map((item) => ({ item, order: Math.random() }))
		.sort((left, right) => left.order - right.order)
		.map(({ item }) => item);
}

const styles = StyleSheet.create({
	meter: {
		gap: Spacing.md,
	},
	actions: {
		gap: Spacing.md,
	},
	done: {
		alignItems: "center",
		paddingVertical: Spacing["3xl"],
		gap: Spacing.lg,
	},
});
