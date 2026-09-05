import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { ActionButton, Dialog, ProgressBar, Text } from "@/components/ui";
import { UpdateDetails } from "@/components/update/update-details";
import { useLocale } from "@/hooks/use-language";
import {
  type UpdateFailure,
  type UpdateStage,
  useUpdate,
} from "@/hooks/use-update";
import { Spacing } from "@/theme";

/**
 * The one thing the app ever interrupts the reader to say about itself.
 *
 * A card over whatever they were doing, with either one button or two. A
 * required update gets one — there is nothing to decide, so offering a choice
 * that is not a choice would only be a chance to get it wrong. Everything else
 * gets "Update now" filled and "Not now" plain, in that order, so a reader
 * tapping without reading lands on the harmless answer rather than past it.
 *
 * Under all of it, in every state, is the short card of facts behind the
 * sentence — what is installed, what is being offered, how big it is. The
 * reader is not expected to read it; it is there so that whoever they ask about
 * this dialog has an answer.
 *
 * While it is working there are no buttons at all. A download of this size on a
 * village connection is minutes long, so the card says what is happening in one
 * sentence and shows a bar that moves — something to watch rather than something
 * to interpret. Nothing is timed and nothing is lost by walking away: the app
 * behind this card is untouched, and closing Smaran mid-download only means the
 * next launch starts the same download again.
 */
export function UpdateNotice() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { update, stage, isRequired, progress, failure, install, dismiss } =
    useUpdate();

  if (!update || stage === "idle") {
    return null;
  }

  const version = update.version;

  return (
    <Dialog
      visible
      icon="update"
      title={
        isRequired
          ? t("update.required.title")
          : t("update.offered.title", { version })
      }
      message={t(messageKey(stage, failure), { version })}
      details={
        <View style={styles.details}>
          {stage === "downloading" ? (
            <View style={styles.progress}>
              <ProgressBar
                value={progress}
                accessibilityLabel={t("update.progressLabel")}
              />
              <Text variant="body" color="textSecondary" center>
                {t("update.progress", {
                  percent: percent(progress, locale),
                })}
              </Text>
            </View>
          ) : null}

          {/* Under the bar rather than over it: while the download runs the
              thing to watch is the one that moves, and the numbers behind it
              are for whoever wants them. */}
          <UpdateDetails update={update} stage={stage} progress={progress} />
        </View>
      }
      // Android's back gesture lands here. A required update is the one place in
      // the app where it is allowed to do nothing — everywhere else that would
      // be a trap, and here the trap is the point.
      onRequestClose={isRequired ? noop : dismiss}
    >
      {stage === "offered" ? (
        <>
          <ActionButton
            label={t("update.offered.action")}
            onPress={install}
            variant="filled"
          />
          <ActionButton
            label={t("update.offered.later")}
            onPress={dismiss}
            variant="text"
          />
        </>
      ) : null}

      {stage === "failed" ? (
        <>
          <ActionButton
            label={t("update.failed.retry")}
            onPress={install}
            variant="outlined"
          />
          <ActionButton
            label={t("update.failed.later")}
            onPress={dismiss}
            variant="text"
          />
        </>
      ) : null}
    </Dialog>
  );
}

/**
 * Which sentence goes under the title.
 *
 * Returns the key rather than the translation, so that every one of them is a
 * literal the catalogue's type is checked against. Built any other way — a stem
 * plus the stage — a key this card could not find would be a blank space where
 * the only explanation of what is happening should be.
 */
function messageKey(stage: UpdateStage, failure: UpdateFailure | null) {
  switch (stage) {
    case "offered":
      return "update.offered.message" as const;
    case "downloading":
      return "update.downloading" as const;
    case "verifying":
      return "update.verifying" as const;
    case "installing":
      return "update.installing" as const;
    case "failed":
      return FAILURE_MESSAGES[failure ?? "unavailable"];
    default:
      return "update.verifying" as const;
  }
}

/** Why it stopped, in the reader's terms. Never a code, never a blame. */
const FAILURE_MESSAGES = {
  unavailable: "update.failed.unavailable",
  corrupt: "update.failed.corrupt",
  refused: "update.failed.refused",
} as const satisfies Record<UpdateFailure, string>;

/**
 * The bar's number, in the reader's own digits. A phone set to Assamese shows
 * Assamese numerals here for the same reason every other number in the app
 * does — the device's locale is never what decides (D-12).
 */
const percent = (fraction: number, locale: string) =>
  new Intl.NumberFormat(locale, { style: "percent" }).format(
    Math.min(1, Math.max(0, fraction)),
  );

const noop = () => {};

const styles = StyleSheet.create({
  details: {
    alignSelf: "stretch",
    gap: Spacing.lg,
    paddingTop: Spacing.md,
  },
  progress: {
    alignSelf: "stretch",
    gap: Spacing.sm,
  },
});
