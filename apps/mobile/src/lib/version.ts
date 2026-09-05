/**
 * Release tags, and the rule that decides whether a reader is asked to update
 * or told to.
 *
 * Pure and free of I/O on purpose — every decision this file makes is one a
 * future change could get wrong without any screen looking different, so it is
 * kept where it can be read in one sitting and reasoned about without a phone.
 */

/**
 * How many minor releases a phone may fall behind before the update stops being
 * a choice.
 *
 * A major release is always forced, because a major number is the team saying
 * this build and the last one no longer agree about something. Five minors is
 * the softer version of the same statement: no single one of them was worth
 * interrupting anybody over, but a device that has skipped five of them is far
 * enough behind the dashboard its caregiver is reading that the gap is now a
 * safety question rather than a preference.
 */
const FORCED_MINOR_GAP = 5;

export type Version = {
  major: number;
  minor: number;
  patch: number;
  /** What follows the hyphen — `beta` in `1.1.0-beta` — or null for a stable release. */
  prerelease: string | null;
  /** The tag exactly as it was written, for copy and for naming a download. */
  raw: string;
};

/**
 * `1.2.3`, `v1.2.3`, `1.2.3-beta.1`, `1.2.3+build.4`.
 *
 * Anything else is not a version this app knows how to compare, and a release
 * tagged that way is passed over rather than guessed at — which is what "the
 * latest release with a valid version tag" has to mean in practice.
 */
const TAG =
  /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

/** The tag as a version, or null if it is not one. Never throws. */
export function parseVersion(tag: string): Version | null {
  const match = TAG.exec(tag.trim());

  if (!match?.[1] || !match[2] || !match[3]) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null,
    raw: tag.trim(),
  };
}

/**
 * Negative when `a` came first, positive when `b` did, zero when they are the
 * same release.
 *
 * The three numbers decide it, and a prerelease sorts below the stable release
 * of the same numbers — `1.1.0-beta` before `1.1.0` — which is the part of
 * semver that actually matters here. Two prereleases of the same version are
 * compared as plain strings rather than by semver's dotted-identifier rule: the
 * app only ever offers stable releases ({@link isStable}), so the only way to
 * reach this line is a hand-installed developer build, and a lexical answer is
 * a truthful "these differ" rather than a wrong "these are equal".
 */
export function compareVersions(a: Version, b: Version): number {
  if (a.major !== b.major) {
    return a.major - b.major;
  }

  if (a.minor !== b.minor) {
    return a.minor - b.minor;
  }

  if (a.patch !== b.patch) {
    return a.patch - b.patch;
  }

  if (a.prerelease === b.prerelease) {
    return 0;
  }

  if (a.prerelease === null) {
    return 1;
  }

  if (b.prerelease === null) {
    return -1;
  }

  return a.prerelease < b.prerelease ? -1 : 1;
}

/**
 * Whether this is a finished release rather than a trial build.
 *
 * The phone this runs on is in the hands of somebody with dementia, and a build
 * the team has explicitly marked as unfinished is not something to push onto it
 * unattended. Betas stay a thing a person installs by hand.
 */
export const isStable = (version: Version) => version.prerelease === null;

/**
 * How hard the app should press.
 *
 * `none` — the phone is on the newest build, or ahead of it.
 * `optional` — there is something newer and the reader decides.
 * `required` — the reader is told, and the only button says yes.
 */
export type UpdateUrgency = "none" | "optional" | "required";

export function urgencyOf(installed: Version, latest: Version): UpdateUrgency {
  if (compareVersions(latest, installed) <= 0) {
    return "none";
  }

  if (latest.major > installed.major) {
    return "required";
  }

  // Only meaningful within one major line. Across majors the branch above has
  // already answered, and subtracting minors between two major versions would
  // be comparing two different counters.
  if (latest.minor - installed.minor >= FORCED_MINOR_GAP) {
    return "required";
  }

  return "optional";
}
