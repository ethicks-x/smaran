import { db } from "./client";
import {
  device,
  gameSession,
  memoryItem,
  memoryQuestion,
  memorySubject,
  patient,
  person,
  reminder,
  reminderEvent,
  remoteSession,
  sessionEvent,
  syncQueue,
} from "./schema";

/**
 * Empty every table the device keeps content in, and ask for the whole of it
 * again on the next pull.
 *
 * This is the storage half of the reset in Settings; `lib/reset.ts` is the half
 * that decides when it is safe to run. Nothing here checks anything — by the
 * time it is called the outbox has already been drained, and what it deletes is
 * either the server's copy of something or a queue entry the server has
 * acknowledged.
 *
 * **The `device` row survives, and that matters.** Its id and `next_seq` are the
 * two halves of the `(device_id, seq)` key the server upserts on
 * (`decisions.md` D-09): a device that reset its counter would number tomorrow's
 * rounds over last month's and have them silently taken as duplicates. What is
 * cleared is `last_pulled_at`, and only that — a null watermark is exactly the
 * state a fresh install is in, so the next pull asks for a restore and brings
 * this reader's whole history back down (`lib/sync.ts`, `takeDown`).
 *
 * One transaction. A reset interrupted halfway is a phone showing half a day.
 */
export function clearDeviceData(): void {
  db().transaction((tx) => {
    // The queue first, and for the same reason `forgetSessions` does it first:
    // an entry left behind would point at a row that no longer exists.
    tx.delete(syncQueue).run();

    tx.delete(sessionEvent).run();
    tx.delete(gameSession).run();
    tx.delete(remoteSession).run();

    tx.delete(reminderEvent).run();
    tx.delete(reminder).run();

    tx.delete(memoryQuestion).run();
    tx.delete(memorySubject).run();
    tx.delete(memoryItem).run();

    tx.delete(person).run();
    tx.delete(patient).run();

    tx.update(device).set({ lastPulledAt: null }).run();
  });
}
