import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { Screen, Section, Surface, Text } from "@/components/ui";

/**
 * Notifications — how loudly and how often Smaran interrupts.
 *
 * TODO: replace the placeholders with real controls once the API stores
 * reminder sound, repeat count and quiet hours.
 */
export default function NotificationsScreen() {
  const { t } = useTranslation();

  return (
    <Screen
      title={t("notifications.title")}
      subtitle={t("notifications.subtitle")}
      onBack={() => router.back()}
      withTabBar={false}
    >
      <Section
        title={t("notifications.sound")}
        description={t("notifications.soundDescription")}
      >
        <Surface tone="muted">
          <Text variant="body" color="textSecondary">
            {t("notifications.soundBody")}
          </Text>
        </Surface>
      </Section>

      <Section
        title={t("notifications.repeat")}
        description={t("notifications.repeatDescription")}
      >
        <Surface tone="muted">
          <Text variant="body" color="textSecondary">
            {t("notifications.repeatBody")}
          </Text>
        </Surface>
      </Section>

      <Section
        title={t("notifications.quiet")}
        description={t("notifications.quietDescription")}
      >
        <Surface tone="muted">
          <Text variant="body" color="textSecondary">
            {t("notifications.quietBody")}
          </Text>
        </Surface>
      </Section>
    </Screen>
  );
}
