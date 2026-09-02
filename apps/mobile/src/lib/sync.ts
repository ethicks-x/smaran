import Constants from "expo-constants";

import {
  bumpAttempts,
  deviceIdentity,
  drop,
  markPulled,
  markSynced,
  oldestQueuedSeq,
  queueDepth,
  queued,
  type SyncEntity,
  type SyncQueueRow,
} from "@/db";
import { ApiError, ApiUnreachableError, apiFetch, type GetToken } from "./api";
import { type RestoredSession, restoreSessions } from "./game-history";
import {
  applyMemorySubjects,
  cacheSubjectPhotos,
  type PulledSubject,
} from "./memory-subjects";
import { applyReminders, type PulledReminder } from "./reminders";

/**
 * Draining the outbox: the one place in the app that sends anything anywhere.
 *
 * The shape of this file is the offline-first rule made concrete (`AGENTS.md`
 * §2.1). Nothing above it waits on it, nothing it does changes what a screen
 * shows, and every function in it can fail completely without the reader ever
 * finding out. A phone that never once reaches the API still plays every game,
 * shows every reminder and keeps every measurement — the difference is only that
 * a caregiver cannot see them yet.
 *
 * It runs both ways. Sessions and reminder events go **up**; reminder
 * definitions the caregiver set, the people, places and objects the family wants
 * the reader to recognise, and — after a reinstall — this reader's own game
 * history, come **down** (D-34). Contacts and shared memories are the part still
 * missing, because nothing on the phone draws them yet.
 *
 * Up first, then down, and the order is not arbitrary: what the device is
 * holding is the only copy of it, and a pull that failed should never be the
 * reason a push did not happen.
 *
 * Three rules run through the whole file:
 *
 * 1. **A queue row leaves only when the server has said what it did with it.**
 *    Not on a timeout, not on a 5xx, not on a guess. The device is holding the
 *    only copy.
 * 2. **A retry sends what the first attempt sent.** The payload is the JSON
 *    snapshot taken when the row was written, so `(device_id, seq)` — the key
 *    the server upserts on (`decisions.md` D-09) — is identical every time and a
 *    duplicate batch is a no-op rather than a second row.
 * 3. **Offline is not an error.** It is the ordinary case, and it is reported as
 *    a state rather than thrown.
 */

/**
 * How many rows go in one request. The server caps a batch at 200; this is
 * lower because the connection this runs over may be a village 2G one, and a
 * batch that fails is a batch repeated.
 */
const BATCH_SIZE = 100;

/**
 * How many times a row may fail a request the server actually answered before
 * the device stops carrying it.
 *
 * This only ever fires for a row the server refuses to *parse* — a phone running
 * a build newer than the API it is talking to. A row the server understands and
 * cannot store comes back named in `rejected` and is dropped on the first
 * response; a row nobody could reach the server about is not counted at all.
 * Without a ceiling, one such row at the head of the queue would block every
 * row behind it forever.
 */
const MAX_ATTEMPTS = 5;

/**
 * Where each stream goes. They share a `seq` counter, not a route.
 *
 * Order matters a little: definitions go first, so a caregiver watching the dashboard sees
 * a reminder appear before the acknowledgements that refer to it. Nothing depends on it —
 * `reminder_events.reminder_id` is deliberately not a foreign key (D-32), so an event lands
 * whether or not its definition has — it is only that the other order reads like a glitch.
 */
const ENDPOINTS: Record<SyncEntity, string> = {
  reminder: "/sync/reminders",
  game_session: "/sync/sessions",
  reminder_event: "/sync/reminder-events",
};

/** What each endpoint calls its batch. */
const COLLECTION: Record<SyncEntity, string> = {
  reminder: "reminders",
  game_session: "sessions",
  reminder_event: "events",
};

/** What the server does with a batch. `api-contract.md` §2. */
type SyncAck = {
  accepted: number;
  duplicates: number;
  rejected: { id: string; reason: string }[];
  last_seq: number;
};

/**
 * How a drain ended — for a diagnostic, and for a caller deciding whether to
 * bother again soon. Nothing the reader sees is drawn from any of it.
 */
