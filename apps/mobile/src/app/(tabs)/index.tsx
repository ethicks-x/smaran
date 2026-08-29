import { useUser } from "@clerk/expo";
import { Icon } from "@expo/ui";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";

import {
  AppIcons,
  EmptyState,
  NativeHost,
  Screen,
  Section,
  Surface,
  Text,
} from "@/components/ui";
import { useLocale } from "@/hooks/use-language";
import { useThemeColors } from "@/hooks/use-theme";
import { HitSlop, Spacing, TouchTarget } from "@/theme";

/**
 * Today — the home screen and the answer to "what am I meant to be doing?".
 *
 * TODO: replace the placeholders with the day's plan from `GET /dashboard`.
 */
export default function TodayScreen() {
  const { user } = useUser();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const locale = useLocale();

  const firstName = user?.firstName?.trim();

  return (
    <Screen
      title={greeting(t, firstName)}
      subtitle={formatToday(locale)}
      // headerAction={
      //   <Pressable
      //     onPress={() => router.push("/settings")}
      //     hitSlop={HitSlop}
      //     accessibilityRole="button"
      //     accessibilityLabel="Settings"
      //     style={({ pressed }) => [
      //       styles.headerButton,
      //       { backgroundColor: colors.surfaceMuted },
      //       pressed && styles.pressed,
      //     ]}
      //   >
      //     <NativeHost>
      //       <Icon name={AppIcons.settings} size={26} color={colors.text} />
      //     </NativeHost>
      //   </Pressable>
      // }
    >
      <Section title={t("today.nextUp")}>
        {/* TODO: render the next reminder here — time, what to do, and a single
            large "Done" button. */}
        <Surface tone="primary">
          <Text variant="caption" color="textSecondary">
            {t("today.nothingScheduled")}
          </Text>
          <Text variant="bodyLarge">{t("today.nextUpPlaceholder")}</Text>
        </Surface>
      </Section>

      <Section
        title={t("today.restOfDay")}
        description={t("today.restOfDayDescription")}
      >
        {/* TODO: list today's remaining reminders, oldest first. */}
        <EmptyState
          icon="reminder"
          title={t("today.emptyTitle")}
          message={t("today.emptyMessage")}
        />
      </Section>

      <View style={styles.spacer} />
    </Screen>
  );
}

/**
 * "Good morning, Meera" as one string per language rather than a greeting with
 * a name stuck on the end. Where the name sits in the sentence — and whether it
 * takes a suffix — is the translator's decision, not the layout's.
 */
function greeting(
  t: ReturnType<typeof useTranslation>["t"],
  name: string | undefined,
) {
  const hour = new Date().getHours(); // Returns 0 - 23
  const partOfDay = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";

  return name
    ? t(`greeting.named${partOfDay}`, { name })
    : t(`greeting.${partOfDay.toLowerCase() as Lowercase<typeof partOfDay>}`);
}

/**
 * The date in the language on screen, not the one the phone is set to. An
 * Indic locale also brings its own digits with it, which is the point: a date
 * half in one script and half in another is harder to read than either.
 */
function formatToday(locale: string) {
  return new Date().toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const styles = StyleSheet.create({
  headerButton: {
    width: TouchTarget.min,
    height: TouchTarget.min,
    borderRadius: TouchTarget.min / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
  spacer: {
    height: Spacing.lg,
  },
});
