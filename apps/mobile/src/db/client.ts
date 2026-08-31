import { drizzle } from "drizzle-orm/expo-sqlite";
import { randomUUID } from "expo-crypto";
import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";

import { MIGRATIONS } from "./migrations";
import * as schema from "./schema";

/**
 * The device's local database — opened on first use, synchronously, once.
 *
 * Everything about this file is synchronous on purpose. `expo-sqlite` offers a
 * sync API and Drizzle's Expo driver is built on it, which means reading a
 * patient's history is a function call and not a promise — so a screen can ask
 * for it while it renders, and `lib/game-history.ts` kept the exact signatures
 * it had when it was an array in memory. Nothing above it had to learn that
 * there is now a disk underneath (`decisions.md` D-24).
 *
 * It is opened on **first use** rather than on import. Opening at module scope
 * read better, but it put the open, the migration and the device row on the path
 * of every screen that transitively imports this — so a database that could not
 * be opened at all took down expo-router itself, and every route in the app
 * reported nothing worse than a missing default export. A store this app can
 * live without for one screen should not be able to do that. Failing here now
 * breaks the games screen and leaves Today, People, Memories and Settings alone.
 *
 * There is no network anywhere in this path and there never will be
 * (`AGENTS.md` §2.1). This is where a session goes the moment it ends; sending
 * it anywhere is a separate, later, entirely optional thing that reads
 * `sync_queue`.
 */
const DATABASE_NAME = "smaran.db";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let connection: Database | null = null;

/**
 * The database, opening and migrating it if this is the first call.
 *
 * A function rather than an exported constant because it is lazy, and the
 * laziness is the point — see above. Callers are not expected to hold the
 * result: `db()` is a null check and a return once the file is open.
 */
export function db(): Database {
	if (connection) {
		return connection;
	}

	const client = open();

	// Set before anything else touches the file. WAL is what keeps a write during
	// a game from blocking a read on the same connection, and foreign keys are
	// off by default in SQLite — the `ON DELETE CASCADE`s in `migrations.ts` are
	// decoration until this line runs.
	client.execSync("PRAGMA journal_mode = WAL");
	client.execSync("PRAGMA foreign_keys = ON");

	migrate(client);

	connection = drizzle(client, { schema });
	ensureDevice(connection);

	return connection;
}

/**
 * Open the file, or explain why not.
 *
 * `expo-sqlite` is a native module, so it only exists in a binary that was built
 * after it was installed. Running new JavaScript against an older development
 * build fails deep inside the native bridge with `undefined is not a function`,
 * which says nothing about what is actually wrong or how to fix it. This is the
 * one place that knows, so this is where it gets said.
 */
function open(): SQLiteDatabase {
	try {
		return openDatabaseSync(DATABASE_NAME);
	} catch (cause) {
		throw new Error(
			`Could not open the local database (${DATABASE_NAME}). If this is a development build made before expo-sqlite was installed, the native module is not in it — rebuild with \`bunx expo run:android\` or \`bunx expo run:ios\`.`,
			{ cause },
		);
	}
}

/** Anything a query can be built on: the database itself, or a transaction. */
export type Queryable =
	| Database
	| Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * A new client-generated id.
 *
 * Rows are identified before they have ever been anywhere near a server
 * (`data-model.md` §3 rule 5), so a session can be written, pointed at and
 * queued with the radio off.
 */
export const newId = (): string => randomUUID();

/**
 * Bring the file up to the latest schema version.
 *
 * `user_version` is a four-byte integer SQLite keeps in the database header for
 * exactly this, so there is no bookkeeping table and no first-run special case:
 * a brand new file reports 0 and runs every migration, an up-to-date one reports
 * the full count and runs none.
 *
 * The whole run is one transaction. A migration interrupted halfway — the app
 * killed mid-upgrade, which on a phone is ordinary — leaves the file exactly as
 * it was rather than half-migrated, and the next launch simply tries again.
 */
function migrate(database: SQLiteDatabase): void {
	const applied =
		database.getFirstSync<{ user_version: number }>("PRAGMA user_version")
			?.user_version ?? 0;

	if (applied >= MIGRATIONS.length) {
		return;
	}

	database.withTransactionSync(() => {
		for (const statements of MIGRATIONS.slice(applied)) {
			database.execSync(statements);
		}

		// Not a bindable parameter — PRAGMA takes a literal. The value is a list
		// length, so there is nothing here to interpolate unsafely.
		database.execSync(`PRAGMA user_version = ${MIGRATIONS.length}`);
	});
}

/**
 * Give this device its identity if it does not have one yet.
 *
 * The id is generated once and never regenerated: it is half of the
 * `(device_id, seq)` key the server upserts on, so a device that reinvented
 * itself would re-send its whole history as new rows. Losing the file loses the
 * identity, which is correct — the sessions went with it.
 *
 * Takes the database rather than calling `db()`, because it runs *during* the
 * first `db()` and the connection is not published yet.
 */
function ensureDevice(database: Database): void {
	const existing = database.select().from(schema.device).limit(1).all();

	if (existing.length === 0) {
		database.insert(schema.device).values({ id: newId() }).run();
	}
}