export type SyncResult = {
  /**
   * `synced` — everything the server answered about is off the queue.
   * `offline` — we could not ask. The ordinary case, and not a failure.
   * `refused` — we asked and were told no. The queue is intact and untouched.
   */
  status: "synced" | "offline" | "refused";
  /** Rows the server accepted for the first time. */
  sent: number;
  /** Rows it already had. A retry landing is a success, not a warning. */
  duplicates: number;
  /** Rows it will never take. Dropped from the queue; still on the device. */
  rejected: number;
  /** Rows still owed after this run. */
  remaining: number;
  /** Reminder definitions the caregiver added, changed or retired. */
  reminders: number;
  /** People, places and objects the family keeps. The whole set, every pull. */
  subjects: number;
  /** Photographs fetched into the media cache on this run. */
  photos: number;
  /** Earlier rounds recovered for a phone that had lost them. */
  restored: number;
};

/**
 * Only one drain at a time.
 *
 * Every trigger is a coincidence — the app opening, the reader coming back to
 * it — and two of them landing together is normal. The server would dedupe the
 * second batch happily, but the two runs would race to delete the same queue
 * rows, so the second caller joins the first instead of starting its own.
 */
let inFlight: Promise<SyncResult> | null = null;

/**
 * Send everything the device owes the server, if it can.
 *
 * Never throws. Every outcome a caller could act on is in the returned
 * `SyncResult`, because there is no caller for whom a failed sync is an
 * exceptional event — it is Tuesday in a valley with no signal.
 */
export function sync(getToken: GetToken): Promise<SyncResult> {
  inFlight ??= drain(getToken).finally(() => {
    inFlight = null;
  });

  return inFlight;
}

async function drain(getToken: GetToken): Promise<SyncResult> {
  const result: SyncResult = {
    status: "synced",
    sent: 0,
    duplicates: 0,
    rejected: 0,
    remaining: 0,
    reminders: 0,
    subjects: 0,
    photos: 0,
    restored: 0,
  };

  let device: { id: string; nextSeq: number; lastPulledAt: number | null };

  try {
    const identity = deviceIdentity();
    device = {
      id: identity.id,
      nextSeq: identity.nextSeq,
      lastPulledAt: identity.lastPulledAt,
    };
  } catch {
    // A store that will not open costs us a sync, and nothing else. It has
    // already cost the screens that needed it their own, quieter failure.
    return { ...result, status: "refused" };
  }

  for (const entity of Object.keys(ENDPOINTS) as SyncEntity[]) {
    // Each batch is a fresh read: the previous one deleted rows, and a game
    // may well have ended while the last request was in the air.
    while (true) {
      let batch: SyncQueueRow[];

      try {
        batch = queued(entity, BATCH_SIZE);
      } catch {
        return { ...result, status: "refused" };
      }

      if (batch.length === 0) {
        break;
      }

      const outcome = await send(entity, batch, device.id, getToken);

      if (outcome.status !== "ok") {
        // Stop the whole run, not just this stream. Whatever stopped one
        // request — no radio, an expired session, a server that is down —
        // will stop the next one, and a phone with nothing to gain should
        // not spend a battery finding that out twice.
        bumpAttempts(batch.map((row) => row.id));

        if (outcome.status === "poison") {
          drop(batch.filter(exhausted).map((row) => row.id));
        }

        result.status = outcome.status === "offline" ? "offline" : "refused";
        break;
      }

      // The server accounted for every row it was sent — accepted, already
      // had, or will never take — so the whole batch stops being owed. The
      // rejected ones are dropped alongside the rest on purpose: their
      // `game_session` row is still on this device, and carrying a queue
      // entry no server will ever clear only blocks the rows behind it.
      drop(batch.map((row) => row.id));

      result.sent += outcome.ack.accepted;
      result.duplicates += outcome.ack.duplicates;
      result.rejected += outcome.ack.rejected.length;

      if (batch.length < BATCH_SIZE) {
        break;
      }
    }

    if (result.status !== "synced") {
      break;
    }
  }

  try {
    result.remaining = queueDepth();
    advanceWatermark(device.nextSeq);
  } catch {
    // Bookkeeping. Losing it costs a diagnostic, never a row.
  }

  // Down, and only if up got through. A failure here is the same non-event as a
  // failure there: the phone keeps every reminder and every round it already
  // had, and simply has not heard today's news.
  if (result.status === "synced") {
    await takeDown(device.lastPulledAt, getToken, result);
  }

  return result;
}

