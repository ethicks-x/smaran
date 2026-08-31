/**
 * What a run at a game was worth, in numbers — and nothing else.
 *
 * Every function here is pure: no clock, no storage, no randomness. A session
 * arrives fully described (when it started, when it ended, and every attempt in
 * between) and leaves as a `SessionStats`. That is the same seam
 * `adjustDifficulty` sits behind (`decisions.md` D-07): the thing that decides
 * how hard the next board should be must be testable by handing it numbers, and
 * it cannot be if the numbers are read off a clock halfway down the file. The
 * clock lives in `useGameSession`, which is the only caller that needs one.
 *
 * Every number here is about **this** reader and nothing but this reader
 * (`AGENTS.md` §2.4). There is no benchmark in this file, no target to clear and
 * no pass mark — a run is only ever compared against the same person's earlier
 * runs, by whatever reads these rows later.
 *
 * The shape mirrors `game_session` in `data-model.md` §1 so a finished session
 * can be written to SQLite as-is once the local store lands. Raw counts are kept
 * alongside the ratios on purpose: what "accuracy" means will change, and the
 * facts underneath it should not have to be collected again when it does.
 */

/** One thing the reader did that the game could call right or wrong. */
export type Attempt = {
	correct: boolean;
	/**
	 * How long they took over it — from the moment the game was ready for this
	 * attempt to the moment they finished making it. Never includes time spent
	 * watching an animation or a preview; that is not thinking time.
	 */
	responseMs: number;
};

/** Everything a completed or abandoned run is made of. */
export type SessionInput = {
	/** Stable across releases — it is the key the history is grouped by. */
	gameId: string;
	/** Which rung of this game's own ladder was played, counting from one. */
	difficulty: number;
	/** Epoch ms, both. */
	startedAt: number;
	endedAt: number;
	/** How many correct answers the round held — the pairs on the board. */
	total: number;
	/**
	 * The fewest attempts this round could possibly have taken, when the game
	 * has such a number. Matching pairs does: one turn per pair, if you never
	 * once turned over a card you had already seen.
	 */
	idealAttempts?: number;
	/** False for a board that was put down. Recorded all the same, never penalised. */
	completed: boolean;
	attempts: readonly Attempt[];
};

/**
 * The derived record. `attempts` here is a count, where `SessionInput.attempts`
 * is the list — the count is what `data-model.md` stores and what the engine
 * reads.
 */
export type SessionStats = {
	gameId: string;
	difficulty: number;
	startedAt: number;
	endedAt: number;
	/** Wall-clock from first attempt to last, including every pause. */
	durationMs: number;
	/** The sum of the attempts themselves — the same run with the pauses taken out. */
	timeOnTaskMs: number;
	/** How many attempts were made. */
	attempts: number;
	/** How many of them were right. */
	correct: number;
	/** How many there were to get right. */
	total: number;
	completed: boolean;
	/** Of the attempts made, the share that were right. 0–1. */
	accuracy: number;
	/**
	 * How close the run came to the fewest attempts it could have taken. 1 is a
	 * flawless run; half means it took twice as many turns as it had to. Null
	 * when the game does not have a floor to measure against.
	 */
	precision: number | null;
	/** How much of the round was finished. 0–1, and 1 whenever `completed`. */
	completion: number;
	/** Mean thinking time per attempt, in whole milliseconds. */
	avgResponseMs: number;
	/** The middle attempt's time — unmoved by the one turn someone walked away in the middle of. */
	medianResponseMs: number;
	/**
	 * How even the pace was: 1 for a metronome, 0 for a run that swung wildly.
	 * Null under two attempts, where there is no spread to measure.
	 *
	 * It is the coefficient of variation (spread relative to the reader's own
	 * mean) subtracted from one, which is what keeps it a personal number: a
	 * slow, steady reader and a quick, steady one both score near 1.
	 */
	consistency: number | null;
	/** The longest run of right answers in a row. */
	longestStreak: number;
};

/**
 * Turn a finished run into the row that gets kept.
 *
 * Safe on an empty run — a board opened and closed without a single turn is a
 * real thing that happens, and it records as zeros rather than as `NaN` from a
 * division that was never guarded.
 */
export function summariseSession(input: SessionInput): SessionStats {
	const { attempts, total, idealAttempts } = input;

	const times = attempts.map((attempt) => attempt.responseMs);
	const correct = attempts.filter((attempt) => attempt.correct).length;
	const timeOnTaskMs = times.reduce((sum, ms) => sum + ms, 0);

	return {
		gameId: input.gameId,
		difficulty: input.difficulty,
		startedAt: input.startedAt,
		endedAt: input.endedAt,
		durationMs: Math.max(0, input.endedAt - input.startedAt),
		timeOnTaskMs,
		attempts: attempts.length,
		correct,
		total,
		completed: input.completed,
		accuracy: ratio(correct, attempts.length),
		precision:
			idealAttempts && attempts.length > 0
				? clamp01(round(idealAttempts / attempts.length))
				: null,
		completion: ratio(correct, total),
		avgResponseMs: attempts.length > 0 ? Math.round(mean(times)) : 0,
		medianResponseMs: Math.round(median(times)),
		consistency: consistencyOf(times),
		longestStreak: longestStreakOf(attempts),
	};
}

/**
 * Pace, as a number between 0 and 1.
 *
 * Spread is measured against the reader's own mean rather than in raw
 * milliseconds, because a two-second swing means something quite different to
 * someone whose turns take three seconds than to someone whose turns take
 * fifteen. A coefficient of variation above 1 — a run more scattered than it is
 * long — is simply the floor; there is nothing below "completely uneven" worth
 * distinguishing.
 */
function consistencyOf(times: readonly number[]): number | null {
	if (times.length < 2) {
		return null;
	}

	const average = mean(times);

	if (average <= 0) {
		return null;
	}

	const variance =
		times.reduce((sum, ms) => sum + (ms - average) ** 2, 0) / times.length;

	return clamp01(round(1 - Math.sqrt(variance) / average));
}

function longestStreakOf(attempts: readonly Attempt[]): number {
	let longest = 0;
	let running = 0;

	for (const attempt of attempts) {
		running = attempt.correct ? running + 1 : 0;
		longest = Math.max(longest, running);
	}

	return longest;
}

const mean = (values: readonly number[]) =>
	values.reduce((sum, value) => sum + value, 0) / values.length;

/** The middle value, or the average of the two middle ones. Empty is 0. */
function median(values: readonly number[]): number {
	if (values.length === 0) {
		return 0;
	}

	const sorted = [...values].sort((left, right) => left - right);
	const middle = Math.floor(sorted.length / 2);

	return sorted.length % 2 === 1
		? (sorted[middle] ?? 0)
		: ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

/** A share of a whole, guarded — a denominator of zero is 0, never `NaN`. */
const ratio = (part: number, whole: number) =>
	whole > 0 ? clamp01(round(part / whole)) : 0;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Three decimals is finer than any of these numbers is honest to. */
const round = (value: number) => Math.round(value * 1000) / 1000;
