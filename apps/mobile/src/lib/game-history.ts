import { desc, eq } from "drizzle-orm";

import { db, newId, takeSeq } from "@/db";
import { type GameSessionRow, gameSession, syncQueue } from "@/db/schema";
import type { SessionStats } from "./game-stats";

/**
 * Where finished sessions go: the `game_session` table, on this device, now.
 *
 * A round ends and the row is on disk before the dialog has finished animating.
 * No network, no permission, no waiting (`AGENTS.md` §2.1) — the local store is
 * the source of truth for a session until the day it happens to sync, and it
 * stays correct if that day never comes.
 *
 * Both functions are still synchronous and still have the signatures they had
 * when this file was an array in memory, which is the point: `useGameSession`
 * and `GameStatsDetail` did not change when the disk arrived, and the adaptive
 * engine will not change when the shape of the query does (`decisions.md` D-24).
 *
 * A session is immutable once written (`data-model.md` §3 rule 1). Nothing here
 * updates a row, so there is no conflict to resolve when it syncs — the whole
 * history is a list of things that happened.
 */

/**
 * How many sessions a read returns by default. The engine wants a recent window
 * rather than a lifetime, because the question is what this reader is doing
 * *now* against what they were doing lately (D-08) — never against anyone else.
 *
 * The **table** is not trimmed to match. A row is evidence and it is owed to the
 * server, so pruning by count would quietly drop sessions that had not synced
 * yet. Rows leave when they are acknowledged and a retention pass takes them,
 * not because fifty newer ones arrived.
 */
const DEFAULT_LIMIT = 50;

/**
 * Keep a finished — or abandoned — session.
 *
 * The row and its `sync_queue` entry are written in **one transaction**, as
 * `data-model.md` §1 requires: a session that exists without a queue entry is a
 * silently lost sync, and nothing later would ever notice it was missing.
 */
export function remember(stats: SessionStats): void {
	db().transaction((tx) => {
		const row = { id: newId(), seq: takeSeq(tx), ...stats };

		tx.insert(gameSession).values(row).run();

		// A snapshot rather than a pointer, so draining the queue never has to
		// join back to a row that may since have been pruned, and a retry sends
		// exactly what the first attempt sent.
		tx.insert(syncQueue)
			.values({
				entity: "game_session",
				entityId: row.id,
				seq: row.seq,
				payload: JSON.stringify(row),
				createdAt: Date.now(),
			})
			.run();
	});
}

/**
 * The most recent sessions, newest first, optionally for one game only.
 *
 * Ordered by when the round ended rather than when it started, so a board
 * someone had open for an hour lands where they actually put it down.
 */
export function recentSessions(options?: {
	gameId?: string;
	limit?: number;
}): SessionStats[] {
	const { gameId, limit = DEFAULT_LIMIT } = options ?? {};

	const query = db().select().from(gameSession);

	return (gameId ? query.where(eq(gameSession.gameId, gameId)) : query)
		.orderBy(desc(gameSession.endedAt))
		.limit(limit)
		.all()
		.map(toStats);
}

/**
 * Forget every session and everything queued about one.
 *
 * For a device being handed to someone else. Deliberately not offered anywhere
 * in the app yet — it is here so that when enrollment lands there is one honest
 * way to clear a person's history, rather than three approximate ones.
 */
export function forgetSessions(): void {
	db().transaction((tx) => {
		// First, or the queue keeps pointing at rows that are gone. `session_event`
		// needs no such care — it cascades.
		tx.delete(syncQueue).where(eq(syncQueue.entity, "game_session")).run();
		tx.delete(gameSession).run();
	});
}

/**
 * A stored row, read back as the thing the game handed over.
 *
 * `id` and `seq` are storage's business — they exist so a row can be pointed at
 * and synced exactly once — and neither is part of what a session *was*. Keeping
 * them out of `SessionStats` is what lets the adaptive engine stay a pure
 * function over numbers (`AGENTS.md` §6).
 */
function toStats(row: GameSessionRow): SessionStats {
	const { id: _id, seq: _seq, ...stats } = row;

	return stats;
}
