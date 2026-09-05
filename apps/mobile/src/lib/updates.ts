import Constants from "expo-constants";
import { Directory, File, Paths } from "expo-file-system";
import { getContentUriAsync } from "expo-file-system/legacy";
import { sha256 } from "js-sha256";
import { Platform } from "react-native";

import {
  compareVersions,
  isStable,
  parseVersion,
  type UpdateUrgency,
  urgencyOf,
  type Version,
} from "./version";

/**
 * Keeping the app on the phone up to date, without a store.
 *
 * Smaran is not on Google Play. It is handed to a family on a device somebody
 * set up for them, and after that nobody is going to sideload a new build by
 * hand every few weeks. So the app carries its own updater: it asks GitHub what
 * the newest release is, and if that is newer than what is running it fetches
 * the APK, checks the bytes against the hash the release publishes, and hands
 * the file to Android's package installer.
 *
 * **This is the one part of the app that is allowed to need a network, and it
 * is not an exception to §2.1.** Nothing here is on the path to a screen. A
 * phone that never reaches GitHub plays every game, shows every reminder and
 * opens exactly as fast as one that does — the check runs beside the app, is
 * awaited by nothing, and reports "we could not ask" as an ordinary outcome
 * rather than a failure worth telling anybody about.
 *
 * Three things it will not do:
 *
 * 1. **Install bytes it has not checked.** The release names a SHA-256 and the
 *    downloaded file has to match it. A file that does not is deleted, not
 *    installed — a truncated 2G download and a tampered one look identical from
 *    here, and neither belongs in front of this reader.
 * 2. **Offer an unfinished build.** Prereleases are skipped outright.
 * 3. **Log anything.** Not a URL, not a path, not a version. There is nothing
 *    here anybody could act on and §2.5 does not make an exception for
 *    infrastructure.
 */

/** The repository this app ships from, when the environment does not say. */
const DEFAULT_REPO = "ethicks-x/smaran";

/** `owner/name`, and nothing that could reshape the URL it is spliced into. */
const REPO = /^[\w.-]+\/[\w.-]+$/;

/**
 * Where releases are published. Public, unauthenticated, rate-limited by IP.
 *
 * The repository comes from `EXPO_PUBLIC_UPDATE_REPO` as `owner/name`, so a
 * fork, a staging channel or a private mirror can be pointed at without a code
 * change — the same shape `EXPO_PUBLIC_API_URL` has in `lib/api.ts`. A value
 * that is missing, blank or not `owner/name` falls back to the repository this
 * app actually ships from rather than building a URL that could only 404: an
 * updater that quietly stops updating is worse than one nobody reconfigured.
 */
function resolveReleasesUrl(): string {
  const configured = process.env.EXPO_PUBLIC_UPDATE_REPO?.trim();
  const repo = configured && REPO.test(configured) ? configured : DEFAULT_REPO;

  return `https://api.github.com/repos/${repo}/releases?per_page=30`;
}

const RELEASES_URL = resolveReleasesUrl();

/** How long to wait for GitHub before deciding the phone has no useful signal. */
const CATALOGUE_TIMEOUT_MS = 15 * 1000;

/**
 * Which asset in a release is the thing to install.
 *
 * Android only. iOS has no sideload path at all — there is no intent to hand a
 * file to, and an `.ipa` on disk does nothing — so the check does not run there
 * rather than running and offering something unusable.
 */
const ASSET_EXTENSION = ".apk";

/** Where a downloaded build waits, under the cache directory. */
const FOLDER = "updates";

/**
 * How much more than the APK's own size has to be free before starting.
 *
 * A download that fills the disk fails late, after twenty minutes of somebody's
 * data, and takes the rest of the app's storage down with it on the way.
 */
const DISK_HEADROOM = 1.15;

/**
 * How many bytes are hashed before the loop lets the interface breathe.
 *
 * The Expo SDK has no incremental native digest, so a 120 MB APK is hashed in
 * JavaScript. That is seconds of arithmetic on a cheap tablet, and doing it in
 * one run would freeze the progress bar the reader is watching for the whole of
 * it. Yielding to the event loop every few megabytes costs a little throughput
 * and buys an interface that stays alive.
 */
const HASH_YIELD_BYTES = 4 * 1024 * 1024;

/** A release, as GitHub's API describes one. Only the fields this file reads. */
type GitHubRelease = {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  assets: GitHubAsset[];
};

type GitHubAsset = {
  name: string;
  browser_download_url: string;
  size: number;
  /** `sha256:<hex>`, computed by GitHub on upload. Absent on older assets. */
  digest?: string | null;
};

/** A build worth installing, and everything needed to install it safely. */
export type AvailableUpdate = {
  /** The release tag, for copy: "Smaran 1.2.0". */
  version: string;
  /** Whether the reader gets a choice about it. Never `none` — see {@link UpdateCheck}. */
  urgency: Exclude<UpdateUrgency, "none">;
  url: string;
  /** Lowercase hex. The download is measured against this and nothing else. */
  sha256: string;
  bytes: number;
};

