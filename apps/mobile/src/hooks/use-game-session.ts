import { useCallback, useEffect, useMemo, useRef } from "react";

import { remember } from "@/lib/game-history";
import type { Attempt, SessionStats } from "@/lib/game-stats";
import { summariseSession } from "@/lib/game-stats";

/** What one round of a game is: which rung, how much there is to find, and — if
 * the game has such a thing — the fewest attempts it could take. */
export type GameRound = {
	/** Which rung of this game's ladder, counting from one. */
	difficulty: number;
	/** How many correct answers this round holds. */
	total: number;
	/** The fewest attempts this round could possibly be finished in. */
	idealAttempts?: number;
};

export type GameSession = {
	/** Start the clock. Call it when play actually begins — not when the screen
	 * mounts, and not while a preview is still running. An open round is
	 * abandoned first, so starting a fresh board never loses the last one. */
	begin: (round: GameRound) => void;
	/** One thing the reader did, right or wrong. Times itself. */
	record: (correct: boolean) => void;
	/** The round was completed. Returns the row, or null if none was open. */
	finish: () => SessionStats | null;
	/** The round was put down. Recorded exactly like a finished one. */
	abandon: () => SessionStats | null;
	/** The numbers as they stand, without closing anything. */
	snapshot: () => SessionStats | null;
};

export type GameSessionOptions = {
	/** Stable across releases — the key the reader's history is grouped by. */
	gameId: string;
	/** Where a closed session goes. Defaults to the on-device history. */
	onSession?: (stats: SessionStats) => void;
};

/**
 * Stats for a game, kept the same way for every game.
 *
 * A game calls `begin` when play starts and `record` once per attempt; whether
 * the round is finished or put down, a `SessionStats` row comes out the far end
 * and goes to the history. The timing of each attempt happens here so no game
 * has to hold a stopwatch, and every game's numbers mean the same thing.
 *
 * **Nothing here re-renders the screen.** The running session lives in a ref, so
 * recording an attempt on a board of a hundred and forty-four cards costs a
 * function call and not a render pass. `snapshot` is a function rather than a
 * piece of state for the same reason — a game that wants to show a live number
 * asks for it at the moment it draws.
 *
 * This hook owns the clock and `game-stats.ts` owns the arithmetic, deliberately
 * (`decisions.md` D-07): the module the adaptive engine will sit next to stays
 * pure and testable, and the impure half is thirty lines that can be read at a
 * glance.
 *
 * A round still open when the screen unmounts is abandoned rather than dropped.
 * Someone with dementia putting a game down half-finished is ordinary, not a
 * failure, and the run they did play is exactly as much evidence about how they
 * are doing as one they finished — `data-model.md` records both and penalises
 * neither.
 */
export function useGameSession(options: GameSessionOptions): GameSession {
	const optionsRef = useRef(options);
	const run = useRef<Run | null>(null);

	// Kept in step through an effect rather than assigned while rendering, so a
	// game can pass an inline `onSession` without every render mutating a ref
	// mid-render. Sessions only ever close from an event or an effect, both of
	// which run after this one.
	useEffect(() => {
		optionsRef.current = options;
	});

	const close = useCallback((completed: boolean): SessionStats | null => {
		const current = run.current;

		if (!current) {
			return null;
		}

		run.current = null;

		const stats = summarise(current, optionsRef.current.gameId, completed);
		const { onSession } = optionsRef.current;

		if (onSession) {
			onSession(stats);
		} else {
			remember(stats);
		}

		return stats;
	}, []);

	const begin = useCallback(
		(round: GameRound) => {
			// A board left open when the next one is dealt is a board that was put
			// down, and it records as one. Silently overwriting it would lose the
			// most telling session there is: the one they walked away from.
			close(false);

			const tick = elapsed();

			run.current = {
				round,
				startedAt: Date.now(),
				startedTick: tick,
				lastTick: tick,
				attempts: [],
			};
		},
		[close],
	);

	const record = useCallback((correct: boolean) => {
		const current = run.current;

		if (!current) {
			return;
		}

		const tick = elapsed();

		current.attempts.push({
			correct,
			responseMs: Math.max(0, Math.round(tick - current.lastTick)),
		});
		current.lastTick = tick;
	}, []);

	const finish = useCallback(() => close(true), [close]);
	const abandon = useCallback(() => close(false), [close]);

	const snapshot = useCallback(
		() =>
			run.current
				? summarise(run.current, optionsRef.current.gameId, false)
				: null,
		[],
	);

	// The cleanup runs on unmount only: a screen that goes away mid-board closes
	// the board on its way out.
	useEffect(() => () => void close(false), [close]);

	return useMemo(
		() => ({ begin, record, finish, abandon, snapshot }),
		[begin, record, finish, abandon, snapshot],
	);
}

/** A round in progress. Mutable on purpose — see the note about renders above. */
type Run = {
	round: GameRound;
	/** Epoch ms, for the row. */
	startedAt: number;
	/** The same instant on the monotonic clock, for the durations. */
	startedTick: number;
	lastTick: number;
	attempts: Attempt[];
};

function summarise(run: Run, gameId: string, completed: boolean): SessionStats {
	// Both ends of the session are placed by the monotonic clock and only then
	// expressed as epoch time. A phone that corrects its clock mid-board — or
	// crosses a timezone on a train — would otherwise hand the history a run
	// that took minus twenty minutes.
	const endedAt = run.startedAt + Math.round(elapsed() - run.startedTick);

	return summariseSession({
		gameId,
		difficulty: run.round.difficulty,
		total: run.round.total,
		idealAttempts: run.round.idealAttempts,
		startedAt: run.startedAt,
		endedAt,
		completed,
		attempts: run.attempts,
	});
}

/**
 * Milliseconds since some fixed point, from a clock that only ever moves
 * forward. `performance` is present on Hermes and on web; the fallback is there
 * for the rare runtime where it is not, and is wrong only in the same way every
 * `Date.now()` duration is.
 */
const elapsed = (): number =>
	typeof performance?.now === "function" ? performance.now() : Date.now();
