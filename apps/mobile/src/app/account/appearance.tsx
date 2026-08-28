import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { ChoiceGroup, Screen, Section, Surface, Text } from "@/components/ui";
import { useAppearance } from "@/hooks/use-appearance";
import { useTheme } from "@/hooks/use-theme";
import { Spacing, TextSizeOptions, ThemeModeOptions } from "@/theme";

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
  const { scheme } = useTheme();

  return (
    <Screen
      title="Appearance"
      subtitle="How Smaran looks to you."
      onBack={() => router.back()}
      withTabBar={false}
    >
      <Section
        title="Brightness"
        description={
          themeMode === "system"
            ? `Following your phone, which is ${scheme} right now.`
            : "Set here, whatever your phone is doing."
        }
      >
        <ChoiceGroup
          label="Brightness"
          options={ThemeModeOptions}
          value={themeMode}
          onChange={setThemeMode}
        />
      </Section>

      <Section
        title="Text size"
        description="Your phone's own text setting still applies on top of this."
      >
        <ChoiceGroup
          label="Text size"
          options={TextSizeOptions}
          value={textSize}
          onChange={setTextSize}
        />
      </Section>

      <Section title="Sample" description="A reminder, at your settings.">
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
  return (
    <Surface>
      <View style={styles.preview}>
        <Text variant="caption" color="textSecondary">
          9:00 in the morning
        </Text>
        <Text variant="heading">Blood pressure tablet</Text>
        <Text variant="body" color="textSecondary">
          One tablet with breakfast. Meera will be told once you have marked it
          done.
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