/**
 * Ask for what the caregiver changed, and — once — for the history this phone
 * has lost.
 *
 * The restore is asked for exactly when `last_pulled_at` is null, which is true
 * on a phone that has never completed a pull and on no other. That is a better
 * question than "is the session table empty": a reader who opens a brand-new
 * install offline and plays a round before it ever syncs would answer no to the
 * second and still be missing every round they played last month.
 */
async function takeDown(
  lastPulledAt: number | null,
  getToken: GetToken,
  result: SyncResult,
): Promise<void> {
  const query = new URLSearchParams();

  if (lastPulledAt === null) {
    query.set("restore", "true");
  } else {
    query.set("since", iso(lastPulledAt));
  }

  let pulled: PullResponse;

  try {
    pulled = await apiFetch<PullResponse>(
      `/sync/pull?${query.toString()}`,
      getToken,
    );
  } catch (error) {
    if (error instanceof ApiUnreachableError) {
      result.status = "offline";
      return;
    }

    result.status = "refused";
    return;
  }

  // An **absent** collection and an **empty** one mean opposite things here, and
  // the type says nothing about which arrived. `subjects` is a full snapshot, so
  // an empty list is an instruction to forget every subject — which is right when
  // the family has removed them all, and catastrophic when it is only that this
  // phone is talking to a server built before the field existed. So a missing
  // field is left alone and an empty list is obeyed.
  const subjects = pulled.subjects?.map(toSubject) ?? null;

  try {
    result.reminders = applyReminders(pulled.reminders.map(toReminder));

    if (subjects !== null) {
      result.subjects = applyMemorySubjects(subjects);
    }

    result.restored = restoreSessions(pulled.sessions.map(toRestored));

    // Last, and only once all three have been written. The watermark is a
    // promise that everything up to it has been applied, so moving it before the
    // writes land would silently skip whatever did not.
    markPulled(Date.parse(pulled.synced_at));
  } catch {
    // A store that will not take the rows leaves the watermark where it was, so
    // the next pull asks for the same window again.
    result.status = "refused";
    return;
  }

  // After the watermark, deliberately. A photograph is a nicety on top of rows
  // that are already correct — a subject without its picture still draws, with
  // its name and how they are related — so a fetch that never completes must not
  // be the reason the same window is pulled down again tomorrow.
  if (subjects === null) {
    return;
  }

  try {
    result.photos = await cacheSubjectPhotos(subjects);
  } catch {
    // Whatever did arrive is on the phone; the rest is retried next sync.
  }
}

type Outcome =
  | { status: "ok"; ack: SyncAck }
  /** We could not ask. Nothing is known about the batch. */
  | { status: "offline" }
  /** We asked and were refused, for a reason retrying may well fix. */
  | { status: "refused" }
  /** We asked and were refused in a way retrying will not fix. */
  | { status: "poison" };

