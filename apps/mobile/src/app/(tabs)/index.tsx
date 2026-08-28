import { useUser } from "@clerk/expo";
import { Icon } from "@expo/ui";
import { router } from "expo-router";
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

  const firstName = user?.firstName?.trim();

  return (
    <Screen
      title={firstName ? `Hello, ${firstName}` : "Hello"}
      subtitle={formatToday()}
      headerAction={
        <Pressable
          onPress={() => router.push("/settings")}
          hitSlop={HitSlop}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={({ pressed }) => [
            styles.headerButton,
            { backgroundColor: colors.surfaceMuted },
            pressed && styles.pressed,
          ]}
        >
          <NativeHost>
            <Icon name={AppIcons.settings} size={26} color={colors.text} />
          </NativeHost>
        </Pressable>
      }
    >
      <Section title="Next up">
        {/* TODO: render the next reminder here — time, what to do, and a single
            large "Done" button. */}
        <Surface tone="primary">
          <Text variant="caption" color="textSecondary">
            Nothing scheduled yet
          </Text>
          <Text variant="bodyLarge">
            When your family adds a reminder, it will appear here first.
          </Text>
        </Surface>
      </Section>

      <Section
        title="Rest of the day"
        description="Everything else planned for today."
      >
        {/* TODO: list today's remaining reminders, oldest first. */}
        <EmptyState
          icon="reminder"
          title="No reminders today"
          message="Your day is clear. Anything your family adds will show up here."
        />
      </Section>

      <View style={styles.spacer} />
    </Screen>
  );
}

function formatToday() {
  return new Date().toLocaleDateString(undefined, {
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
