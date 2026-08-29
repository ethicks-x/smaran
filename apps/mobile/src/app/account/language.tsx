import { router } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { Choice } from "@/components/ui";
import { ChoiceGroup, Screen, Section, Surface, Text } from "@/components/ui";
import { useLanguage } from "@/hooks/use-language";
import { type Language, Languages } from "@/i18n/languages";

/**
 * Language — the one Smaran speaks to the reader in.
 *
 * Each row leads with the language's own name in its own script, because that
 * is the word someone is scanning for; the English name follows underneath for
 * whoever is helping them set the phone up. The change lands on the tap, with
 * nothing to save and nothing to download — every catalogue is already in the
 * app, which is what lets this work in a house with no signal.
 */
export default function LanguageScreen() {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  const options = useMemo(
    () =>
      Languages.map<Choice<Language>>((entry) => ({
        value: entry.code,
        label: entry.endonym,
        description: t(`language.names.${entry.code}`),
      })),
    [t],
  );

  return (
    <Screen
      title={t("language.title")}
      subtitle={t("language.subtitle")}
      onBack={() => router.back()}
      withTabBar={false}
    >
      <Section
        title={t("language.choose")}
        description={t("language.chooseDescription")}
      >
        <ChoiceGroup
          label={t("language.groupLabel")}
          options={options}
          value={language}
          onChange={setLanguage}
        />
      </Section>

      <Section title={t("language.offline")}>
        <Surface tone="muted">
          <Text variant="body" color="textSecondary">
            {t("language.offlineBody")}
          </Text>
        </Surface>
      </Section>

      <Section title={t("language.more")}>
        <Surface tone="muted">
          <Text variant="body" color="textSecondary">
            {t("language.moreBody")}
          </Text>
        </Surface>
      </Section>
    </Screen>
  );
}
