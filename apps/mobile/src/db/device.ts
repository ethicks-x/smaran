import { eq, sql } from "drizzle-orm";

import { db, type Queryable } from "./client";
import { type DeviceRow, device } from "./schema";

/**
 * This device's row: who it is to the server, and how much of what it has
 * written the server has acknowledged.
 *
 * `client.ts` guarantees the row exists before anything can import this, so the
 * read cannot come back empty. If it somehow does, that is a corrupt database
 * and not a state worth writing a fallback for.
 */
export function deviceIdentity(): DeviceRow {
	const row = db().select().from(device).limit(1).get();

	if (!row) {
		throw new Error(
			"The device row is missing — the local database is corrupt.",
		);
	}

	return row;
}

/**
 * Claim the next sequence number and advance the counter, in one statement.
 *
 * **Call this inside the same transaction as the row that uses it.** The number
 * is the `seq` half of the `(device_id, seq)` idempotency key
 * (`decisions.md` D-09): a number handed out and then not written is a hole in
 * the sequence, and a number written twice is two different rows the server
 * will treat as one.
 *
 * The read and the increment are a single `UPDATE ... RETURNING` rather than a
 * select followed by an update, so two writers cannot come away with the same
 * number even if one day they are not on the same thread.
 */
export function takeSeq(tx: Queryable = db()): number {
	const row = tx
		.update(device)
		.set({ nextSeq: sql`${device.nextSeq} + 1` })
		.returning({ seq: device.nextSeq })
		.get();

	if (!row) {
		throw new Error(
			"The device row is missing — the local database is corrupt.",
		);
	}

	// `RETURNING` gives the value after the update, so the number this call owns
	// is the one before it.
	return row.seq - 1;
}

/**
 * Record how far the server has acknowledged.
 *
 * A watermark rather than a per-row flag: sessions are append-only and their
 * sequence numbers only go up, so one number says everything about what is
 * still owed. Never moves backwards — a stale response arriving after a newer
 * one must not un-acknowledge work that is already done.
 */
export function markSynced(seq: number, at: number = Date.now()): void {
	const current = deviceIdentity();

	if (seq <= current.lastSyncedSeq) {
		return;
	}

	db()
		.update(device)
		.set({ lastSyncedSeq: seq, lastSyncedAt: at })
		.where(eq(device.id, current.id))
		.run();
}
