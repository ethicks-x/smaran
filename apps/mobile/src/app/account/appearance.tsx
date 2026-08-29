import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { ChoiceGroup, Screen, Section, Surface, Text } from "@/components/ui";
import { useAppearance, useAppearanceOptions } from "@/hooks/use-appearance";
import { useTheme } from "@/hooks/use-theme";
import { Spacing } from "@/theme";

/**
 * Appearance — how bright Smaran is, and how large it reads.
 *
 * Both choices take effect on the tap, with no "save" to find and no screen to
 * come back from: the sample below the lists is drawn with the very same tokens
 * as the rest of the app, so the answer to "what will this look like?" is
 * already on screen while the choice is being made.
 */
export default function AppearanceScreen() {
  const { themeMode, textSize, setThemeMode, setTextSize } = useAppearance();
  const { themeModes, textSizes } = useAppearanceOptions();
  const { scheme } = useTheme();
  const { t } = useTranslation();

  return (
    <Screen
      title={t("appearance.title")}
      subtitle={t("appearance.subtitle")}
      onBack={() => router.back()}
      withTabBar={false}
    >
      <Section
        title={t("appearance.brightness")}
        description={
          themeMode === "system"
            ? t("appearance.brightnessFollowing", {
                scheme: t(
                  scheme === "dark"
                    ? "appearance.schemeDark"
                    : "appearance.schemeLight",
                ),
              })
            : t("appearance.brightnessFixed")
        }
      >
        <ChoiceGroup
          label={t("appearance.brightness")}
          options={themeModes}
          value={themeMode}
          onChange={setThemeMode}
        />
      </Section>

      <Section
        title={t("appearance.textSize")}
        description={t("appearance.textSizeDescription")}
      >
        <ChoiceGroup
          label={t("appearance.textSize")}
          options={textSizes}
          value={textSize}
          onChange={setTextSize}
        />
      </Section>

      <Section
        title={t("appearance.sample")}
        description={t("appearance.sampleDescription")}
      >
        <Preview />
      </Section>
    </Screen>
  );
}

/**
 * A real reminder rather than a line of dummy text. Judging a text size is
 * easier against something you already know how to read.
 */
function Preview() {
  const { t } = useTranslation();

  return (
    <Surface>
      <View style={styles.preview}>
        <Text variant="caption" color="textSecondary">
          {t("appearance.sampleTime")}
        </Text>
        <Text variant="heading">{t("appearance.sampleTitle")}</Text>
        <Text variant="body" color="textSecondary">
          {t("appearance.sampleBody")}
        </Text>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  preview: {
    gap: Spacing.xs,
  },
});
