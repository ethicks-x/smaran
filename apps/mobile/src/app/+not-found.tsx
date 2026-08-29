import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { ActionButton, Screen, Text } from "@/components/ui";

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t("notFound.title")} withTabBar={false}>
      <Text variant="bodyLarge" color="textSecondary">
        {t("notFound.body")}
      </Text>
      <ActionButton
        label={t("notFound.action")}
        onPress={() => router.replace("/")}
        size="large"
      />
    </Screen>
  );
}
