import { router } from "expo-router";

import { ActionButton, Screen, Text } from "@/components/ui";

export default function NotFoundScreen() {
  return (
    <Screen title="Page not found" withTabBar={false}>
      <Text variant="bodyLarge" color="textSecondary">
        That page does not exist. Let's get you back to your day.
      </Text>
      <ActionButton
        label="Go to Today"
        onPress={() => router.replace("/")}
        size="large"
      />
    </Screen>
  );
}
