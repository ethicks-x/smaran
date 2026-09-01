import type { SessionStats } from "./game-stats";

/**
 * Which board to offer next, and why — decided from this reader's own recent
 * rounds and from nothing else.
 *
 * Pure, and it stays pure (`AGENTS.md` §6, `decisions.md` D-07): no storage
 * handle, no fetch, no clock, no randomness. The history arrives as an array of
 * numbers and a rung comes back out, which is what lets three hand-typed
 * histories prove the behaviour and what will let a model take this function's
 * place one day without a game or a table changing shape.
 *
 * **There is no benchmark in this file.** Not a target accuracy, not a par time,
 * not a pass mark — §2.4 and D-08 rule out a population score everywhere, and a
 * constant tuned to "what a person with dementia should manage" would be one
 * wearing a different coat. Every threshold below is a *margin*: how far a run
 * has to sit from the same reader's own recent mean before it counts as clearly
 * different. The one exception is the very first board, which has no earlier run
 * to sit against and is judged against the board's own arithmetic — the fewest
 * turns it could possibly have taken. That is a fact about the board, not about
 * anybody.
 *
 * The rules are deliberately plain. Three outcomes, one comparison, and a
 * tie-break on pace; a judge — and more to the point a caregiver — can only ever
 * see the behaviour, and behaviour that can be explained in a sentence is worth
 * more here than behaviour that cannot.
 */

/** What the engine decided to do with the ladder. */
export type DifficultyDirection = "up" | "hold" | "down";

/**
 * Why it decided that, as a code rather than a sentence.
 *
 * The words live in the locale catalogues — one whole sentence per code per
 * language (D-12). A pure function must not know English.
 */
export type DifficultyReason =
	| "firstBoard"
	| "easy"
	| "steady"
	| "hard"
	| "topBoard"
	| "gentlest";

export type DifficultyAdvice = {
	/** The rung to play next, counting from one, already inside the ladder. */
	difficulty: number;
	direction: DifficultyDirection;
	reason: DifficultyReason;
};

export type DifficultyLadder = {
	/** The rung just played, or the one about to be, counting from one. */
	current: number;
	/** How many rungs this game has. The advice is clamped into it. */
	rungs: number;
};

/**
 * How many earlier rounds make up the baseline.
 *
 * Recent rather than lifetime, on purpose: the question is how today is going
 * against how the last week or so went, and a good month in the spring should
 * not still be setting the bar in the autumn. Five is enough to absorb one
 * unusual round and short enough to follow someone as they change.
 */
const BASELINE_WINDOW = 5;

/**
 * How far from their own recent mean a round has to land before it means
 * anything. Below this the two rounds are the same round with different cards,
 * and the ladder should stay where it is.
 */
const MARGIN = 0.08;

/**
 * A round with no history behind it, judged against the board's own floor. Above
 * the first the board plainly had room in it; below the second it plainly asked
 * a lot. Between them the honest answer is that we do not know yet, and the
 * ladder holds.
 */
const FIRST_RUN_EASY = 0.7;
const FIRST_RUN_HARD = 0.4;

/**
 * How much quicker than their own recent pace counts as clearly quicker. Used
 * only to turn a "hold" into an "up" — never the other way. A slow round is not
 * a worse round: nothing in this app is timed and §2.3 forbids treating
 * slowness as a fault, so pace can earn a bigger board and can never cost one.
 */
const QUICKER = 1.25;

/**
 * The next board for this reader, from their own recent rounds.
 *
 * `history` is newest first and already narrowed to one game — the order and
 * shape `recentSessions()` returns. An empty history is the ordinary case on a
 * new device and gets the gentlest rung.
 */
export function adjustDifficulty(
	history: readonly SessionStats[],
	ladder: DifficultyLadder,
): DifficultyAdvice {
	const rungs = Math.max(1, ladder.rungs);
	const current = clampRung(ladder.current, rungs);
	const verdict = verdictOf(history);

	if (verdict === "firstBoard") {
		return { difficulty: 1, direction: "hold", reason: "firstBoard" };
	}

	if (verdict === "easy") {
		// Clamped, and the reason changes with it. Offering nothing while saying
		// "here is a bigger one" is the kind of small lie that makes a reader stop
		// trusting the rest of the screen.
		return current >= rungs
			? { difficulty: rungs, direction: "hold", reason: "topBoard" }
			: { difficulty: current + 1, direction: "up", reason: "easy" };
	}

	if (verdict === "hard") {
		return current <= 1
			? { difficulty: 1, direction: "hold", reason: "gentlest" }
			: { difficulty: current - 1, direction: "down", reason: "hard" };
	}

	return { difficulty: current, direction: "hold", reason: "steady" };
}

/** What the last round was, relative to the ones before it. */
type Verdict = "firstBoard" | "easy" | "steady" | "hard";

function verdictOf(history: readonly SessionStats[]): Verdict {
	const [last, ...earlier] = history;

	if (!last) {
		return "firstBoard";
	}

	const now = easeOf(last);
	const baseline = earlier.slice(0, BASELINE_WINDOW);

	// One round on the device and nothing to compare it against yet. The board's
	// own floor is all there is, and it is at least a fact about that board.
	if (baseline.length === 0) {
		if (now >= FIRST_RUN_EASY) {
			return "easy";
		}

		return now <= FIRST_RUN_HARD ? "hard" : "steady";
	}

	const usual = mean(baseline.map(easeOf));

	if (now >= usual + MARGIN) {
		return "easy";
	}

	if (now <= usual - MARGIN) {
		return "hard";
	}

	// The round read as ordinary, but they got through it noticeably faster than
	// they have lately. That is the board having room in it, and it is the case
	// this whole tie-break exists for.
	return isQuicker(last, baseline) ? "easy" : "steady";
}

/**
 * How comfortable one round was, as a number between 0 and 1.
 *
 * The mean of whatever the round can say about itself: how many of the turns
 * were right, how close it came to the fewest turns it could have taken, and how
 * much of the board was found. A game with no perfect-run floor simply
 * contributes two numbers instead of three rather than needing its own rule.
 *
 * A board that was put down needs no penalty bolted on — it lands here with a
 * low `completion` because less of it was found, which is the truth about the
 * round rather than a judgement about the reader.
 */
function easeOf(session: SessionStats): number {
	const parts = [session.accuracy, session.completion];

	if (session.precision !== null) {
		parts.push(session.precision);
	}

	return mean(parts);
}

/**
 * Was this round quicker than their own recent ones, clearly?
 *
 * Median rather than mean, both sides: one turn taken while someone answered the
 * door should not decide what board they are offered next.
 */
function isQuicker(
	last: SessionStats,
	baseline: readonly SessionStats[],
): boolean {
	const usual = mean(baseline.map((session) => session.medianResponseMs));

	return last.medianResponseMs > 0 && usual >= last.medianResponseMs * QUICKER;
}

const clampRung = (rung: number, rungs: number) =>
	Math.min(rungs, Math.max(1, Math.round(rung)));

const mean = (values: readonly number[]) =>
	values.length > 0
		? values.reduce((sum, value) => sum + value, 0) / values.length
		: 0;
