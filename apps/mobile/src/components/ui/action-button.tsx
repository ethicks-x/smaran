import { Button } from "@expo/ui";
import { tint } from "@expo/ui/swift-ui/modifiers";
import { StyleSheet } from "react-native";

import type { ActionButtonProps } from "@/components/ui/action-button-props";
import { NativeHost } from "@/components/ui/native-host";
import { useThemeColors } from "@/hooks/use-theme";
import { Radius, TouchTarget } from "@/theme";

export type { ActionButtonProps };

/**
 * A native platform button (SwiftUI / Jetpack Compose) sized for unsteady
 * hands: full width, never below 64pt tall, with a plain-language label.
 *
 * **The tone is a `tint`, not a background.** A `borderedProminent` button
 * paints its own capsule, so a `backgroundColor` in the style lands *behind*
 * that capsule and shows as a rim of the wrong colour around it — which is
 * exactly what a filled danger button used to look like. `tint` is the colour
 * SwiftUI actually fills the button with, and it is the same modifier for the
 * other two variants, where it colours the label instead.
 *
 * Android replaces this file with `action-button.android.tsx`, where the same
 * problem has a different answer (D-50).
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
        modifiers={[tint(tone === "danger" ? colors.danger : colors.primary)]}
        style={{ height, borderRadius: Radius.md }}
      />
    </NativeHost>
  );
}

const styles = StyleSheet.create({
  host: {
    width: "100%",
  },
});
