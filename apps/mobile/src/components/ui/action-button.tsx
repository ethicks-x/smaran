import { Button } from "@expo/ui";
import { StyleSheet } from "react-native";

import { NativeHost } from "@/components/ui/native-host";
import { useThemeColors } from "@/hooks/use-theme";
import { Radius, TouchTarget } from "@/theme";

export type ActionButtonProps = {
  label: string;
  onPress: () => void;
  /** Visual weight. One `filled` button per screen keeps the choice obvious. */
  variant?: "filled" | "outlined" | "text";
  /** `danger` is reserved for calling for help. */
  tone?: "primary" | "danger";
  /** `large` is for the single most important action on a screen. */
  size?: "comfortable" | "large";
  disabled?: boolean;
  accessibilityLabel?: string;
};

/**
 * A native platform button (SwiftUI / Jetpack Compose) sized for unsteady
 * hands: full width, never below 64pt tall, with a plain-language label.
 */
export function ActionButton({
  label,
  onPress,
  variant = "filled",
  tone = "primary",
  size = "comfortable",
  disabled,
  accessibilityLabel,
}: ActionButtonProps) {
  const colors = useThemeColors();
  const height = TouchTarget[size];

  return (
    <NativeHost
      matchContents={{ vertical: true }}
      style={[styles.host, { height }]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Button
        label={label}
        onPress={onPress}
        variant={variant}
        disabled={disabled}
        style={{
          height,
          borderRadius: Radius.md,
          ...(tone === "danger" && variant === "filled"
            ? { backgroundColor: colors.danger }
            : null),
        }}
      />
    </NativeHost>
  );
}

const styles = StyleSheet.create({
  host: {
    width: "100%",
  },
});
