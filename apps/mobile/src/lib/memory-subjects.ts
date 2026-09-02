import { desc, eq, inArray, notInArray } from "drizzle-orm";

import { db } from "@/db";
import {
  type MemorySubjectKind,
  type MemorySubjectRow,
  memorySubject,
} from "@/db/schema";
import { cacheMedia, pruneMedia } from "./media-cache";

/**
 * The people, places and objects the family wants the reader to recognise.
 *
 * **This street runs one way.** A subject is the caregiver's record of who and
 * what matters to this reader; the device takes what it is given and has nothing
 * to send back (`data-model.md` §3 rule 2). Nothing in this file writes to
 * `sync_queue`, and nothing should ever be added that does.
 *
 * The reads are synchronous like the rest of `src/db` (`decisions.md` D-24), so
 * the Memories tab asks for its rows while it renders and never grows a loading
 * state. The one asynchronous thing here is fetching photographs, and it is
 * deliberately not on that path: the rows land first and draw immediately, and
 * the pictures fill in behind them as they arrive.
 */

/** The three groups, in the order the Memories tab shows them. */
export const SUBJECT_KINDS: readonly MemorySubjectKind[] = [
  "person",
  "place",
  "object",
];

/**
 * A subject as the server hands it down.
 *
 * `photoUrl` is not a column and never becomes one. It is a presigned GET that
 * expires within the hour and is minted fresh on every pull, so a stored copy
 * would be a URL that is wrong by tomorrow — the sort of thing a screen would
 * try, fail at, and show a broken picture for. What is stored is `photoKey`, the
 * stable name of the bytes, and the file those bytes were written to.
 */
export type PulledSubject = {
  id: string;
  kind: MemorySubjectKind;
  name: string | null;
  relationship: string | null;
  /** Fetchable now, expiring soon. Null for a subject with no picture. */
  photoUrl: string | null;
  /** Stable across pulls, and the media cache's key. Null exactly when the URL is. */
  photoKey: string | null;
  createdAt: number;
};

/** One category and everything in it, newest first. */
export type MemorySubjectGroup = {
  kind: MemorySubjectKind;
  subjects: MemorySubjectRow[];
};

/**
 * Every subject, split into the three categories the tab is divided into.
 *
 * Empty groups come back empty rather than being dropped, so the caller decides
 * whether an absent category is a heading with nothing under it or nothing at
 * all. A row whose `kind` is none of the three is left out: a fourth category
 * would need a heading nobody has written in four languages, and showing it
 * unlabelled is worse than not showing it (`AGENTS.md` §2.3).
 */
export function memorySubjectsByKind(): MemorySubjectGroup[] {
  const rows = db()
    .select()
    .from(memorySubject)
    .where(inArray(memorySubject.kind, [...SUBJECT_KINDS]))
    // Newest first, matching the order the caregiver's own list is in — the
    // person they just added is the one they are looking for.
    .orderBy(desc(memorySubject.createdAt))
    .all();

  return SUBJECT_KINDS.map((kind) => ({
    kind,
    subjects: rows.filter((row) => row.kind === kind),
  }));
}

/**
 * Take the set of subjects the server just sent, exactly as it sent them.
 *
 * **A replace, not a merge.** The pull carries the complete active set rather
 * than a delta, because the server has no `updated_at` on these rows and deletes
 * them outright — so there is no tombstone a removal could arrive as, and
 * anything short of a full replace would leave the phone drawing a subject the
 * family took down. Rows not named here are gone, and that is the only way
 * "gone" can be expressed.
 *
 * `photoUri` survives an update whenever `photoKey` has not moved. That is the
 * point of having two fields: the picture's URL is different on every pull and
 * says nothing, and the key says whether the bytes changed. A subject whose name
 * was corrected keeps the photograph already on the phone and costs no download.
 *
 * The file itself is left alone here and fetched afterwards by
 * {@link cacheSubjectPhotos}. Writing rows is local and instant; fetching a
 * photograph is a network call that may never complete, and the tab should draw
 * the moment the first is done rather than waiting on the second.
 */