/** One batch, one request. */
async function send(
  entity: SyncEntity,
  batch: readonly SyncQueueRow[],
  deviceId: string,
  getToken: GetToken,
): Promise<Outcome> {
  let items: unknown[];

  try {
    items = batch.map((row) => toWire(entity, row));
  } catch {
    // A payload this build cannot read is one an older build wrote. The server
    // will not do better with it than we did.
    return { status: "poison" };
  }

  const body = {
    device_id: deviceId,
    app_version: Constants.expoConfig?.version ?? null,
    [COLLECTION[entity]]: items,
  };

  try {
    const ack = await apiFetch<SyncAck>(ENDPOINTS[entity], getToken, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return { status: "ok", ack };
  } catch (error) {
    if (error instanceof ApiUnreachableError) {
      return { status: "offline" };
    }

    if (error instanceof ApiError) {
      // 401 — the session needs refreshing, which needs a network.
      // 403 — this phone is enrolled to someone else, and a person has to fix
      //       that; sending the rows to the wrong patient would be worse.
      // 409 — nobody has enrolled this device against a patient yet. That is
      //       a state enrollment will resolve, so the rows wait for it.
      // 5xx — the server's problem, and not the row's.
      // 422 — this build sent something the server cannot parse. Only this one
      //       is the batch's own fault, and only this one is ever given up on.
      return { status: error.status === 422 ? "poison" : "refused" };
    }

    return { status: "refused" };
  }
}

/** A row that has failed a request the server answered too many times. */
const exhausted = (row: SyncQueueRow) => row.attempts + 1 >= MAX_ATTEMPTS;

/**
 * Record how far the server has acknowledged, honestly.
 *
 * The watermark is one number over two streams that share a counter, so the only
 * thing it can truthfully say is "everything below here is done". That is the
 * lowest sequence number still in the queue, minus one — and when the queue is
 * empty, every number ever handed out has landed, so it is the last one issued.
 *
 * Nothing decides what to send from this. The queue does that. This is what a
 * caregiver-facing "last synced" line would read, and it must not be able to
 * claim more than it knows.
 */
function advanceWatermark(nextSeq: number): void {
  const oldest = oldestQueuedSeq();

  markSynced(oldest === null ? nextSeq - 1 : oldest - 1);
}

/**
 * The queued snapshot, in the shape the API's schema names.
 *
 * Two conversions, both of them the wire's business and nowhere else's
 * (`data-model.md` §3): the device's epoch milliseconds become ISO 8601 UTC, and
 * its camelCase becomes the snake_case of `apps/api/src/features/sync/schemas.py`.
 *
 * Written out field by field rather than transformed by a rule, because this is
 * a contract between two codebases. A generic converter would quietly rename a
 * column the day somebody adds one, and the failure would land on the server as
 * a row that parsed and meant something else.
 */
function toWire(entity: SyncEntity, row: SyncQueueRow): unknown {
  const payload: unknown = JSON.parse(row.payload);

  if (typeof payload !== "object" || payload === null) {
    throw new Error("A queued payload is not an object.");
  }

  switch (entity) {
    case "game_session":
      return sessionWire(payload as SessionPayload);
    case "reminder_event":
      return reminderEventWire(payload as ReminderEventPayload);
    case "reminder":
      // The only stream whose `seq` is not in its own payload: a `reminder` row has
      // no sequence column, so the number comes off the queue entry that carries it.
      return reminderWire(payload as ReminderPayload, row.seq);
  }
}

/** The `game_session` row as `lib/game-history.ts` queued it. */
type SessionPayload = {
  id: string;
  seq: number;
  gameId: string;
  difficulty: number;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  timeOnTaskMs: number;
  attempts: number;
  correct: number;
  total: number;
  completed: boolean;
  accuracy: number;
  precision: number | null;
  completion: number;
  avgResponseMs: number;
  medianResponseMs: number;
  consistency: number | null;
  longestStreak: number;
};

function sessionWire(payload: SessionPayload) {
  return {
    id: payload.id,
    seq: payload.seq,
    game_id: payload.gameId,
    difficulty: payload.difficulty,
    started_at: iso(payload.startedAt),
    ended_at: iso(payload.endedAt),
    duration_ms: payload.durationMs,
    time_on_task_ms: payload.timeOnTaskMs,
    attempts: payload.attempts,
    correct: payload.correct,
    total: payload.total,
    completed: payload.completed,
    accuracy: payload.accuracy,
    precision: payload.precision,
    completion: payload.completion,
    avg_response_ms: payload.avgResponseMs,
    median_response_ms: payload.medianResponseMs,
    consistency: payload.consistency,
    longest_streak: payload.longestStreak,
  };
}

/** The `reminder` row as `addReminder` queued it. */
type ReminderPayload = {
  id: string;
  kind: string;
  title: string;
  detail: string | null;
  schedule: string;
  active: boolean;
};

/**
 * A reminder the reader made, in the shape the API takes.
 *
 * `notificationIds` is in the stored row and deliberately not here: which OS notifications
 * this phone has booked is local scheduling state, and the server neither knows nor should
 * know it (D-34).
 */
function reminderWire(payload: ReminderPayload, seq: number) {
  return {
    id: payload.id,
    seq,
    kind: payload.kind,
    title: payload.title,
    detail: payload.detail,
    schedule: payload.schedule,
    active: payload.active,
  };
}

/** The `reminder_event` row as `lib/reminders.ts` queued it. */
type ReminderEventPayload = {
  id: string;
  seq: number;
  reminderId: string;
  dueAt: number;
  acknowledgedAt: number | null;
  outcome: string;
};

function reminderEventWire(payload: ReminderEventPayload) {
  return {
    id: payload.id,
    seq: payload.seq,
    reminder_id: payload.reminderId,
    due_at: iso(payload.dueAt),
    acknowledged_at:
      payload.acknowledgedAt === null ? null : iso(payload.acknowledgedAt),
    outcome: payload.outcome,
  };
}

/** Epoch ms on the device, ISO 8601 UTC on the wire. Never a local-time string. */
const iso = (at: number) => new Date(at).toISOString();

/** `PullOut` in `apps/api/src/features/sync/schemas.py`. */
type PullResponse = {
  synced_at: string;
  reminders: {
    id: string;
    kind: string;
    title: string;
    detail: string | null;
    schedule: string;
    active: boolean;
    deleted: boolean;
  }[];
  sessions: {
    id: string;
    game_id: string;
    difficulty: number;
    started_at: string;
    ended_at: string;
    duration_ms: number;
    time_on_task_ms: number;
    attempts: number;
    correct: number;
    total: number;
    completed: boolean;
    accuracy: number;
    precision: number | null;
    completion: number;
    avg_response_ms: number;
    median_response_ms: number;
    consistency: number | null;
    longest_streak: number;
  }[];
  /** Absent from a server built before subjects synced. See `takeDown`. */
  subjects?: {
    id: string;
    kind: string;
    name: string | null;
    relation: string | null;
    photo_url: string | null;
    photo_key: string | null;
    created_at: string;
  }[];
  sessions_truncated: boolean;
};

/**
 * A pulled reminder, in the device's shape.
 *
 * `kind` is cast rather than checked. The server constrains it to the same four
 * values the device draws (`REMINDER_KINDS` in the dashboard schemas), and a
 * fifth would fail validation there long before it reached a phone — so the
 * alternative to trusting it is a runtime guard against a case that cannot occur
 * without both codebases being changed together.
 */
const toReminder = (
  row: PullResponse["reminders"][number],
): PulledReminder => ({
  id: row.id,
  kind: row.kind as PulledReminder["kind"],
  title: row.title,
  detail: row.detail,
  schedule: row.schedule,
  active: row.active,
  deleted: row.deleted,
});

/**
 * A pulled subject, in the device's shape.
 *
 * `kind` is cast for the same reason a reminder's is: the server constrains it,
 * and a value outside the three is left out of the tab by
 * `memorySubjectsByKind` rather than drawn under a heading nobody has written.
 * `relation` becomes `relationship` — the API cannot use that word as an
 * attribute name, and the device has no such constraint.
 */
const toSubject = (
  row: NonNullable<PullResponse["subjects"]>[number],
): PulledSubject => ({
  id: row.id,
  kind: row.kind as PulledSubject["kind"],
  name: row.name,
  relationship: row.relation,
  photoUrl: row.photo_url,
  photoKey: row.photo_key,
  createdAt: Date.parse(row.created_at),
});

/** A pulled round, in the device's shape. ISO 8601 back to epoch ms. */
const toRestored = (
  row: PullResponse["sessions"][number],
): RestoredSession => ({
  id: row.id,
  gameId: row.game_id,
  difficulty: row.difficulty,
  startedAt: Date.parse(row.started_at),
  endedAt: Date.parse(row.ended_at),
  durationMs: row.duration_ms,
  timeOnTaskMs: row.time_on_task_ms,
  attempts: row.attempts,
  correct: row.correct,
  total: row.total,
  completed: row.completed,
  accuracy: row.accuracy,
  precision: row.precision,
  completion: row.completion,
  avgResponseMs: row.avg_response_ms,
  medianResponseMs: row.median_response_ms,
  consistency: row.consistency,
  longestStreak: row.longest_streak,
});
