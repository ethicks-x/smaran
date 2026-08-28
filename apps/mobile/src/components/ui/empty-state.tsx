import { Icon } from "@expo/ui";
import { StyleSheet, View } from "react-native";

import { type AppIconName, AppIcons } from "@/components/ui/icons";
import { NativeHost } from "@/components/ui/native-host";
import { Surface } from "@/components/ui/surface";
import { Text } from "@/components/ui/text";
import { useThemeColors } from "@/hooks/use-theme";
import { Spacing } from "@/theme";

export type EmptyStateProps = {
  icon: AppIconName;
  title: string;
  /** Say what will appear here, in plain language. Avoid blaming the reader. */
  message: string;
};

/** Shown when a list has nothing in it yet, or a feature is not wired up. */
export function EmptyState({ icon, title, message }: EmptyStateProps) {
  const colors = useThemeColors();

  return (
    <Surface tone="muted" style={styles.container}>
      <View style={styles.icon}>
        <NativeHost>
          <Icon name={AppIcons[icon]} size={44} color={colors.textSecondary} />
        </NativeHost>
      </View>
      <Text variant="heading" center>
        {title}
      </Text>
      <Text variant="body" color="textSecondary" center>
        {message}
      </Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    gap: Spacing.lg,
  },
  icon: {
    alignItems: "center",
    justifyContent: "center",
  },
});
