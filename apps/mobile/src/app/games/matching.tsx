import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import type { BoardCard, SymbolId, SymbolPool } from "@/components/games";
import {
	GameFrame,
	GameStatsDetail,
	GameSummary,
	MemoryBoard,
	SymbolPools,
	Symbols,
} from "@/components/games";
import {
	ActionButton,
	Confetti,
	Dialog,
	ProgressBar,
	Text,
} from "@/components/ui";
import { useGameSession } from "@/hooks/use-game-session";
import type { SessionStats } from "@/lib/game-stats";
import { Spacing } from "@/theme";

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
/** The key this game's sessions are grouped under, here and on the server. */
const GAME_ID = "matching";

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
 * that size from a preview anyway. */
const PREVIEW_BASE_MS = 2200;
const PREVIEW_PER_PAIR_MS = 500;
const PREVIEW_MAX_MS = 9000;

/** A pair is left up long enough to be seen as a pair; two cards that do not
 * match stay up longer, because that is the moment worth remembering. */
const PAIR_HELD_MS = 700;
const MISMATCH_HELD_MS = 700;

type Card = { id: string; symbol: SymbolId };
type Phase = "preview" | "playing" | "won";

/**
 * Matching pairs — a grid of cards face down, two turned over at a time, and
 * the ones that match stay up.
 *
 * The board opens face up so every card has been seen before any of it has to
 * be remembered, and turns over on its own after a long look — a bar draining
 * above it is the only thing on screen while that happens, because the only
 * thing to do is look. After that nothing is timed, nothing is counted against
 * them, and there is no way to lose — two cards that do not match turn back
 * over and the board is exactly as it was. Finishing one is a dialog and a
 * handful of paper, and even that has no hurry in it.
 *
 * Everything here is on-device. Every board is measured by `useGameSession` —
 * turns taken, how many found a pair, how long each turn was held, and whether
 * the board was finished or put down — and the row is written to SQLite before
 * the win dialog has finished animating. None of it is shown to the reader and
 * none of it is a score: §2.3 forbids anything that scolds, and a percentage
 * under a finished board is exactly that. It is there for the caregiver
 * dashboard and for the engine.
 *
 * TODO: let `adjustDifficulty` (D-07) read that history to choose the opening
 * board from **this** reader's own recent rounds rather than always starting at
 * four by four (D-08). The rows it needs are on disk now (D-24); nothing is
 * missing but the engine.
 */