/**
 * How a check ended.
 *
 * `unavailable` covers every way the question could not be answered — no radio,
 * GitHub rate-limiting this IP, a release with no APK on it, a hash nobody
 * published. They are one case because the app does the same thing for all of
 * them: nothing, quietly, and asks again next launch.
 */
export type UpdateCheck =
  | { status: "current" }
  | { status: "available"; update: AvailableUpdate }
  /** Not Android. Nothing to do, ever — not worth retrying. */
  | { status: "unsupported" }
  | { status: "unavailable" };

/**
 * Ask whether there is a newer build, and whether the reader gets a say.
 *
 * Never throws. Every outcome a caller could act on is a returned value,
 * because for this caller "GitHub was unreachable" is not an exceptional
 * event — it is most of the days in a valley in Meghalaya.
 */
export async function checkForUpdate(): Promise<UpdateCheck> {
  if (Platform.OS !== "android") {
    return { status: "unsupported" };
  }

  const installed = parseVersion(Constants.expoConfig?.version ?? "");

  if (!installed) {
    // A build whose own version is unreadable cannot be compared against
    // anything, and guessing which way the comparison would have gone is how a
    // phone ends up downgrading itself.
    return { status: "unavailable" };
  }

  const releases = await fetchCatalogue();

  if (!releases) {
    return { status: "unavailable" };
  }

  const latest = newestRelease(releases);

  if (!latest) {
    return { status: "unavailable" };
  }

  const urgency = urgencyOf(installed, latest.version);

  if (urgency === "none") {
    // On the newest build there is, so anything still sitting in the folder is
    // a finished or abandoned download taking up a tenth of a gigabyte.
    discardDownloads();
    return { status: "current" };
  }

  const asset = installable(latest.release);

  if (!asset) {
    // A release with no APK on it, or one with no published hash. Newer, and
    // not something this app can safely install, which is the same as nothing.
    return { status: "unavailable" };
  }

  return {
    status: "available",
    update: {
      version: latest.version.raw,
      urgency,
      url: asset.browser_download_url,
      sha256: asset.sha256,
      bytes: asset.size,
    },
  };
}

/** What the reader is watching while this runs. */
export type FetchStage = "downloading" | "verifying" | "installing";

/**
 * How the fetch ended.
 *
 * `handed-off` is as far as this app can see. Once the installer has the file,
 * whether it is accepted, refused or abandoned belongs to Android and to the
 * person holding the phone; the next launch finds out by checking again.
 */
export type FetchResult =
  | "handed-off"
  /** Could not download it — no signal, no room, GitHub said no. */
  | "unavailable"
  /** The bytes did not match the published hash. The file is gone. */
  | "corrupt"
  /** Android would not open the installer at all. */
  | "refused";

export type FetchListeners = {
  onStage: (stage: FetchStage) => void;
  /**
   * How far the current stage has come, 0–1. Sent during `downloading` and
   * during `verifying` — both are minutes long on the phones this app is built
   * for — and reset to zero as each of them begins, so a bar drawn from it
   * always measures the stage the reader is being told about rather than the
   * one before it. Nothing is sent during `installing`, which is a handover
   * rather than a piece of work.
   */
  onProgress: (fraction: number) => void;
};

/**
 * Fetch the build, prove it is the build, and hand it to Android.
 *
 * Never throws, for the same reason {@link checkForUpdate} does not. The three
 * steps run without asking anything further of the reader — the only decision
 * that was ever theirs is the one that got us here.
 */
export async function fetchAndInstall(
  update: AvailableUpdate,
  listeners: FetchListeners,
): Promise<FetchResult> {
  const target = fileFor(update.version);

  // Anything else in the folder is a build we are no longer installing. It goes
  // before the download rather than after it, because the reason it matters is
  // the free space the download is about to need.
  discardDownloads(target.name);

  listeners.onStage("downloading");

  // A file already here is worth hashing before it is worth a hundred megabytes
  // of somebody's data. Usually it is a complete download the reader never got
  // round to installing, and the hash below confirms that in seconds. If the app
  // was killed mid-download instead it is a partial one, the hash rejects it,
  // and the next attempt starts over — which is exactly what should happen.
  if (!target.exists) {
    if (!hasRoomFor(update.bytes)) {
      return "unavailable";
    }

    try {
      // `intermediates` because `updates/` itself may be missing too — on a
      // phone whose first update this is, neither level has ever been created.
      target.parentDirectory.create({ idempotent: true, intermediates: true });

      await File.downloadFileAsync(update.url, target, {
        idempotent: true,
        onProgress: ({ bytesWritten, totalBytes }) => {
          // `-1` when the server sent no Content-Length. GitHub always does,
          // but a proxy in between may not, and dividing by it would drive the
          // bar backwards.
          if (totalBytes > 0) {
            listeners.onProgress(bytesWritten / totalBytes);
          }
        },
      });
    } catch {
      // Android streams the response straight into the destination, so a
      // download that died halfway leaves a partial file behind. Left there it
      // would be picked up as a resumable one next time and fail its hash
      // forever; deleted, the next attempt simply starts again.
      discard(target);
      return "unavailable";
    }
  }

  listeners.onStage("verifying");
  listeners.onProgress(0);

  const digest = await hashFile(target, listeners.onProgress);

  if (digest !== update.sha256) {
    // A truncated download and a substituted one are indistinguishable from
    // here, so both are treated as the worse of the two. Nothing that failed
    // this check is ever handed to the installer.
    discard(target);
    return "corrupt";
  }

  listeners.onStage("installing");

  return await handOff(target);
}

