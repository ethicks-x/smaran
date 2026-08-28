import { router } from "expo-router";

import { Screen, Section, Surface, Text } from "@/components/ui";

/**
 * Notifications — how loudly and how often Smaran interrupts.
 *
 * TODO: replace the placeholders with real controls once the API stores
 * reminder sound, repeat count and quiet hours.
 */
export default function NotificationsScreen() {
  return (
    <Screen
      title="Notifications"
      subtitle="How Smaran reminds you."
      onBack={() => router.back()}
      withTabBar={false}
    >
      <Section
        title="Reminder sound"
        description="Played when a reminder is due."
      >
        <Surface tone="muted">
          <Text variant="body" color="textSecondary">
            Reminders use your phone's default sound for now. A choice of sounds
            is coming.
          </Text>
        </Surface>
      </Section>

      <Section
        title="Repeat"
        description="What happens when a reminder goes unanswered."
      >
        <Surface tone="muted">
          <Text variant="body" color="textSecondary">
            A reminder asks twice more, ten minutes apart, and then lets your
            family know it was missed.
          </Text>
        </Surface>
      </Section>

      <Section title="Quiet hours" description="When Smaran stays silent.">
        <Surface tone="muted">
          <Text variant="body" color="textSecondary">
            Nothing sounds between 10pm and 7am, except a call for help.
          </Text>
        </Surface>
      </Section>
    </Screen>
  );
}
