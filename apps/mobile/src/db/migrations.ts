/**
 * The DDL, one entry per version, applied in order and never edited afterwards.
 *
 * The list index *is* the version: SQLite's own `user_version` pragma records
 * how many of these a database has seen, and opening it runs whatever is left.
 * A fresh install runs all of them; an upgrade runs only the tail. That is the
 * whole migration system, and it is deliberately this small — see
 * `decisions.md` D-24.
 *
 * **Two rules, and they are not negotiable.** Never edit an entry that has
 * shipped: a device that already ran it will never run it again, and its schema
 * would quietly diverge from a fresh install's. And every change to
 * `schema.ts` needs a new entry here, because nothing checks that the two agree
 * — the TypeScript is what queries are built from, and this is what actually
 * exists on disk.
 */
export const MIGRATIONS: readonly string[] = [
	// v1 — the device store as `data-model.md` §1 defines it.
	`
	CREATE TABLE patient (
		id                 TEXT PRIMARY KEY NOT NULL,
		display_name       TEXT NOT NULL,
		preferred_language TEXT NOT NULL,
		enrolled_at        INTEGER NOT NULL
	);

	CREATE TABLE device (
		id               TEXT PRIMARY KEY NOT NULL,
		next_seq         INTEGER NOT NULL DEFAULT 1,
		last_synced_seq  INTEGER NOT NULL DEFAULT 0,
		last_synced_at   INTEGER
	);

	CREATE TABLE game_session (
		id                 TEXT PRIMARY KEY NOT NULL,
		seq                INTEGER NOT NULL,
		game_id            TEXT NOT NULL,
		difficulty         INTEGER NOT NULL,
		started_at         INTEGER NOT NULL,
		ended_at           INTEGER NOT NULL,
		duration_ms        INTEGER NOT NULL,
		time_on_task_ms    INTEGER NOT NULL,
		attempts           INTEGER NOT NULL,
		correct            INTEGER NOT NULL,
		total              INTEGER NOT NULL,
		completed          INTEGER NOT NULL,
		accuracy           REAL NOT NULL,
		"precision"        REAL,
		completion         REAL NOT NULL,
		avg_response_ms    INTEGER NOT NULL,
		median_response_ms INTEGER NOT NULL,
		consistency        REAL,
		longest_streak     INTEGER NOT NULL
	);

	CREATE UNIQUE INDEX game_session_seq_idx ON game_session (seq);
	CREATE INDEX game_session_game_ended_idx ON game_session (game_id, ended_at);

	CREATE TABLE session_event (
		id          TEXT PRIMARY KEY NOT NULL,
		session_id  TEXT NOT NULL REFERENCES game_session (id) ON DELETE CASCADE,
		"index"     INTEGER NOT NULL,
		prompt      TEXT,
		response    TEXT,
		correct     INTEGER NOT NULL,
		response_ms INTEGER NOT NULL
	);

	CREATE INDEX session_event_session_idx ON session_event (session_id);

	CREATE TABLE reminder (
		id               TEXT PRIMARY KEY NOT NULL,
		kind             TEXT NOT NULL,
		title            TEXT NOT NULL,
		detail           TEXT,
		schedule         TEXT NOT NULL,
		active           INTEGER NOT NULL DEFAULT 1,
		notification_ids TEXT NOT NULL DEFAULT '[]'
	);

	CREATE TABLE reminder_event (
		id              TEXT PRIMARY KEY NOT NULL,
		reminder_id     TEXT NOT NULL REFERENCES reminder (id) ON DELETE CASCADE,
		seq             INTEGER NOT NULL,
		due_at          INTEGER NOT NULL,
		acknowledged_at INTEGER,
		outcome         TEXT NOT NULL
	);

	CREATE UNIQUE INDEX reminder_event_seq_idx ON reminder_event (seq);
	CREATE INDEX reminder_event_due_idx ON reminder_event (due_at);

	CREATE TABLE person (
		id                 TEXT PRIMARY KEY NOT NULL,
		name               TEXT NOT NULL,
		relationship       TEXT NOT NULL,
		photo_uri          TEXT,
		phone              TEXT,
		is_primary_contact INTEGER NOT NULL DEFAULT 0,
		sort               INTEGER NOT NULL DEFAULT 0
	);

	CREATE INDEX person_sort_idx ON person (sort);

	CREATE TABLE memory_item (
		id         TEXT PRIMARY KEY NOT NULL,
		kind       TEXT NOT NULL,
		caption    TEXT NOT NULL,
		media_uri  TEXT,
		created_at INTEGER NOT NULL,
		shared_by  TEXT
	);

	CREATE INDEX memory_item_created_idx ON memory_item (created_at);

	CREATE TABLE sync_queue (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		entity     TEXT NOT NULL,
		entity_id  TEXT NOT NULL,
		seq        INTEGER NOT NULL,
		payload    TEXT NOT NULL,
		attempts   INTEGER NOT NULL DEFAULT 0,
		created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
	);

	CREATE INDEX sync_queue_entity_idx ON sync_queue (entity, entity_id);
	`,
];