/**
 * The releases GitHub knows about, or null if it could not be asked.
 *
 * Unauthenticated, so it is rate-limited per IP — which is fine at one call per
 * app launch and is another reason a null here is unremarkable.
 */
async function fetchCatalogue(): Promise<GitHubRelease[] | null> {
  // Hand-rolled rather than `AbortSignal.timeout`, which the React Native
  // runtime does not reliably carry. Without one, a captive portal that accepts
  // the connection and then says nothing would leave this pending for as long
  // as the app is open.
  const giveUpAfter = new AbortController();
  const timer = setTimeout(() => giveUpAfter.abort(), CATALOGUE_TIMEOUT_MS);

  try {
    const response = await fetch(RELEASES_URL, {
      headers: { Accept: "application/vnd.github+json" },
      signal: giveUpAfter.signal,
    });

    if (!response.ok) {
      return null;
    }

    const body: unknown = await response.json();

    return Array.isArray(body) ? (body as GitHubRelease[]) : null;
  } catch {
    // Offline, a DNS that went nowhere, a body that was not JSON. One answer.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The newest release worth considering, or null if none of them are.
 *
 * Three things disqualify a release: a tag that is not a version, a draft (not
 * published, and its assets are not downloadable anyway), and a prerelease —
 * GitHub's flag or a semver suffix, either one. **Position in the list decides
 * nothing.** GitHub returns releases by creation date, and a patch cut today
 * off last month's branch would sit above the release it is older than.
 */
function newestRelease(
  releases: readonly GitHubRelease[],
): { release: GitHubRelease; version: Version } | null {
  let best: { release: GitHubRelease; version: Version } | null = null;

  for (const release of releases) {
    if (release.draft || release.prerelease) {
      continue;
    }

    const version = parseVersion(release.tag_name);

    if (!version || !isStable(version)) {
      continue;
    }

    if (!best || compareVersions(version, best.version) > 0) {
      best = { release, version };
    }
  }

  return best;
}

/**
 * The APK in a release, with the hash it is going to be checked against.
 *
 * The hash comes from GitHub's own `digest`, which it computes itself when the
 * asset is uploaded. A `sha256sum.txt` published beside the APK is deliberately
 * ignored: it is a file anyone who could replace the APK could replace in the
 * same breath, so checking one against the other proves only that they agree.
 * **No digest means no install** — an unverified APK is exactly the thing this
 * module exists to avoid putting in front of somebody with dementia.
 *
 * A release with several APKs on it takes the first, in the order GitHub lists
 * them. Nothing here splits builds by ABI today; if that ever changes this is
 * the line that has to learn about it.
 */
function installable(
  release: GitHubRelease,
): { browser_download_url: string; size: number; sha256: string } | null {
  const apk = release.assets.find((asset) =>
    asset.name.toLowerCase().endsWith(ASSET_EXTENSION),
  );

  if (!apk) {
    return null;
  }

  const sha256 = digestOf(apk.digest);

  if (!sha256) {
    return null;
  }

  return {
    browser_download_url: apk.browser_download_url,
    size: apk.size,
    sha256,
  };
}

/** `sha256:<64 hex>` as plain lowercase hex, or null if it is anything else. */
function digestOf(digest: string | null | undefined): string | null {
  const match = /^sha256:([a-f0-9]{64})$/i.exec(digest?.trim() ?? "");

  return match?.[1] ? match[1].toLowerCase() : null;
}

/** Whether there is room for the download and then some. */
function hasRoomFor(bytes: number): boolean {
  try {
    return Paths.availableDiskSpace > bytes * DISK_HEADROOM;
  } catch {
    // A device that will not answer the question gets the benefit of the doubt;
    // the download itself will fail honestly if there is really no room.
    return true;
  }
}

/**
 * SHA-256 of a file on disk, read a chunk at a time.
 *
 * Streamed rather than read whole. The APK is over a hundred megabytes and the
 * phones this app is built for have one or two gigabytes of RAM in total, so
 * pulling the file into an ArrayBuffer to hand it to a native digest would be
 * trading a certain out-of-memory crash for a faster hash. Memory here stays
 * flat at one chunk.
 *
 * Returns null if the file could not be read, which is treated as a mismatch by
 * the caller — the whole point is that only bytes we have actually measured get
 * installed.
 *
 * Progress is reported on the same breath the loop takes anyway. A hundred
 * megabytes of JavaScript arithmetic is long enough that a reader watching a
 * still bar would reasonably conclude the app had stopped, and the fraction is
 * exact here — unlike a download, the total is a file already on this disk.
 */
async function hashFile(
  file: File,
  onProgress: (fraction: number) => void,
): Promise<string | null> {
  const hasher = sha256.create();
  const reader = file.readableStream().getReader();

  // `size` is what the loop is measured against, and a device that will not
  // report it leaves the bar at zero rather than dividing by nothing. The stage
  // still finishes; only the number is missing.
  const total = file.size ?? 0;

  let hashed = 0;
  let sinceBreath = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      hasher.update(value);
      hashed += value.byteLength;
      sinceBreath += value.byteLength;

      if (sinceBreath >= HASH_YIELD_BYTES) {
        sinceBreath = 0;

        if (total > 0) {
          onProgress(hashed / total);
        }

        await breathe();
      }
    }

    onProgress(1);

    return hasher.hex();
  } catch {
    return null;
  } finally {
    // Releases the native handle whether the read finished or threw. Without it
    // a failed verify would hold the file open against the delete that follows.
    reader.releaseLock();
  }
}

