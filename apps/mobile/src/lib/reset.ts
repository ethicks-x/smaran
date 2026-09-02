import { clearDeviceData } from "@/db";
import type { GetToken } from "./api";
import { clearMedia } from "./media-cache";
import { notifyMemorySubjectsChange } from "./memory-subjects";
import { notifyRemindersChange } from "./reminders";
import { type SyncResult, sync } from "./sync";

/**
 * Forget everything this phone is holding, then take it all down again.
 *
 * The one deliberately destructive thing a reader can do, and the reason it is
 * safe is the order: **push, then wipe, then pull**. Everything the device owes
 * the server goes up first, and if it cannot go up the reset does not happen at
 * all. A phone in a valley with no signal is holding the only copy of last
 * week's rounds, and "clear this and fetch it again" would be a promise nobody
 * could keep.
 *
 * That makes this the second thing in the patient app that needs the network,
 * alongside writing quiz questions — and it does not break `AGENTS.md` §2.1,
 * because nothing a reader does *with* the app passes through here. It is a
 * repair for a phone showing something stale or wrong, reached from Settings,
 * and refusing it offline leaves them exactly where they were.
 *
 * What is **kept** is as deliberate as what goes: the Clerk session, so nobody
 * is asked to sign in again (§5); the reader's language and appearance, which
 * are their choices rather than the family's data; and this device's identity
 * and sequence counter, without which the server would take its next rounds for
 * duplicates (`db/reset.ts`).
 */

/**
 * How the reset ended.
 *
 * `offline` covers every way the first push failed to land — no radio, a server
 * that is down, a session the API would not take. They are one outcome to the
 * reader because the answer to all of them is the same: nothing was touched,
 * try again later.
 */
export type ResetStatus = "done" | "offline" | "unavailable";

export type ResetResult = {
  status: ResetStatus;
  /** What the pull brought back, or null if the reset did not get that far. */
  pulled: SyncResult | null;
};

/**
 * Run the reset. Never throws — every outcome is in the returned result, the
 * same way `sync` reports its own.
 */
export async function resetLocalData(getToken: GetToken): Promise<ResetResult> {
  // Everything the server has not heard about goes now, or nothing happens.
  const drained = await sync(getToken);

  if (drained.status !== "synced") {
    return { status: "offline", pulled: null };
  }

  try {
    clearDeviceData();
  } catch {
    // A store that will not open has already cost every screen that needed it
    // its own quieter failure. Nothing was deleted, so there is nothing to undo.
    return { status: "unavailable", pulled: null };
  }

  // After the rows, not before: a picture whose row is gone draws nowhere, and
  // a row pointing at a file that is gone draws a broken frame.
  clearMedia();

  // The tabs holding these are very likely the ones behind this screen. They
  // re-read on focus anyway; this is so the reader does not have to leave and
  // come back to see an empty day become their day again.
  notifyRemindersChange();
  notifyMemorySubjectsChange();

  // The watermark is null now, so this asks for a restore and brings down the
  // whole set — reminders, subjects, photographs and this reader's own history.
  // The recognition game's questions are not in it and do not need to be: they
  // are rewritten the next time that game is opened (`lib/memory-quiz.ts`).
  const pulled = await sync(getToken);

  return { status: "done", pulled };
}
