import { useUser } from "@clerk/expo";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  ActionButton,
  Detail,
  Screen,
  Section,
  Surface,
  Text,
} from "@/components/ui";

/**
 * Account — the details Smaran holds about the reader.
 *
 * Read-only for now: changing a name or a photo is a caregiver job, and asking
 * an unsteady hand to edit a text field is a poor trade for it.
 *
 * TODO: allow editing name and photo once `PATCH /users/me` exists.
 */
export default function ProfileScreen() {
  const { user } = useUser();
  const { t } = useTranslation();

  const name = user?.fullName?.trim() || user?.firstName?.trim();
  const email = user?.primaryEmailAddress?.emailAddress;
  const phone = user?.primaryPhoneNumber?.phoneNumber;
  const unset = t("common.notSetYet");

  return (
    <Screen
      title={t("profile.title")}
      subtitle={t("profile.subtitle")}
      onBack={() => router.back()}
      withTabBar={false}
    >
      <Section title={t("profile.details")}>
        <Surface>
          <Detail label={t("profile.name")} value={name ?? unset} />
          <Detail label={t("profile.email")} value={email ?? unset} />
          <Detail label={t("profile.phone")} value={phone ?? unset} />
        </Surface>
      </Section>

      <Section
        title={t("profile.photo")}
        description={t("profile.photoDescription")}
      >
        <Surface tone="muted">
          <Text variant="body" color="textSecondary">
            {t("profile.photoBody")}
          </Text>
        </Surface>
      </Section>

      <Section
        title={t("profile.wrong")}
        description={t("profile.wrongDescription")}
      >
        <ActionButton
          label={t("profile.askForHelp")}
          onPress={() => router.push("/help")}
          variant="outlined"
        />
      </Section>
    </Screen>
  );
}
