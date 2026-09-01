import { desc, eq } from "drizzle-orm";

import { db, newId, takeSeq } from "@/db";
import {
	type GameSessionRow,
	gameSession,
	type RemoteSessionRow,
	remoteSession,
	syncQueue,
} from "@/db/schema";
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
 *
 * **Two tables, one history.** Rounds played on this device sit in
 * `game_session`; rounds this reader played before the phone was reset sit in
 * `remote_session`, pulled back down from the server (D-34). Which side of that
 * line a round fell on is storage's business and nobody else's — the question
 * the engine asks is what *this reader* has been doing lately (`AGENTS.md`
 * §2.4), and being handed a new phone is not an answer to it.
 *
 * Merged here rather than in SQL because the two tables have different columns
 * and the merge is a walk down two lists that are already sorted. `limit` is
 * applied to each side first, so the merge never touches more than twice what it
 * returns however deep the history goes.
 */
export function recentSessions(options?: {
	gameId?: string;
	limit?: number;
}): SessionStats[] {
	const { gameId, limit = DEFAULT_LIMIT } = options ?? {};

	const local = db().select().from(gameSession);
	const remote = db().select().from(remoteSession);

	const played = (gameId ? local.where(eq(gameSession.gameId, gameId)) : local)
		.orderBy(desc(gameSession.endedAt))
		.limit(limit)
		.all();

	const restored = (
		gameId ? remote.where(eq(remoteSession.gameId, gameId)) : remote
	)
		.orderBy(desc(remoteSession.endedAt))
		.limit(limit)
		.all();

	// The common case by far: nothing was ever restored, and this is the query it
	// always was.
	if (restored.length === 0) {
		return played.map(toStats);
	}

	// A round this device played and later pulled back down would otherwise be
	// counted twice, and a duplicated round is a quietly wrong measurement rather
	// than a visible bug. `restoreSessions` already skips ids it can see locally;
	// this is the half that stays correct if it ever cannot.
	const own = new Set(played.map((row) => row.id));

	return [...played.map(toStats), ...restored.filter(unseen(own)).map(toStats)]
		.sort((a, b) => b.endedAt - a.endedAt)
		.slice(0, limit);
}

const unseen = (own: ReadonlySet<string>) => (row: RemoteSessionRow) =>
	!own.has(row.id);

/**
 * Keep this reader's earlier rounds, as the server remembers them.
 *
 * For a phone that has been reinstalled or reset: without this, the adaptive
 * engine opens on an empty table and puts someone who has played for months back
 * on the first rung — a measurement of the storage rather than of the person.
 *
 * Rows this device already holds are skipped rather than overwritten. Its own
 * `game_session` row is the original and may still be waiting in the outbox; the
 * copy coming down is the server's echo of it, and replacing a fact with its own
 * reflection gains nothing and risks the `seq` that makes it syncable.
 *
 * Nothing written here is ever queued. These rounds are already on the server —
 * that is where they just came from.
 */
export function restoreSessions(rounds: readonly RestoredSession[]): number {
	if (rounds.length === 0) {
		return 0;
	}

	return db().transaction((tx) => {
		const own = new Set(
			tx
				.select({ id: gameSession.id })
				.from(gameSession)
				.all()
				.map((row) => row.id),
		);

		const fresh = rounds.filter((round) => !own.has(round.id));

		for (const round of fresh) {
			// The reader may have reinstalled twice, so a row we already restored is
			// ordinary rather than a conflict — take the newer copy and move on.
			tx.insert(remoteSession)
				.values(round)
				.onConflictDoUpdate({ target: remoteSession.id, set: round })
				.run();
		}

		return fresh.length;
	});
}

/** A round as the server hands it back: a `game_session` row with no `seq`. */
export type RestoredSession = Omit<GameSessionRow, "seq">;

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
		// Restored history is this person's too, and a device being handed on must
		// not carry it to the next reader. It is the one table here that can be
		// dropped without losing anything — the server still has it.
		tx.delete(remoteSession).run();
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
function toStats(row: GameSessionRow | RemoteSessionRow): SessionStats {
	const { id: _id, ...rest } = row;
	// A restored row has no `seq` to drop; a local one does. Destructuring the
	// union member that has it would not typecheck against the one that does not.
	const { seq: _seq, ...stats } = rest as Omit<GameSessionRow, "id">;

	return stats;
}
