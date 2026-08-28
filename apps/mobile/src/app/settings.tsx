import { useAuth, useUser } from "@clerk/expo";
import { router } from "expo-router";

import { ActionButton, Screen, Section, Surface, Text } from "@/components/ui";

/**
 * Settings — presented as a modal from Today. Kept deliberately short: an
 * elder-facing app should not ask its reader to configure much.
 *
 * TODO: add text size and reminder sound preferences once the API stores them.
 */
export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Screen title="Settings" withTabBar={false}>
      <Section title="You">
        <Surface>
          <Text variant="caption" color="textSecondary">
            Signed in as
          </Text>
          <Text variant="bodyLarge">
            {user?.primaryEmailAddress?.emailAddress ??
              user?.fullName ??
              "Your account"}
          </Text>
        </Surface>
      </Section>

      <Section title="Account">
        <ActionButton
          label="Sign out"
          onPress={handleSignOut}
          variant="outlined"
        />
        <ActionButton
          label="Close"
          onPress={() => router.back()}
          variant="text"
        />
      </Section>
    </Screen>
  );
}
