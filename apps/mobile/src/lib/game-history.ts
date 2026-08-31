import type { SessionStats } from "./game-stats";

/**
 * Where finished sessions go until there is somewhere real to put them.
 *
 * This is a list in memory that lives as long as the app is open, and it is a
 * placeholder wearing the shape of the thing that replaces it. Games hand it a
 * session; the adaptive engine will ask it for the last few. Both sides can be
 * built now and neither has to change when the store underneath does.
 *
 * TODO: replace the array with the `game_session` table from `data-model.md` §1
 * once `expo-sqlite` + Drizzle land — writing the row and its `sync_queue`
 * entry in one transaction, as that file requires. `recentSessions` becomes a
 * query ordered by `ended_at`; `remember` becomes the insert. Nothing calling
 * either of them should need editing.
 *
 * Deliberately not the network (`AGENTS.md` §2.1): a session is written where
 * it happened, and syncing it is a separate, later, optional thing.
 */

/**
 * How many sessions are kept. The engine reads a recent window rather than a
 * lifetime, because the point is what this reader is doing *now* compared with
 * what they were doing lately (D-08) — and because an unbounded array on a
 * device that is never closed is a leak.
 */
const KEPT = 50;

let sessions: SessionStats[] = [];

/** Keep a finished — or abandoned — session. Newest last. */
export function remember(stats: SessionStats): void {
	sessions = [...sessions, stats].slice(-KEPT);
}

/**
 * The most recent sessions, newest first, optionally for one game only.
 *
 * Returns a copy: this is a read path, and a caller sorting the array in place
 * would quietly reorder everyone else's history.
 */
export function recentSessions(options?: {
	gameId?: string;
	limit?: number;
}): SessionStats[] {
	const { gameId, limit = KEPT } = options ?? {};

	return sessions
		.filter((session) => !gameId || session.gameId === gameId)
		.slice(-limit)
		.reverse();
}

/** Forget everything. For tests and for a device being handed to someone else. */
export function forgetSessions(): void {
	sessions = [];
}
