import "server-only";

/**
 * Where to find the patient APK, resolved at request time instead of hand-edited
 * per release. GitHub's REST API needs no auth for a public repo's releases, so
 * this is a plain `fetch` rather than going through `apiFetch` — there is no
 * caregiver session token to attach and nothing here touches `apps/api`.
 *
 * Revalidated hourly rather than on every request: a new release landing a few
 * minutes late on the marketing page is not worth a GitHub call per visitor.
 */
const RELEASES_URL = "https://api.github.com/repos/ethicks-x/smaran/releases";

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  draft: boolean;
  prerelease: boolean;
  assets: GitHubReleaseAsset[];
}

/**
 * The download URL of the `.apk` asset on the newest published release, or
 * `null` if the API is unreachable or no release has shipped one yet. GitHub
 * returns releases newest-first, so the first draft/prerelease-free entry with
 * an APK asset is the one to link.
 */
export async function getLatestApkDownloadUrl(): Promise<string | null> {
  try {
    const response = await fetch(RELEASES_URL, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return null;
    }

    const releases = (await response.json()) as GitHubRelease[];

    for (const release of releases) {
      if (release.draft || release.prerelease) {
        continue;
      }

      const apkAsset = release.assets.find((asset) =>
        asset.name.endsWith(".apk"),
      );

      if (apkAsset) {
        return apkAsset.browser_download_url;
      }
    }

    return null;
  } catch {
    return null;
  }
}
