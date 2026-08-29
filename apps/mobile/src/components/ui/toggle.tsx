import { Switch } from "@expo/ui";
import { Pressable, StyleSheet, View } from "react-native";

import { NativeHost } from "@/components/ui/native-host";
import { Text } from "@/components/ui/text";
import { Spacing, TouchTarget } from "@/theme";

export type ToggleProps = {
  label: string;
  /** One short line saying what turning it on does. */
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

/**
 * A setting that is either on or off, with the platform's own switch on the
 * right of it.
 *
 * The whole row is the target, not just the switch — a switch is a small thing
 * to hit, and there is nothing else on the row to hit by mistake.
 */
export function Toggle({ label, description, value, onChange }: ToggleProps) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value }}
      style={[styles.row]}
    >
      <View style={styles.text}>
        <Text variant="bodyLarge">{label}</Text>
        {description ? (
          <Text variant="caption" color="textSecondary">
            {description}
          </Text>
        ) : null}
      </View>

      <NativeHost>
        <Switch value={value} onValueChange={onChange} />
      </NativeHost>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: TouchTarget.comfortable,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  text: {
    flex: 1,
    gap: Spacing.xs,
  },
});
