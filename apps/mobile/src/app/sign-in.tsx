import { useHostedAuth } from "@clerk/expo/hosted-auth";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { ActionButton, Screen, Text } from "@/components/ui";
import { useThemeColors } from "@/hooks/use-theme";
import { Spacing } from "@/theme";

/**
 * Sign in — one screen, one button. Clerk's hosted Account Portal handles the
 * credentials, so there is no form to fill in on the device.
 */
export default function SignInScreen() {
  const { startHostedAuth } = useHostedAuth();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colors = useThemeColors();

  const signIn = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await startHostedAuth({ mode: "sign-in" });
    } catch {
      setError("We could not sign you in. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Screen
      title="Smaran"
      subtitle="Your day, your people, and your memories — all in one place."
      withTabBar={false}
      scrollable={false}
    >
      <View style={styles.body}>
        {isBusy ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <>
            {error ? (
              <Text variant="body" color="danger" center>
                {error}
              </Text>
            ) : null}
            <ActionButton label="Sign in" onPress={signIn} size="large" />
            <Text variant="caption" color="textSecondary" center>
              Your family can help you sign in the first time.
            </Text>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xl,
  },
});
