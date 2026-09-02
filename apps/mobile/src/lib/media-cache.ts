import { Directory, File, Paths } from "expo-file-system";

/**
 * The on-device copy of every picture that arrived over the network.
 *
 * The Memories tab has to draw with the radio off (`AGENTS.md` §2.1), so a
 * photograph is not something the app fetches when a screen mounts — it is
 * something sync brought down once and the screen reads off local flash. A
 * `photo_uri` column anywhere in `src/db` points here and never at a URL.
 *
 * It lives in the **document** directory rather than the cache directory, which
 * is the whole reason this module exists instead of leaning on `expo-image`'s
 * own disk cache. The cache directory is the system's to reclaim whenever
 * storage runs low, and an image cache the OS may quietly empty is fine for an
 * app that can re-fetch and wrong for one whose defining promise is that it
 * works in a valley with no signal.
 *
 * Files are named by a **stable key the server chose**, never by the URL they
 * came from. A photo arrives on a presigned URL that expires and is minted fresh
 * on every pull, so the URL says nothing about whether the bytes changed; the
 * key says exactly that, which is what lets a sync skip a download for a picture
 * the phone already has.
 */

/** Where cached media lives, under the document directory. */
const FOLDER = "media";

/**
 * Which table's pictures a call is about.
 *
 * The cache is partitioned by owner because {@link pruneMedia} deletes anything
 * its scope does not still want, and two tables sharing one folder would mean a
 * sync of the first quietly deleting the second's photographs. Adding a scope is
 * adding a member here, not inventing a second convention.
 */
export type MediaScope = "subjects";

/**
 * Fetch a file into the cache if the key is one we do not already hold.
 *
 * Returns the local `file://` uri to store, or null if the download did not
 * happen — offline, a URL that has expired, a bucket that said no. Null is an
 * ordinary outcome and not an error: the caller keeps whatever it had and the
 * next sync tries again.
 *
 * `cachedUri` is what the row already points at. When it is still there and the
 * key has not moved, this is a stat call and nothing more — which is the common
 * case on every sync after the first.
 */
export async function cacheMedia(
  scope: MediaScope,
  key: string,
  url: string,
  cachedUri: string | null,
): Promise<string | null> {
  const target = fileFor(scope, key);

  // The row's uri and the key agreeing is not enough on its own — the file can
  // be gone without the row knowing, if a restore put the database back without
  // the documents beside it.
  if (cachedUri === target.uri && target.exists) {
    return cachedUri;
  }

  try {
    ensureFolder(scope);

    // `idempotent` covers the other half of the check above: a file present
    // that the row had lost track of is overwritten rather than throwing.
    const downloaded = await File.downloadFileAsync(url, target, {
      idempotent: true,
    });

    return downloaded.uri;
  } catch {
    // Nothing is logged. A failed photo fetch is either no signal or an expired
    // URL, neither of which anyone can act on, and the message would name a
    // bucket path that identifies a patient (`AGENTS.md` §2.5).
    return null;
  }
}

/**
 * Delete cached files whose keys are no longer wanted.
 *
 * Called after a pull has replaced the rows, with the keys the new set still
 * refers to. A subject the family took down should not leave their photograph on
 * the phone — that is a privacy obligation and not housekeeping (§2.5).
 */
export function pruneMedia(scope: MediaScope, keep: ReadonlySet<string>): void {
  const wanted = new Set([...keep].map(fileName));
  const folder = folderFor(scope);

  if (!folder.exists) {
    return;
  }

  try {
    for (const entry of folder.list()) {
      if (entry instanceof File && !wanted.has(entry.name)) {
        entry.delete();
      }
    }
  } catch {
    // A file we could not remove is a file that stays. Worth trying again next
    // sync; not worth failing a sync over.
  }
}

/** The folder one scope's files live in. It does not have to exist. */
const folderFor = (scope: MediaScope) =>
  new Directory(Paths.document, FOLDER, scope);

/** The file a key maps to within its scope. It does not have to exist. */
const fileFor = (scope: MediaScope, key: string) =>
  new File(folderFor(scope), fileName(key));

/**
 * A key as a filename.
 *
 * Keys are object paths — `memories/<patient>/<asset>.jpg` — or, for an
 * externally hosted picture, a whole URL. Neither is a filename, so every
 * character that is not plainly safe becomes an underscore. The result only has
 * to be stable and collision-free among keys, which it is: the substitution is a
 * function of the key and the key is unique.
 *
 * The extension is dropped along with everything else. Nothing here opens the
 * file by type — `expo-image` sniffs the bytes — and a name that carried one
 * would be a second thing to keep in step with the server for no gain.
 */
const fileName = (key: string) => key.replace(/[^a-zA-Z0-9]/g, "_");

/** Create the scope's folder if this is the first thing it has ever cached. */
function ensureFolder(scope: MediaScope): void {
  // `intermediates` because `media/` itself may not be there either — on a phone
  // whose first ever sync is this one, neither level exists yet.
  folderFor(scope).create({ idempotent: true, intermediates: true });
}