export default function MatchingScreen() {
	const { t } = useTranslation();

	const session = useGameSession({ gameId: GAME_ID });

	const [levelIndex, setLevelIndex] = useState(0);
	const level = LEVELS[levelIndex] ?? LEVELS[0];

	/** Counts the boards dealt this sitting. Nothing in the game reads it as a
	 * score — it is what tells the draining bar and the confetti that this is a
	 * new board and not the last one still running. */
	const [round, setRound] = useState(0);

	const [deck, setDeck] = useState<Card[]>(() => deal(LEVELS[0]));
	const [phase, setPhase] = useState<Phase>("preview");
	const [faceUp, setFaceUp] = useState<string[]>([]);
	const [matched, setMatched] = useState<string[]>([]);
	const [previewLeft, setPreviewLeft] = useState(1);

	/** The finished board's own numbers, kept so the dialog can show what just
	 * happened. Null until a board is cleared, and cleared again with the next
	 * deal — the card is about this board and no other. */
	const [summary, setSummary] = useState<SessionStats | null>(null);

	/** The two cards the last attempt was counted for. Settling the same pair can
	 * be reached twice — by the timer, and by a third tap that got there first —
	 * and a turn counted twice would quietly halve the board's accuracy. */
	const lastCounted = useRef<string | null>(null);

	const pairs = pairsOf(level);
	const pairsFound = matched.length / 2;
	const isPair =
		faceUp.length === 2 &&
		symbolOf(deck, faceUp[0]) === symbolOf(deck, faceUp[1]);

	const previewMs = Math.min(
		PREVIEW_BASE_MS + PREVIEW_PER_PAIR_MS * pairs,
		PREVIEW_MAX_MS,
	);

	/** Keeps a pair or turns it back, and clears the two cards off the table.
	 * Called from the timer that holds a pair up, and again from the next tap if
	 * one arrives first — whichever gets there, the outcome is the same, and the
	 * cards it names are the ones it settles. */
	const settle = useCallback(
		(pending: string[]) => {
			const [first, second] = pending;

			if (first && second) {
				const isPairTurned = symbolOf(deck, first) === symbolOf(deck, second);

				if (isPairTurned) {
					setMatched((cards) =>
						cards.includes(first) ? cards : [...cards, first, second],
					);
				}

				// One turn is one attempt, whichever way it went. This is the only
				// place the game learns anything about how the board is going, so it
				// is the only place that counts.
				const turn = `${first}|${second}`;

				if (lastCounted.current !== turn) {
					lastCounted.current = turn;
					session.record(isPairTurned);
				}
			}

			setFaceUp((cards) => (cards === pending ? [] : cards));
		},
		[deck, session],
	);

	// The look at the board is the only thing in the game that happens on a
	// clock. There is no button to end it early and nothing else on screen while
	// it runs: the one thing to do here is look at the cards, and the bar
	// draining above them says how much longer there is to do it for.
	useEffect(() => {
		if (phase !== "preview") {
			return;
		}

		// Emptying the bar is a state change like any other; the long duration
		// below is what turns the travel into the countdown itself, so the bar and
		// the timer cannot drift apart.
		setPreviewLeft(0);

		const timer = setTimeout(() => {
			// The session's clock starts when the cards turn over, not when the board
			// is dealt. The preview is something shown to the reader rather than
			// something they are doing, and counting it would make a long, careful
			// look at the cards read afterwards as a slow start.
			session.begin({
				difficulty: levelIndex + 1,
				total: pairs,
				// A board can be cleared in one turn per pair. That perfect run is what
				// this run is measured against — never another person's (§2.4).
				idealAttempts: pairs,
			});
			setPhase("playing");
		}, previewMs);

		return () => clearTimeout(timer);
	}, [phase, previewMs, session, levelIndex, pairs]);

	// Two cards are up: hold them there long enough to be looked at, then either
	// keep them or turn them back.
	useEffect(() => {
		if (faceUp.length < 2) {
			return;
		}

		const timer = setTimeout(
			() => settle(faceUp),
			isPair ? PAIR_HELD_MS : MISMATCH_HELD_MS,
		);

		return () => clearTimeout(timer);
	}, [faceUp, isPair, settle]);

	useEffect(() => {
		if (deck.length > 0 && matched.length === deck.length) {
			const stats = session.finish();

			setPhase("won");

			// Only the call that actually closed the board has numbers; a second
			// pass through here gets null, and letting that through would empty the
			// card the reader is looking at.
			if (stats) {
				setSummary(stats);
			}
		}
	}, [matched.length, deck.length, session]);

	const start = (index: number) => {
		const next = LEVELS[index] ?? LEVELS[0];

		// A board still in play when the next one is dealt was put down, and it is
		// written down as one rather than lost. Nothing about an unfinished board
		// counts against the reader — `data-model.md` keeps it precisely because
		// walking away half way through is ordinary and worth knowing about.
		session.abandon();

		setLevelIndex(index);
		setRound((dealt) => dealt + 1);
		setDeck(deal(next));
		setMatched([]);
		setFaceUp([]);
		setPreviewLeft(1);
		setPhase("preview");
		setSummary(null);
		lastCounted.current = null;
	};

	const turnOver = (id: string) => {
		if (phase !== "playing" || faceUp.includes(id) || matched.includes(id)) {
			return;
		}

		// A third card while two are still up does not wait its turn: the pair
		// under it is settled there and then and this card starts the next one.
		// The board was locked here once, and locking it meant a tap that landed
		// during the pause did nothing at all — which reads as the game having
		// stopped listening, and is exactly the moment a reader taps harder.
		if (faceUp.length >= 2) {
			settle(faceUp);
			setFaceUp([id]);

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
		<GameFrame
			title={t(`games.matching.levels.${level.id}.name`)}
			onClose={() => router.back()}
			onSettings={() => router.push("/account/appearance")}
			closeLabel={t("games.matching.close")}
			settingsLabel={t("games.matching.settings")}
		>
			<View style={styles.meter}>
				{/* Two different bars, never the same one relabelled: one is the time
            left to look, the other is how much of the board has been found,
            and a bar that changed its mind about what it measures would be the
            most confusing thing on the screen. The key remounts it full for
            each new board, so it only ever drains. */}
				{phase === "preview" ? (
					<ProgressBar
						key={`preview-${round}`}
						value={previewLeft}
						tone="accent"
						durationMs={previewMs}
						accessibilityLabel={t("games.matching.previewLabel")}
					/>
				) : (
					<ProgressBar
						value={pairsFound / pairs}
						tone={phase === "won" ? "success" : "primary"}
						accessibilityLabel={t("games.matching.progressLabel")}
					/>
				)}

				{/* The one line of words on the board, and the only thing anyone who
            cannot see it has to go on: it always says what just happened, and
            is read out whenever it changes. */}
				<Text
					variant="bodyLarge"
					color={phase === "won" || isPair ? "success" : "textSecondary"}
					center
					accessibilityLiveRegion="polite"
				>
					{statusOf({ t, phase, faceUp, isPair, pairsFound, pairs })}
				</Text>
			</View>

			<View style={styles.container}>
				<MemoryBoard
					cards={cards}
					columns={level.columns}
					faceDownLabel={t("games.matching.faceDown")}
					matchedLabel={(name) => t("games.matching.matchedCard", { name })}
					onPressCard={turnOver}
				/>
			</View>

			{/* The board stays behind the dialog exactly as it was finished. Coming
          back to a cleared screen would take away the thing the reader just
          did — the green squares are the record of it. */}
			<Dialog
				visible={phase === "won"}
				icon="celebrate"
				title={t("games.matching.doneTitle")}
				message={t("games.matching.doneMessage", { count: pairs })}
				backdrop={<Confetti run={round} />}
				details={
					summary ? (
						<>
							<GameSummary
								stats={summary}
								foundLabel={t("games.matching.pairsLabel")}
							/>
							{/* Stripped from a release build, so the reader never meets it —
                  see `GameStatsDetail`. */}
							{__DEV__ ? <GameStatsDetail stats={summary} /> : null}
						</>
					) : null
				}
				onRequestClose={() => router.back()}
			>
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
			</Dialog>
		</GameFrame>
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
	container: {
		flex: 1,
		padding: Spacing.md,
		gap: Spacing.md,
		justifyContent: "center",
	},
	meter: {
		gap: Spacing.md,
	},
});
