import { Icon } from "@expo/ui";
import { Linking, StyleSheet, View } from "react-native";

import {
  ActionButton,
  AppIcons,
  NativeHost,
  Screen,
  Section,
  Surface,
  Text,
} from "@/components/ui";
import { useThemeColors } from "@/hooks/use-theme";
import { Spacing } from "@/theme";

/**
 * Help — one unmistakable way to reach a person.
 *
 * The primary action is deliberately the only filled button on the screen and
 * sits above the fold, so it can be found without reading anything else.
 *
 * TODO: call the primary contact returned by the API instead of the
 * placeholder, and notify the caregiver dashboard that help was requested.
 */
export default function HelpScreen() {
  const colors = useThemeColors();

  const primaryContact = usePrimaryContact();

  const callPrimaryContact = () => {
    if (primaryContact) {
      Linking.openURL(`tel:${primaryContact.phone}`);
    }
  };

  return (
    <Screen
      title="Help"
      subtitle="Reach someone straight away, any time of day."
    >
      <Section title="Call for help">
        <ActionButton
          label={
            primaryContact ? `Call ${primaryContact.name}` : "Call for help"
          }
          onPress={callPrimaryContact}
          tone="danger"
          size="large"
          disabled={!primaryContact}
          accessibilityLabel="Call your emergency contact now"
        />
        <Surface tone="danger">
          <View style={styles.row}>
            <NativeHost>
              <Icon name={AppIcons.emergency} size={30} color={colors.danger} />
            </NativeHost>
            <Text variant="body" style={styles.rowText}>
              {primaryContact
                ? "This calls your emergency contact and lets your family know."
                : "No emergency contact set yet. Your family can add one from the caregiver dashboard."}
            </Text>
          </View>
        </Surface>
      </Section>

      <Section
        title="Other contacts"
        description="People who can help when your first contact is busy."
      >
        {/* TODO: list backup contacts, each row a full-width call button. */}
        <Surface tone="muted">
          <Text variant="body" color="textSecondary">
            Backup contacts will be listed here.
          </Text>
        </Surface>
      </Section>
    </Screen>
  );
}

type Contact = { name: string; phone: string };

/** TODO: replace with the primary contact from `GET /users/me/contacts`. */
function usePrimaryContact(): Contact | null {
  return null;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  rowText: {
    flex: 1,
  },
});
