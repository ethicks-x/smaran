import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ActionButton, SettingsRow, Text } from "@/components/ui";
import { type UpdateCheckOutcome, useUpdate } from "@/hooks/use-update";

/**
 * A row on Settings that asks GitHub now.
 *
 * The app checks by itself on every launch and every return to the foreground,
 * so this row exists for the moment somebody is on the telephone saying "there
 * is a new version, can you get it?" — a caregiver, a son, a health worker.
 * Without it the only way to make the app look is to close it and open it
 * again, which is exactly the kind of instruction that does not survive being
 * relayed to a reader with dementia.
 *
 * It always answers. A check that found nothing is as much a result as one that
 * found something — an unanswered button is the thing that gets pressed four
 * more times — and every one of those answers is a plain sentence about this
 * phone, never a code and never a blame (§2.3). Where there is something to
 * get, the update card opens over this screen on its own and takes it from
 * there; this row's part is over.
 *
 * No spinner: the button goes quiet and a sentence says it is asking, which is
 * the shape the refresh row beside it already uses.
 */
export function UpdateRow() {
  const { t } = useTranslation();
  const { check } = useUpdate();

  const [state, setState] = useState<"idle" | "asking" | UpdateCheckOutcome>(
    "idle",
  );

  const run = async () => {
    setState("asking");

    // `check` never rejects — every outcome it has is a returned value — so
    // there is nothing here to catch.
    setState(await check());
  };

  return (
    <SettingsRow
      icon="update"
      tint="accent"
      label={t("account.rows.update.label")}
      description={t("account.rows.update.description")}
    >
      <Text variant="body" color="textSecondary">
        {t("account.rows.update.body")}
      </Text>

      {state === "idle" ? null : (
        <Text variant="body" color="textSecondary">
          {t(UPDATE_MESSAGES[state])}
        </Text>
      )}

      <ActionButton
        label={t("account.rows.update.action")}
        onPress={() => void run()}
        variant="outlined"
        disabled={state === "asking"}
      />
    </SettingsRow>
  );
}

/**
 * What the row says about the check that just ran.
 *
 * Spelled out rather than built from the outcome, so every message is a literal
 * key the catalogue's type is checked against — one this row could not find
 * would be a blank line where the answer should be.
 */
const UPDATE_MESSAGES = {
  asking: "account.rows.update.asking",
  current: "account.rows.update.current",
  available: "account.rows.update.available",
  unavailable: "account.rows.update.unavailable",
  unsupported: "account.rows.update.unsupported",
  busy: "account.rows.update.busy",
} as const satisfies Record<"asking" | UpdateCheckOutcome, string>;
