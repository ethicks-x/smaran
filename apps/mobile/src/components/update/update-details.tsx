import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { Surface, Text } from "@/components/ui";
import { useLocale } from "@/hooks/use-language";
import type { UpdateStage } from "@/hooks/use-update";
import type { AvailableUpdate } from "@/lib/updates";
import { parseVersion } from "@/lib/version";
import { Spacing } from "@/theme";

export type UpdateDetailsProps = {
  update: AvailableUpdate;
  stage: UpdateStage;
  /** How far the download has come, 0–1. Only read while downloading. */
  progress: number;
};

/**
 * The three facts behind the sentence above it: what is on the phone, what is
 * being offered, and how much has to come down the line to get there.
 *
 * The card is not there for the reader with dementia — the message above it
 * already says everything they have to act on, and a version number is not a
 * thing to reason about (§2.3). It is there for whoever set the phone up: a son
 * on the telephone from Guwahati, a caregiver reading over a shoulder, asked
 * "should I say yes to this?". Without it the only answer available is to trust
 * the dialog, and a card that names its own numbers is easier to trust than one
 * that does not.
 *
 * So it stays quiet. Labels sit in the secondary colour, the numbers are plain,
 * nothing here is a button, and it never becomes the thing the eye lands on
 * first. It reads left to right the way `GameSummary` does, because that is the
 * shape this app already uses for a short list of facts.
 *
 * While the download runs, the size row turns into how much of it has arrived,
 * which is the same fact made useful — a bar says "some", "45 MB of 120 MB"
 * says whether it is worth waiting for. Checking the bytes afterwards counts
 * the same file the same way, and says so.
 */
export function UpdateDetails({ update, stage, progress }: UpdateDetailsProps) {
  const { t } = useTranslation();
  const locale = useLocale();

  const size = (bytes: number) =>
    t("update.details.megabytes", { size: megabytes(bytes, locale) });

  // Both long stages measure themselves the same way — a fraction of the same
  // file — so they share a row and differ only in the word for what is being
  // counted. Installing is a handover rather than a piece of work, and falls
  // back to the plain size.
  const counting = stage === "downloading" || stage === "verifying";

  // A build that does not name its own version is a real case rather than a
  // defensive one — `checkForUpdate` refuses to compare anything at all when it
  // meets one, and the preview reaches this card without going through that
  // check. "Not known" is a truthful answer; a number guessed here would be the
  // one on the card that was invented.
  const installed = Constants.expoConfig?.version;

  return (
    <Surface tone="muted" bordered={false} style={styles.card}>
      <Row
        label={t("update.details.installed")}
        value={
          installed
            ? displayVersion(installed)
            : t("update.details.unknownVersion")
        }
      />
      <Row
        label={t("update.details.latest")}
        value={displayVersion(update.version)}
      />
      <Row
        label={t(COUNTED[counting ? stage : "size"])}
        value={
          counting
            ? t("update.details.downloadedValue", {
                done: size(arrived(update.bytes, progress)),
                total: size(update.bytes),
              })
            : size(update.bytes)
        }
      />
    </Surface>
  );
}

/**
 * What the third row is called, per stage.
 *
 * Spelled out rather than built from the stage, so each one is a literal the
 * catalogue's type is checked against — a key this row could not find would be
 * a blank label beside a number with nothing to say what it counts.
 */
const COUNTED = {
  downloading: "update.details.downloaded",
  verifying: "update.details.checked",
  size: "update.details.size",
} as const;

/** A label and its value, on one line, reading left to right. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    // One row is one sentence to a screen reader: read apart, "Download size"
    // and "120 MB" arrive as two unrelated fragments.
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text variant="body" color="textSecondary" style={styles.label}>
        {label}
      </Text>
      <Text variant="bodyLarge">{value}</Text>
    </View>
  );
}

/**
 * A tag as a version to read.
 *
 * Releases are tagged either `1.2.0` or `v1.2.0` and the app's own version
 * never carries the `v`, so the two rows would otherwise disagree about a
 * character that means nothing. Anything that is not a version is handed back
 * untouched rather than blanked — whatever it is, it is what this phone says
 * about itself.
 */
function displayVersion(tag: string): string {
  const version = parseVersion(tag);

  return version ? `${version.major}.${version.minor}.${version.patch}` : tag;
}

/** How many bytes have landed. Clamped, because a bar that overshoots lies. */
const arrived = (bytes: number, progress: number) =>
  bytes * Math.min(1, Math.max(0, progress));

/**
 * Bytes as megabytes, in the reader's own digits.
 *
 * Megabytes and nothing else: an APK is never small enough for kilobytes to be
 * meaningful nor large enough for gigabytes to say anything, and one unit
 * across all three rows means the numbers can be compared by eye. One decimal
 * under a hundred so the download visibly moves; none above it, where a tenth
 * of a megabyte is noise.
 */
function megabytes(bytes: number, locale: string): string {
  const value = bytes / (1024 * 1024);

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: value < 100 ? 1 : 0,
  }).format(value);
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    gap: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  // The label gives way first: a version or a size is short and must never be
  // the thing that wraps.
  label: {
    flexShrink: 1,
  },
});
