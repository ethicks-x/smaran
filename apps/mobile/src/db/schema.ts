import { sql } from "drizzle-orm";
import {
	index,
	integer,
	real,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * Every table the device keeps, exactly as `data-model.md` §1 describes them.
 *
 * This is the write path and it is the source of truth until a row syncs
 * (`AGENTS.md` §2.1): nothing here waits on a network call, and a row that has
 * been written is a fact whether or not the radio has ever been on. The server's
 * schema is a different shape on purpose — normalised, with a hypertable
 * underneath the sessions — and lives in `apps/api`.
 *
 * Two conventions run through the whole file, both from `data-model.md` §3:
 * timestamps are **epoch milliseconds as integers**, never a local-time string,
 * and ids are **client-generated uuids**, so a row exists and can be pointed at
 * with the radio off.
 *
 * The DDL that creates these tables is hand-written in `migrations.ts` rather
 * than generated — see `decisions.md` D-24 for why, and for the one rule that
 * keeps the two halves honest: a change here is a new migration there, never an
 * edit to an old one.
 */

/** The person holding the phone. Exactly one row, written at enrollment. */
export const patient = sqliteTable("patient", {
	/** The server's patient id, handed over when the device is enrolled. */
	id: text("id").primaryKey(),
	/** What `recall` and the greeting on Today use. */
	displayName: text("display_name").notNull(),
	/** BCP-47. Drives i18n and, when it lands, the TTS voice. */
	preferredLanguage: text("preferred_language").notNull(),
	enrolledAt: integer("enrolled_at").notNull(),
});

/**
 * This device's identity for sync. Exactly one row.
 *
 * `nextSeq` is the monotonic half of the `(device_id, seq)` idempotency key the
 * ingest endpoint upserts on (`data-model.md` §2, `decisions.md` D-09). It is
 * never reset and never reused: a retried batch has to carry the same key it
 * carried the first time or the retry stops being a no-op.
 */
export const device = sqliteTable("device", {
	/** Generated once with `expo-crypto` and never regenerated. */
	id: text("id").primaryKey(),
	nextSeq: integer("next_seq").notNull().default(1),
	/** How far the server has acknowledged. Everything above it is still owed. */
	lastSyncedSeq: integer("last_synced_seq").notNull().default(0),
	lastSyncedAt: integer("last_synced_at"),
	/**
	 * The server's own clock at the last successful pull, echoed back as `since`
	 * on the next one. The **server's** clock and not this phone's: a device whose
	 * date is wrong by hours would otherwise ask for a window that has already
	 * gone by, and never hear about the reminder it skipped.
	 */
	lastPulledAt: integer("last_pulled_at"),
});

/**
 * One row per round of a game, finished or put down. **Immutable once written.**
 *
 * The columns mirror `SessionStats` in `lib/game-stats.ts` field for field, so a
 * closed session is written as-is and read back as the same object — which is
 * what lets the adaptive engine read history without knowing there is a database
 * under it.
 *
 * Raw counts sit beside the ratios deliberately (`data-model.md` §3): what
 * "accuracy" means will change, and the facts underneath it should not have to
 * be collected a second time when it does. That is also why the measured
 * numbers that cannot be recomputed from the counts — time on task, the median
 * turn, the longest streak — are columns rather than something derived later.
 *
 * There is no score here and no benchmark (`AGENTS.md` §2.4). A row is only ever
 * read against the same person's other rows.
 */
export const gameSession = sqliteTable(
	"game_session",
	{
		id: text("id").primaryKey(),
		/** Taken from `device.next_seq` at insert. Unique for this device. */
		seq: integer("seq").notNull(),
		/** Stable across releases — the key history is grouped by. */
		gameId: text("game_id").notNull(),
		/** The rung of this game's own ladder that was played, counting from one. */
		difficulty: integer("difficulty").notNull(),
		startedAt: integer("started_at").notNull(),
		endedAt: integer("ended_at").notNull(),
		/** Wall clock, pauses included. */
		durationMs: integer("duration_ms").notNull(),
		/** The same round with the pauses taken out. */
		timeOnTaskMs: integer("time_on_task_ms").notNull(),
		attempts: integer("attempts").notNull(),
		correct: integer("correct").notNull(),
		total: integer("total").notNull(),
		/** False for a board that was put down. Recorded the same, never penalised. */
		completed: integer("completed", { mode: "boolean" }).notNull(),
		accuracy: real("accuracy").notNull(),
		/** Null when the game has no floor on attempts to measure against. */
		precision: real("precision"),
		completion: real("completion").notNull(),
		avgResponseMs: integer("avg_response_ms").notNull(),
		medianResponseMs: integer("median_response_ms").notNull(),
		/** Null under two attempts, where there is no spread to measure. */
		consistency: real("consistency"),
		longestStreak: integer("longest_streak").notNull(),
	},
	(table) => [
		uniqueIndex("game_session_seq_idx").on(table.seq),
		// The one query the engine makes: this reader's last few rounds of one
		// game, newest first.
		index("game_session_game_ended_idx").on(table.gameId, table.endedAt),
	],
);

/**
 * This reader's earlier rounds, as the server knows them. Pulled **down**.
 *
 * The same shape as `game_session` with one column missing, and the missing one
 * is the whole difference: there is no `seq`, because a sequence number belongs
 * to the device that issued it and these rounds were played on a phone that no
 * longer exists — or on this one, before it was reset. They are somebody else's
 * facts about this reader: read like history, and **never queued, never sent
 * back up**. A separate table rather than a flag on `game_session` so that the
 * two can never be confused by a query that forgets to check one.
 *
 * This is what stops a reinstall from erasing a person. `game_session` is what
 * happened on this device; the adaptive engine reads both, because the question
 * it asks is what *this reader* has been doing lately (`AGENTS.md` §2.4) and the
 * answer does not change when a phone is wiped. Safe to drop and re-pull at any
 * time — nothing here is owed to anyone.
 */
export const remoteSession = sqliteTable(
	"remote_session",
	{
		id: text("id").primaryKey(),
		gameId: text("game_id").notNull(),
		difficulty: integer("difficulty").notNull(),
		startedAt: integer("started_at").notNull(),
		endedAt: integer("ended_at").notNull(),
		durationMs: integer("duration_ms").notNull(),
		timeOnTaskMs: integer("time_on_task_ms").notNull(),
		attempts: integer("attempts").notNull(),
		correct: integer("correct").notNull(),
		total: integer("total").notNull(),
		completed: integer("completed", { mode: "boolean" }).notNull(),
		accuracy: real("accuracy").notNull(),
		precision: real("precision"),
		completion: real("completion").notNull(),
		avgResponseMs: integer("avg_response_ms").notNull(),
		medianResponseMs: integer("median_response_ms").notNull(),
		consistency: real("consistency"),
		longestStreak: integer("longest_streak").notNull(),
	},
	(table) => [
		index("remote_session_game_ended_idx").on(table.gameId, table.endedAt),
	],
);

/**
 * Per-attempt detail for a session. Optional, and off the critical path.
 *
 * Useful for replaying a round and for training something later. Pruned on a
 * retention window and **never synced** unless a session is flagged for review —
 * the raw shape of someone's mistakes is the most sensitive thing this app
 * holds (`AGENTS.md` §2.5), and it earns its keep on-device or not at all.
 */
export const sessionEvent = sqliteTable(
	"session_event",
	{
		id: text("id").primaryKey(),
		sessionId: text("session_id")
			.notNull()
			.references(() => gameSession.id, { onDelete: "cascade" }),
		/** Position within the round, counting from zero. */
		index: integer("index").notNull(),
		prompt: text("prompt"),
		response: text("response"),
		correct: integer("correct", { mode: "boolean" }).notNull(),
		responseMs: integer("response_ms").notNull(),
	},
	(table) => [index("session_event_session_idx").on(table.sessionId)],
);

/** What a reminder is for. Shown and spoken the same way whichever it is. */
export type ReminderKind =
	| "medicine"
	| "hydration"
	| "activity"
	| "appointment";

export const reminder = sqliteTable("reminder", {
	id: text("id").primaryKey(),
	kind: text("kind").$type<ReminderKind>().notNull(),
	/** Both are shown and spoken, so both are already-translated copy. */
	title: text("title").notNull(),
	detail: text("detail"),
	/** A time of day plus a days mask, or an rrule-ish string. */
	schedule: text("schedule").notNull(),
	active: integer("active", { mode: "boolean" }).notNull().default(true),
	/**
	 * The `expo-notifications` ids this reminder currently has scheduled, as a
	 * JSON array. Kept so that editing or switching off a reminder can cancel
	 * exactly what it booked, rather than tearing down every notification in the
	 * app and rebuilding them.
	 */
	notificationIds: text("notification_ids").notNull().default("[]"),
});

/** What happened when a reminder came due. Adherence is computed from these. */
export type ReminderOutcome = "done" | "snoozed" | "missed";

/**
 * Syncs like a session and shares the same `seq` counter, so the two streams
 * cannot collide on the idempotency key.
 */
export const reminderEvent = sqliteTable(
	"reminder_event",
	{
		id: text("id").primaryKey(),
		reminderId: text("reminder_id")
			.notNull()
			.references(() => reminder.id, { onDelete: "cascade" }),
		seq: integer("seq").notNull(),
		dueAt: integer("due_at").notNull(),
		acknowledgedAt: integer("acknowledged_at"),
		outcome: text("outcome").$type<ReminderOutcome>().notNull(),
	},
	(table) => [
		uniqueIndex("reminder_event_seq_idx").on(table.seq),
		index("reminder_event_due_idx").on(table.dueAt),
	],
);

/**
 * The people close to the reader. Synced **down** from the family and read-only
 * here (`data-model.md` §3 rule 2) — the device takes what it is given.
 *
 * Photos are cached to the filesystem as they sync and `photoUri` points at the
 * cache, never at a URL. The People tab has to draw with the radio off.
 */
export const person = sqliteTable(
	"person",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		/** "Your daughter", "Your neighbour" — already translated, already warm. */
		relationship: text("relationship").notNull(),
		photoUri: text("photo_uri"),
		phone: text("phone"),
		/** The one the Help screen calls. */
		isPrimaryContact: integer("is_primary_contact", { mode: "boolean" })
			.notNull()
			.default(false),
		/** The order the family chose. Not alphabetical, not most-recent. */
		sort: integer("sort").notNull().default(0),
	},
	(table) => [index("person_sort_idx").on(table.sort)],
);

