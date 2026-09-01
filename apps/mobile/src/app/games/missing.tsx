import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import type {
	GridItem,
	MissingOption,
	OptionMode,
	SymbolId,
	SymbolPool,
} from "@/components/games";
import {
	GameFrame,
	GameStatsDetail,
	GameSummary,
	ItemGrid,
	MissingOptions,
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
import { adjustDifficulty, type DifficultyAdvice } from "@/lib/adaptive";
import { recentSessions } from "@/lib/game-history";
import type { SessionStats } from "@/lib/game-stats";
import { Spacing } from "@/theme";

/** The key this game's sessions are grouped under, here and on the server. */
const GAME_ID = "missing";

/**
 * The boards, easiest first.
 *
 * Difficulty is four dials rather than the ladder's one: how many things there
 * are to hold in mind, how many of them go away, how many answers are offered,
 * and — the dial this game is really about — whether the answers are pictures
 * or names. A picture is recognised on sight; a name has to be turned back into
 * a picture first and then looked for, which is a step further from the board
 * and the reason the top two rungs use it.
 *
 * Every board draws its decoys from things it never showed (see `deal`), so its
 * pool has to be big enough for the board *and* those decoys:
 * `items + missing * (options - 1) <= pool`. The four boards below need 8, 12,
 * 18 and 24 against pools of 24, 24, 24 and 86.
 */
const LEVELS = [
	{
		id: "six",
		items: 6,
		columns: 3,
		missing: 1,
		options: 3,
		mode: "picture",
		pool: "plain",
	},
	{
		id: "nine",
		items: 9,
		columns: 3,
		missing: 1,
		options: 4,
		mode: "picture",
		pool: "plain",
	},
	{
		id: "twelve",
		items: 12,
		columns: 4,
		missing: 2,
		options: 4,
		mode: "word",
		pool: "plain",
	},
	{
		id: "sixteen",
		items: 16,
		columns: 4,
		missing: 2,
		options: 5,
		mode: "word",
		pool: "wide",
	},
] as const satisfies readonly {
	id: string;
	/** How many things are shown to begin with. */
	items: number;
	/** Tiles to a row. */
	columns: number;
	/** How many of them go away. */
	missing: number;
	/** How many answers are offered per question, the right one included. */
	options: number;
	mode: OptionMode;
	pool: SymbolPool;
}[];

type Level = (typeof LEVELS)[number];

/** How long the things are shown before they go away, and how much longer for
 * every extra thing on the board. Generous, and capped: sixteen things is more
 * than anyone studies to the last one anyway, and a bar that sits there for
 * fifteen seconds stops reading as "shortly" and starts reading as "stuck". */
const STUDY_BASE_MS = 2600;
const STUDY_PER_ITEM_MS = 700;
const STUDY_MAX_MS = 12000;

/** How long a thing that has just been named sits back on the board, green,
 * before the next question is asked. Long enough to watch it arrive. */
const FOUND_HELD_MS = 1100;

/**
 * One place on the answer board: a thing, or a gap where one used to be.
 *
 * A gap keeps its place in the grid rather than the board simply being shorter,
 * so the reader can see how many things went and can see one of them come back
 * into the hole it left.
 */
type Slot = {
	id: string;
	/** Null for a gap. */
	item: SymbolId | null;
	/** Which question fills this gap, counting from zero. Null for a thing that
	 * never left. */
	question: number | null;
};

/** One board: what was shown, what came back, and the questions to ask. */
type Board = {
	/** Everything, in the order it is studied. */
	shown: readonly SymbolId[];
	/** The answer board — the same things in a fresh order, with a gap in place
	 * of each one that went. */
	slots: readonly Slot[];
	/** One question per thing that went, asked in order. */
	questions: readonly { answer: SymbolId; options: readonly SymbolId[] }[];
};

type Phase = "study" | "asking" | "settling" | "won";

/**
 * Find what is missing — a handful of things to look at, then the same things
 * again in a different order with one or two of them gone.
 *
 * The board opens with everything on it and a bar draining above, exactly as
 * Matching pairs does (D-19): the one thing to do while that runs is look, so
 * there is no button on screen to decide about. When it ends the things come
 * back shuffled and short, and the question underneath is answered by tapping
 * one of a handful of large options.
 *
 * **The options are things this board never showed.** Only the right answer was
 * ever on it, so the question cannot be settled by checking each option against
 * the board in front of you — it has to be remembered. Decoys drawn from things
 * still on the board made this a spot-the-difference instead, solvable without
 * remembering anything, which is not the game.
 *
 * **Nothing about a wrong answer takes anything away.** The option is tinted and
 * stays where it is, the board is untouched, and the line under the bar says
 * plainly that the thing tapped was not one of them — never that the reader was
 * wrong. There is no limit on tries and no way to lose. A thing that *is* named
 * drops back into the gap it left, in the app's success green, and stays there:
 * the same promise `MemoryCard` makes about a matched pair, so the board only
 * ever gains and never changes shape underneath a reader who has started to
 * learn it.
 *
 * Everything here is on-device (§2.1). Every board is measured by
 * `useGameSession` — one attempt per tap, right or wrong, timed — and the row is
 * written to SQLite whether the board was finished or put down. The reader is
 * never shown a score; the numbers are for the caregiver dashboard and for the
 * engine.
 *
 * `adjustDifficulty` is read twice, the same two places Matching pairs reads it
 * (D-26): once on the way in to choose the opening board from this reader's own
 * rounds, and once when a board is finished, to offer the next one and say why
 * in a sentence. Both reads happen here so the engine stays a pure function over
 * numbers (`AGENTS.md` §6), and both are narrowed to this game — the two ladders
 * are separate, because being comfortable with a grid of cards says nothing
 * about being comfortable with a list of names.
 */
export default function MissingScreen() {
	const { t } = useTranslation();

	const session = useGameSession({ gameId: GAME_ID });

	// Where this reader starts is their own recent rounds' business (§2.4). Read
	// once, on the first render: nothing changes the history while the screen is
	// open except this screen finishing a board, and that is handled where it
	// happens.
	const [levelIndex, setLevelIndex] = useState(openingIndex);
	const level = LEVELS[levelIndex] ?? LEVELS[0];

	/** Counts the boards dealt this sitting. Nothing reads it as a score — it is
	 * what tells the draining bar and the confetti that this is a new board and
	 * not the last one still running. */
	const [round, setRound] = useState(0);

	const [board, setBoard] = useState<Board>(() =>
		deal(LEVELS[levelIndex] ?? LEVELS[0]),
	);
	const [phase, setPhase] = useState<Phase>("study");
	const [studyLeft, setStudyLeft] = useState(1);

	/** Which question is being asked, counting from zero. */
	const [askIndex, setAskIndex] = useState(0);

	/** Options tried on the current question and found not to have been there.
	 * Cleared with each new question. */
	const [wrong, setWrong] = useState<SymbolId[]>([]);

	/** The things that have been named and put back. Grows across the whole
	 * board and is never cleared until the next deal. */
	const [found, setFound] = useState<SymbolId[]>([]);

	/** The finished board's own numbers, kept so the dialog can show what just
	 * happened. Null until a board is cleared, and cleared again with the next
	 * deal — the card is about this board and no other. */
	const [summary, setSummary] = useState<SessionStats | null>(null);

	/** What the engine made of the board that was just finished — which board to
	 * offer next, and the reason the dialog says out loud. */
	const [advice, setAdvice] = useState<DifficultyAdvice | null>(null);

	const toFind = board.questions.length;
	const question = board.questions[askIndex];

	const studyMs = Math.min(
		STUDY_BASE_MS + STUDY_PER_ITEM_MS * level.items,
		STUDY_MAX_MS,
	);

	// The look at the board is the only thing in the game that happens on a
	// clock. There is no button to end it early and nothing else on screen while
	// it runs: the one thing to do here is look, and the bar draining above says
	// how much longer there is to do it for.
	useEffect(() => {
		if (phase !== "study") {
			return;
		}

		// Emptying the bar is a state change like any other; the long duration
		// handed to it below is what turns the travel into the countdown itself,
		// so the bar and the timer cannot drift apart.
		setStudyLeft(0);

		const timer = setTimeout(() => {
			// The session's clock starts when the things go away, not when the board
			// is dealt. The study is something shown to the reader rather than
			// something they are doing, and counting it would make a long, careful
			// look read afterwards as a slow start.
			session.begin({
				difficulty: levelIndex + 1,
				total: toFind,
				// One tap per missing thing is the fewest this board could take. That
				// perfect run is what this run is measured against — never another
				// person's (§2.4).
				idealAttempts: toFind,
			});
			setPhase("asking");
		}, studyMs);

		return () => clearTimeout(timer);
	}, [phase, studyMs, session, levelIndex, toFind]);

	// A thing has just been named and is back on the board. Hold it there long
	// enough to be seen arriving, then ask the next question — or, if that was
	// the last one, close the board.
	useEffect(() => {
		if (phase !== "settling") {
			return;
		}

		const timer = setTimeout(() => {
			if (askIndex + 1 < toFind) {
				setAskIndex((asked) => asked + 1);
				setWrong([]);
				setPhase("asking");

				return;
			}

			const stats = session.finish();

			setPhase("won");

			// Only the call that actually closed the board has numbers; a second
			// pass through here would get null, and letting that through would empty
			// the card the reader is looking at.
			if (stats) {
				setSummary(stats);

				// `finish` has already written the row, so the board just played is
				// the newest thing in the history the engine is about to read — which
				// is what makes the offer about the round the reader is looking at.
				setAdvice(
					adjustDifficulty(recentSessions({ gameId: GAME_ID }), {
						current: stats.difficulty,
						rungs: LEVELS.length,
					}),
				);
			}
		}, FOUND_HELD_MS);

		return () => clearTimeout(timer);
	}, [phase, askIndex, toFind, session]);

	const start = (index: number) => {
		const next = LEVELS[index] ?? LEVELS[0];

		// A board still in play when the next one is dealt was put down, and it is
		// written down as one rather than lost. Nothing about an unfinished board
		// counts against the reader — `data-model.md` keeps it precisely because
		// walking away half way through is ordinary and worth knowing about.
		session.abandon();

		setLevelIndex(index);
		setRound((dealt) => dealt + 1);
		setBoard(deal(next));
		setAskIndex(0);
		setWrong([]);
		setFound([]);
		setStudyLeft(1);
		setPhase("study");
		setSummary(null);
		setAdvice(null);
	};

	const choose = (id: string) => {
		// Only while a question is actually open: a tap landing during the hold
		// after a right answer belongs to nothing, and counting it would put an
		// attempt against a question that was already over.
		if (phase !== "asking" || !question) {
			return;
		}

		// The tapped id is read back out of the question's own options rather than
		// asserted to be a symbol, which is what keeps the rest of this function
		// typed without a cast.
		const picked = question.options.find((option) => option === id);

		if (!picked || wrong.includes(picked)) {
			return;
		}

		const right = picked === question.answer;

		// One tap is one attempt, whichever way it went. This is the only place the
		// game learns anything about how the board is going, so it is the only
		// place that counts.
		session.record(right);

		if (!right) {
			setWrong((tried) => [...tried, picked]);

			return;
		}

		setFound((named) => [...named, question.answer]);
		setPhase("settling");
	};

	// While the things are being studied the whole board is on screen. After that
	// it is the same grid with a gap in place of each thing that went, and a gap
	// is filled the moment its question is answered — in place, so the board the
	// reader has been looking at never shuffles underneath them.
	const items: GridItem[] =
		phase === "study"
			? board.shown.map((symbol) => ({
					id: symbol,
					symbol: Symbols[symbol],
					label: t(`games.symbols.${symbol}`),
					state: "shown" as const,
				}))
			: board.slots.map((slot) => {
					// Answers arrive in question order, so the nth answer is the thing
					// that belongs in the gap the nth question is about.
					const restored =
						slot.question === null ? undefined : found[slot.question];
					const symbol = slot.item ?? restored;

					if (!symbol) {
						return {
							id: slot.id,
							symbol: "",
							label: t("games.missing.gapItem"),
							state: "gap" as const,
						};
					}

					const name = t(`games.symbols.${symbol}`);

					return {
						id: slot.id,
						symbol: Symbols[symbol],
						label: slot.item ? name : t("games.missing.restoredItem", { name }),
						state: slot.item ? ("shown" as const) : ("restored" as const),
					};
				});

	const options: MissingOption[] = (question?.options ?? []).map((symbol) => ({
		id: symbol,
		symbol: Symbols[symbol],
		name: t(`games.symbols.${symbol}`),
		state: wrong.includes(symbol)
			? "wrong"
			: found.includes(symbol)
				? "correct"
				: "idle",
	}));

	// The rung the engine offered, and whether taking it means a different board
	// at all — at the top of the ladder, or on a run that read as ordinary, the
	// honest offer is this board again.
	const offeredIndex = advice ? advice.difficulty - 1 : levelIndex;
	const offered = LEVELS[offeredIndex] ?? level;
	const offersAnotherBoard = advice !== null && offeredIndex !== levelIndex;

	return (
		<GameFrame
			title={t(`games.missing.levels.${level.id}.name`)}
			onClose={() => router.back()}
			onSettings={() => router.push("/account/appearance")}
			closeLabel={t("games.missing.close")}
			settingsLabel={t("games.missing.settings")}
		>
			<View style={styles.meter}>
				{/* Two different bars, never the same one relabelled: one is the time
            left to look, the other is how much of the board has been put back.
            The key remounts the countdown full for each new board, so it only
            ever drains. */}
				{phase === "study" ? (
					<ProgressBar
						key={`study-${round}`}
						value={studyLeft}
						tone="accent"
						durationMs={studyMs}
						accessibilityLabel={t("games.missing.studyLabel")}
					/>
				) : (
					<ProgressBar
						value={toFind > 0 ? found.length / toFind : 0}
						tone={phase === "won" ? "success" : "primary"}
						accessibilityLabel={t("games.missing.progressLabel")}
					/>
				)}

				{/* The one line of words on the board, and the only thing anyone who
            cannot see it has to go on: it always says what just happened, and
            is read out whenever it changes. */}
				<Text
					variant="bodyLarge"
					color={
						phase === "settling" || phase === "won"
							? "success"
							: "textSecondary"
					}
					center
					accessibilityLiveRegion="polite"
				>
					{statusOf({ t, phase, level, board, found, wrong })}
				</Text>
			</View>

			<View style={styles.container}>
				<ItemGrid items={items} columns={level.columns} />

				{/* Only ever on screen when there is a question open or one just
            answered. During the study there is nothing to answer yet, and once
            the board is done the dialog is what to read. */}
				{phase === "asking" || phase === "settling" ? (
					<MissingOptions
						options={options}
						mode={level.mode}
						label={t("games.missing.optionsLabel")}
						wrongLabel={(name) => t("games.missing.wrongOption", { name })}
						onPress={choose}
					/>
				) : null}
			</View>

			{/* The board stays behind the dialog exactly as it was finished. Coming
          back to a cleared screen would take away the thing the reader just
          did — the green tiles are the record of it. */}
			<Dialog
				visible={phase === "won"}
				icon="celebrate"
				title={t("games.missing.doneTitle")}
				message={t("games.missing.doneMessage", { count: toFind })}
				celebration={<Confetti run={round} />}
				details={
					summary ? (
						<>
							<GameSummary
								stats={summary}
								foundLabel={t("games.missing.foundLabel")}
							/>

							{/* Why the buttons below say what they say, in one sentence, in
                  their language. It compares this board against this reader's
                  own last few rounds of this game and never against anybody
                  else's (§2.4), and if it did that silently there would be
                  nothing here to see. Sits directly above the buttons on
                  purpose — it is the reason for the choice, so it is read
                  immediately before the choice is made. */}
							{advice ? (
								<Text variant="bodyLarge" center>
									{t(`games.missing.reason.${advice.reason}`)}
								</Text>
							) : null}

							{/* Stripped from a release build, so the reader never meets it —
                  see `GameStatsDetail`. */}
							{__DEV__ ? <GameStatsDetail stats={summary} /> : null}
						</>
					) : null
				}
				onRequestClose={() => router.back()}
			>
				{/* The one filled button, and it names the board rather than a
            direction: "the board with nine things" is a thing you can picture,
            "a harder board" is a thing you have to work out. */}
				{offersAnotherBoard ? (
					<ActionButton
						label={t(
							offeredIndex > levelIndex
								? "games.missing.offer.up"
								: "games.missing.offer.down",
							{ board: t(`games.missing.levels.${offered.id}.phrase`) },
						)}
						size="large"
						onPress={() => start(offeredIndex)}
					/>
				) : null}
				<ActionButton
					label={t("games.missing.again")}
					variant={offersAnotherBoard ? "outlined" : "filled"}
					size={offersAnotherBoard ? "comfortable" : "large"}
					onPress={() => start(levelIndex)}
				/>
				<ActionButton
					label={t("games.missing.finish")}
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
	level,
	board,
	found,
	wrong,
}: {
	t: ReturnType<typeof useTranslation>["t"];
	phase: Phase;
	level: Level;
	board: Board;
	found: readonly SymbolId[];
	wrong: readonly SymbolId[];
}) {
	if (phase === "study") {
		return t("games.missing.studyBody", { count: level.missing });
	}

	if (phase === "won") {
		return t("games.missing.doneTitle");
	}

	if (phase === "settling") {
		const justFound = found[found.length - 1];

		return justFound
			? t("games.missing.found", { name: t(`games.symbols.${justFound}`) })
			: t("games.missing.doneTitle");
	}

	// A wrong answer says what is true about the thing tapped — that it was never
	// one of them — rather than that the reader got it wrong. Only the most
	// recent one, because the line is read out on every change and a growing list
	// would be read out from the beginning each time.
	const lastWrong = wrong[wrong.length - 1];

	if (lastWrong) {
		return t("games.missing.notThatOne", {
			name: t(`games.symbols.${lastWrong}`),
		});
	}

	return t("games.missing.ask", {
		count: board.questions.length - found.length,
	});
}

/**
 * Which rung to open on, from this reader's own history of **this** game.
 *
 * A device with nothing on it opens on the gentlest board, which is also what
 * the engine says about an empty history — so there is no special case here,
 * only the ordinary answer to an ordinary question.
 */
function openingIndex(): number {
	const history = recentSessions({ gameId: GAME_ID });

	const { difficulty } = adjustDifficulty(history, {
		// The rung they last played is where the ladder is for them. On a device
		// with no history the engine ignores this and starts at the bottom.
		current: history[0]?.difficulty ?? 1,
		rungs: LEVELS.length,
	});

	return difficulty - 1;
}

/**
 * A board: as many things as the level asks for, with the first few of them
 * taken away again and a gap left where each one stood.
 *
 * The pool is shuffled before it is cut down to size, so playing the same board
 * twice is not the same board twice. The things that go are simply the front of
 * that shuffle — it is already in a random order, so taking the first one or two
 * is taking them at random without a second pass over the array.
 *
 * **Decoys are things this board never showed.** That is the whole difficulty of
 * the game and it was got wrong first time round: with decoys drawn from things
 * still on the board, every option but one could be found sitting there in front
 * of the reader, so the answer fell out of a look rather than out of
 * remembering. Drawn from outside the deck, none of the options is on the board
 * — the right one has gone and the rest were never there — so the only way to
 * tell them apart is to recognise the one that was studied. That also keeps
 * every question honestly answerable: the things that went are never offered as
 * decoys to each other, so exactly one option is right and the reader is never
 * right in a way the game calls wrong.
 *
 * No decoy is used twice on a board either, so two questions cannot offer the
 * same thing and mean different answers by it.
 */
function deal(level: Level): Board {
	// Read out through one narrow binding: `SymbolPools[level.pool]` is a union
	// of two differently-shaped readonly tuples, which nothing can be filtered
	// out of without this.
	const pool: readonly SymbolId[] = SymbolPools[level.pool];

	const items = shuffled(pool).slice(0, level.items);
	const gone = items.slice(0, level.missing);
	const left = items.slice(level.missing);

	const decoys = shuffled(pool.filter((symbol) => !items.includes(symbol)));
	const perQuestion = level.options - 1;

	return {
		shown: shuffled(items),
		slots: shuffled([
			...left.map((item, index) => ({
				id: `slot-${index}`,
				item,
				question: null,
			})),
			...gone.map((_, index) => ({
				id: `gap-${index}`,
				item: null,
				question: index,
			})),
		]),
		questions: gone.map((answer, index) => ({
			answer,
			options: shuffled([
				answer,
				...decoys.slice(index * perQuestion, (index + 1) * perQuestion),
			]),
		})),
	};
}

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
		gap: Spacing.xl,
		justifyContent: "center",
	},
	meter: {
		gap: Spacing.md,
	},
});
