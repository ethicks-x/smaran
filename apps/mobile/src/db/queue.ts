import { asc, eq, inArray, min, sql } from "drizzle-orm";

import { db } from "./client";
import { type SyncEntity, type SyncQueueRow, syncQueue } from "./schema";

/**
 * The outbox, as storage sees it. What to do with the rows is `lib/sync.ts`.
 *
 * A row lands here in the same transaction as the fact it describes
 * (`data-model.md` §1) and leaves only when the server has said, in a response,
 * what it did with it. Nothing in this file talks to a network and nothing in it
 * decides anything: a session is written, a queue row is written, and whether
 * either ever reaches a server is somebody else's problem on somebody else's
 * schedule (`AGENTS.md` §2.1).
 *
 * Synchronous like the rest of `src/db`, for the reason D-24 gives.
 */

/**
 * The oldest queued rows for one stream, in the order they happened.
 *
 * Ascending by `id`, which is the autoincrement, which is the order the facts
 * occurred in. It matters less than it looks — the rows are independent and the
 * server upserts them by key, so an out-of-order batch is still correct — but
 * sending the oldest first means a device that can only manage one batch per
 * connection still drains, rather than shipping today's rounds forever while
 * last month's sit at the bottom.
 *
 * One stream at a time because the two go to different endpoints; they share the
 * `seq` counter, not the route.
 */
export function queued(entity: SyncEntity, limit: number): SyncQueueRow[] {
	return db()
		.select()
		.from(syncQueue)
		.where(eq(syncQueue.entity, entity))
		.orderBy(asc(syncQueue.id))
		.limit(limit)
		.all();
}

/**
 * Forget queue rows the server has accounted for.
 *
 * **Only the queue row goes.** The session or reminder event itself stays on the
 * device untouched — this is an outbox, not the record. Dropping an entry means
 * "stop carrying this", never "this did not happen", which is why a rejected row
 * is as safe to drop as an accepted one.
 */
export function drop(ids: readonly number[]): void {
	if (ids.length === 0) {
		return;
	}

	db()
		.delete(syncQueue)
		.where(inArray(syncQueue.id, [...ids]))
		.run();
}

/**
 * Count one more failed attempt against these rows.
 *
 * The counter is how a row that no server will ever accept eventually stops
 * being retried — see `MAX_ATTEMPTS` in `lib/sync.ts`, which is the only thing
 * that reads it.
 */
export function bumpAttempts(ids: readonly number[]): void {
	if (ids.length === 0) {
		return;
	}

	db()
		.update(syncQueue)
		.set({ attempts: sql`${syncQueue.attempts} + 1` })
		.where(inArray(syncQueue.id, [...ids]))
		.run();
}

/**
 * The lowest sequence number still owed to the server, or null if nothing is.
 *
 * This is what makes `device.last_synced_seq` an honest number. Everything below
 * the oldest still-queued `seq` has been acknowledged, and nothing above it can
 * be assumed to have been — the two streams share one counter, so a batch of
 * sessions says nothing about a reminder event that was numbered between them.
 */
export function oldestQueuedSeq(): number | null {
	const row = db()
		.select({ seq: min(syncQueue.seq) })
		.from(syncQueue)
		.get();

	return row?.seq ?? null;
}

/** How much is still owed. For a diagnostic; nothing decides anything on it. */
export function queueDepth(): number {
	const row = db()
		.select({ count: sql<number>`count(*)` })
		.from(syncQueue)
		.get();

	return row?.count ?? 0;
}
