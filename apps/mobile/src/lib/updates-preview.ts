import Constants from "expo-constants";

import type { AvailableUpdate, FetchListeners, FetchResult } from "./updates";
import { parseVersion } from "./version";

/**
 * A way to look at the update card without publishing a release.
 *
 * Everything in `lib/updates.ts` is driven by what GitHub says, which makes the
 * one screen it owns almost impossible to see on purpose: a phone running the
 * newest build — which is every developer's phone, most days — is told there is
 * nothing to do, and correctly draws nothing. Waiting for a real release to look
 * at a dialog is not a way to work on it.
 *
 * So `EXPO_PUBLIC_UPDATE_PREVIEW` puts the card into a chosen state and keeps
 * the network out of it entirely. **`__DEV__` only** — {@link updatePreview}
 * returns null in a release build whatever the variable says, so a misconfigured
 * production build cannot show a reader an update that does not exist.
 *
 * ```
 * EXPO_PUBLIC_UPDATE_PREVIEW=offered      # the question, with a "Not now"
 * EXPO_PUBLIC_UPDATE_PREVIEW=required     # the announcement, no way out
 * EXPO_PUBLIC_UPDATE_PREVIEW=unavailable  # could not finish
 * EXPO_PUBLIC_UPDATE_PREVIEW=corrupt      # the bytes did not match
 * EXPO_PUBLIC_UPDATE_PREVIEW=refused      # Android would not open the installer
 * ```
 *
 * The first two are the live ones: saying yes walks through downloading,
 * checking and installing on a timer, so every stage of the card can be watched
 * without a hundred megabytes moving. Nothing here touches the disk, GitHub, or
 * the package installer.
 */

/** What a previewed run pretends the download weighs. */
const FAKE_BYTES = 120 * 1024 * 1024;

/** Roughly how long the simulated download takes, start to finish. */
const DOWNLOAD_MS = 6000;

/** How often the fake progress moves. Close to what a real one manages. */
const TICK_MS = 120;

/** How long the card sits on "checking that everything arrived safely". */
const VERIFY_MS = 3000;

export type UpdatePreview = {
  update: AvailableUpdate;
  /** Whether the card opens on the question, or on a failure. */
  stage: "offered" | "failed";
  failure: "unavailable" | "corrupt" | "refused" | null;
};

/**
 * What the environment is asking to be shown, or null for the real thing.
 *
 * Null in every release build, and null in development unless the variable is
 * set — so the ordinary case is the ordinary code path.
 */
export function updatePreview(): UpdatePreview | null {
  if (!__DEV__) {
    return null;
  }

  const wanted = process.env.EXPO_PUBLIC_UPDATE_PREVIEW?.trim();

  switch (wanted) {
    case "offered":
      return {
        update: fakeUpdate("optional"),
        stage: "offered",
        failure: null,
      };
    case "required":
      return {
        update: fakeUpdate("required"),
        stage: "offered",
        failure: null,
      };
    case "unavailable":
    case "corrupt":
    case "refused":
      return {
        update: fakeUpdate("optional"),
        stage: "failed",
        failure: wanted,
      };
    default:
      return null;
  }
}

/**
 * A plausible version to show in the copy, worked out from the one installed.
 *
 * An optional update is the next minor, a required one the next major, which is
 * what would actually have to be published for the app to reach either state —
 * so the number on the card reads like a real one rather than a placeholder.
 */
function fakeUpdate(urgency: AvailableUpdate["urgency"]): AvailableUpdate {
  const installed = parseVersion(Constants.expoConfig?.version ?? "1.0.0");
  const major = installed?.major ?? 1;
  const minor = installed?.minor ?? 0;

  return {
    version:
      urgency === "required" ? `${major + 1}.0.0` : `${major}.${minor + 1}.0`,
    urgency,
    // Never fetched. Named so that anything which did try to fetch it fails
    // loudly and locally rather than reaching out to something real.
    url: "https://example.invalid/preview.apk",
    sha256: "0".repeat(64),
    bytes: FAKE_BYTES,
  };
}

/**
 * The same shape as `fetchAndInstall`, on a timer instead of a network.
 *
 * Deliberately interface-compatible, so the provider swaps one for the other
 * and every other line of it — the stage handling, the progress, what happens
 * at the end — is the code that actually ships rather than a second copy of it
 * written for the preview.
 *
 * It ends on `handed-off`, which leaves the card on "your phone will ask you to
 * install" exactly as a real run does at the moment Android takes over.
 */
export async function simulateFetchAndInstall(
  _update: AvailableUpdate,
  listeners: FetchListeners,
): Promise<FetchResult> {
  listeners.onStage("downloading");

  for (let elapsed = 0; elapsed <= DOWNLOAD_MS; elapsed += TICK_MS) {
    listeners.onProgress(elapsed / DOWNLOAD_MS);
    await wait(TICK_MS);
  }

  listeners.onStage("verifying");
  listeners.onProgress(0);

  // Checked at the same granularity it is drawn at, for the same reason the
  // real one reports progress: a hundred megabytes hashed in JavaScript is long
  // enough that a still bar reads as a stuck app.
  for (let elapsed = 0; elapsed <= VERIFY_MS; elapsed += TICK_MS) {
    listeners.onProgress(elapsed / VERIFY_MS);
    await wait(TICK_MS);
  }

  listeners.onStage("installing");

  return "handed-off";
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