/**
 * Yields to the event loop.
 *
 * A macrotask rather than a resolved promise on purpose: a microtask would run
 * before React ever got a chance to paint, which is the entire thing this is
 * for.
 */
const breathe = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Hand the file to Android's package installer.
 *
 * The APK goes across as a `content://` uri from expo-file-system's own
 * FileProvider, with read permission granted to whoever opens it — a bare
 * `file://` uri has been refused since Android 7. `ACTION_VIEW` with the
 * package mime type rather than `ACTION_INSTALL_PACKAGE`, which has been
 * deprecated for several releases now.
 *
 * What comes back is not an answer. The installer returns as soon as it has the
 * file, long before anybody has tapped Install, so the result code says nothing
 * about whether the update landed. The next launch is what finds that out.
 *
 * The reader still has to allow Smaran to install apps, once, the first time
 * this runs. Android puts that switch in front of them itself.
 *
 * `expo-intent-launcher` is imported **here** rather than at the top of the
 * file, because on Android it resolves its native module the moment it is
 * imported. This module is reachable from the root layout, so a static import
 * would mean a dev client built before this feature landed failing to start at
 * all rather than simply being unable to finish an install. Loaded at the point
 * of use, a missing module is one caught error and a dialog that says so.
 */
async function handOff(file: File): Promise<FetchResult> {
  try {
    const IntentLauncher = await import("expo-intent-launcher");
    const contentUri = await getContentUriAsync(file.uri);

    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
      data: contentUri,
      type: "application/vnd.android.package-archive",
      // FLAG_GRANT_READ_URI_PERMISSION. Without it the installer is handed a
      // uri it is not allowed to open.
      flags: 1,
    });

    return "handed-off";
  } catch {
    return "refused";
  }
}

/**
 * Where a version's download lives. It does not have to exist.
 *
 * The tag goes into the name unescaped, which is safe because it only ever
 * reaches here having matched the version pattern in `lib/version.ts` — digits,
 * dots, hyphens and letters, and nothing that could climb out of the folder.
 */
const fileFor = (version: string) =>
  new File(new Directory(Paths.cache, FOLDER), `smaran-${version}.apk`);

/**
 * Delete every download except, optionally, one.
 *
 * The folder is under the cache directory, so Android may empty it whenever
 * storage runs short — which is correct for an APK and would be wrong for
 * anything the reader would miss. This is the app doing the same tidying up on
 * purpose, so that a phone which has finished updating is not still carrying the
 * installer that got it there.
 */
function discardDownloads(keep?: string): void {
  const folder = new Directory(Paths.cache, FOLDER);

  if (!folder.exists) {
    return;
  }

  try {
    for (const entry of folder.list()) {
      if (entry instanceof File && entry.name !== keep) {
        entry.delete();
      }
    }
  } catch {
    // A file that would not go is a file that stays. Next launch tries again.
  }
}

/** Remove one download, if it is there. Failing to is not worth reporting. */
function discard(file: File): void {
  try {
    file.delete();
  } catch {
    // Nothing is logged: the path is on the reader's own device (§2.5), and
    // there is nothing here anybody could do with the message.
  }
}