export function applyMemorySubjects(pulled: readonly PulledSubject[]): number {
  const count = db().transaction((tx) => {
    if (pulled.length === 0) {
      tx.delete(memorySubject).run();
      return 0;
    }

    const held = new Map(
      tx
        .select({
          id: memorySubject.id,
          photoKey: memorySubject.photoKey,
          photoUri: memorySubject.photoUri,
        })
        .from(memorySubject)
        .all()
        .map((row) => [row.id, row]),
    );

    for (const subject of pulled) {
      const existing = held.get(subject.id);

      // Same key, same bytes, so the file already on the phone is still the
      // right one. A different key — or none — starts again from nothing.
      const photoUri =
        existing && existing.photoKey === subject.photoKey
          ? existing.photoUri
          : null;

      const values = {
        id: subject.id,
        kind: subject.kind,
        name: subject.name,
        relationship: subject.relationship,
        photoUri,
        photoKey: subject.photoKey,
        createdAt: subject.createdAt,
      };

      tx.insert(memorySubject)
        .values(values)
        .onConflictDoUpdate({ target: memorySubject.id, set: values })
        .run();
    }

    tx.delete(memorySubject)
      .where(
        notInArray(
          memorySubject.id,
          pulled.map((subject) => subject.id),
        ),
      )
      .run();

    return pulled.length;
  });

  // Photographs of a named person living with dementia do not stay on a phone
  // after the family has taken them down (`AGENTS.md` §2.5). Outside the
  // transaction: a file that will not delete must not roll back the rows.
  pruneMedia(
    "subjects",
    new Set(
      pulled
        .map((subject) => subject.photoKey)
        .filter((key): key is string => key !== null),
    ),
  );

  notifyMemorySubjectsChange();
  return count;
}

/**
 * Fetch the photographs the phone does not have yet, one at a time.
 *
 * Takes the pulled rows rather than reading them back, because the URL to fetch
 * from is only ever in the pull — it is never stored, being expired by the time
 * anything could read it.
 *
 * Serial rather than parallel, and that is the right trade on the connection
 * this runs over: a handful of photographs opened at once on a village 2G link
 * finish no sooner and are far likelier to have all of them time out together.
 *
 * Every failure is survivable and none of them stop the rest. A subject whose
 * photograph did not arrive keeps a null `photoUri` and draws as a subject
 * without a picture, which is a smaller loss than a tab that will not open; the
 * next sync tries it again.
 */
export async function cacheSubjectPhotos(
  pulled: readonly PulledSubject[],
): Promise<number> {
  let fetched = 0;

  for (const subject of pulled) {
    if (subject.photoUrl === null || subject.photoKey === null) {
      continue;
    }

    // Read the row rather than trusting what `applyMemorySubjects` decided: a
    // second sync overlapping the first would otherwise re-download every
    // picture the first one had already saved.
    const row = db()
      .select({ photoUri: memorySubject.photoUri })
      .from(memorySubject)
      .where(eq(memorySubject.id, subject.id))
      .get();

    if (!row) {
      continue;
    }

    const uri = await cacheMedia(
      "subjects",
      subject.photoKey,
      subject.photoUrl,
      row.photoUri,
    );

    if (uri === null || uri === row.photoUri) {
      continue;
    }

    db()
      .update(memorySubject)
      .set({ photoUri: uri })
      .where(eq(memorySubject.id, subject.id))
      .run();

    fetched += 1;
  }

  if (fetched > 0) {
    notifyMemorySubjectsChange();
  }

  return fetched;
}

type MemorySubjectsChangeListener = () => void;
const subjectListeners = new Set<MemorySubjectsChangeListener>();

export function onMemorySubjectsChange(
  listener: MemorySubjectsChangeListener,
): () => void {
  subjectListeners.add(listener);
  return () => {
    subjectListeners.delete(listener);
  };
}

export function notifyMemorySubjectsChange(): void {
  for (const listener of subjectListeners) {
    try {
      listener();
    } catch (error) {
      console.warn("Error in memory subject change listener", error);
    }
  }
}