/** A photo, a recording or a written memory. Synced down; backs the Memories tab. */
export type MemoryKind = "photo" | "audio" | "story";

export const memoryItem = sqliteTable(
	"memory_item",
	{
		id: text("id").primaryKey(),
		kind: text("kind").$type<MemoryKind>().notNull(),
		caption: text("caption").notNull(),
		/** A filesystem path into the media cache, for the same reason as `photoUri`. */
		mediaUri: text("media_uri"),
		createdAt: integer("created_at").notNull(),
		/** Who shared it, as a name to show — not an id to resolve. */
		sharedBy: text("shared_by"),
	},
	(table) => [index("memory_item_created_idx").on(table.createdAt)],
);

/**
 * The entities that sync **up**.
 *
 * The first two are append-only facts keyed by `(device_id, seq)`. The third is not: a
 * `reminder` is a definition, and the device is only ever allowed to *create* one — the
 * caregiver owns it from then on (`data-model.md` §3 rule 2). It rides the same queue
 * because the queue is how anything leaves this phone, and its id is already unique, so
 * the server dedupes it on that rather than on the sequence number.
 */
export type SyncEntity = "game_session" | "reminder_event" | "reminder";

/**
 * What is owed to the server, in the order it happened.
 *
 * A row is written here in the **same transaction** as the row it describes
 * (`data-model.md` §1) — a session that exists without a queue entry is a
 * silently lost sync, and there is no later pass that could notice.
 *
 * `payload` is a JSON snapshot rather than a pointer, so draining the queue
 * never has to join back to a table that may since have been pruned, and a
 * retry sends byte-for-byte what the first attempt sent.
 */
export const syncQueue = sqliteTable("sync_queue", {
	/** Autoincrement, and read in ascending order: this is the drain order. */
	id: integer("id").primaryKey({ autoIncrement: true }),
	entity: text("entity").$type<SyncEntity>().notNull(),
	entityId: text("entity_id").notNull(),
	/** Copied from the row so a retry carries the same idempotency key. */
	seq: integer("seq").notNull(),
	payload: text("payload").notNull(),
	/** How many times we have tried. The backoff reads it; nothing else does. */
	attempts: integer("attempts").notNull().default(0),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch() * 1000)`),
});

export type PatientRow = typeof patient.$inferSelect;
export type DeviceRow = typeof device.$inferSelect;
export type GameSessionRow = typeof gameSession.$inferSelect;
export type RemoteSessionRow = typeof remoteSession.$inferSelect;
export type SessionEventRow = typeof sessionEvent.$inferSelect;
export type ReminderRow = typeof reminder.$inferSelect;
export type ReminderEventRow = typeof reminderEvent.$inferSelect;
export type PersonRow = typeof person.$inferSelect;
export type MemoryItemRow = typeof memoryItem.$inferSelect;
export type SyncQueueRow = typeof syncQueue.$inferSelect;
