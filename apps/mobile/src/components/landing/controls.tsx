import { Icon } from "@expo/ui";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { OnArt } from "@/components/landing/on-art";
import { type AppIconName, AppIcons, NativeHost, Text } from "@/components/ui";
import { Radius, Spacing, scale, TouchTarget } from "@/theme";

const ICON = scale(28);

export type RoundButtonProps = {
  icon: AppIconName;
  onPress: () => void;
  accessibilityLabel: string;
  /** Kept in the layout when it has nothing to do, so the row never reflows. */
  disabled?: boolean;
};

/**
 * A circular glass control for the secondary move — going back a page. Sits on
 * the art rather than a surface, so it is a translucent fill with a hairline
 * rather than one of the theme's tints.
 */
export function RoundButton({
  icon,
  onPress,
  accessibilityLabel,
  disabled,
}: RoundButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.round,
        { backgroundColor: OnArt.fill, borderColor: OnArt.border },
        disabled && styles.faded,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <NativeHost>
        <Icon name={AppIcons[icon]} size={ICON} color={OnArt.text} />
      </NativeHost>
    </Pressable>
  );
}

export type PillButtonProps = {
  label: string;
  onPress: () => void;
  /** Trailing icon. Always a direction: this button only ever goes forward. */
  icon?: AppIconName;
  /** Swaps the label for a spinner while keeping the button's exact footprint. */
  busy?: boolean;
  accessibilityLabel?: string;
};

/**
 * The one solid control on the landing screen: white on dark art, full height,
 * and wide enough to be hit without looking. Everything else here is glass so
 * that this is unmistakably the thing to press.
 */
export function PillButton({
  label,
  onPress,
  icon,
  busy,
  accessibilityLabel,
}: PillButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ busy: Boolean(busy) }}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: OnArt.solid },
        pressed && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={OnArt.onSolid} />
      ) : (
        <>
          <Text variant="label" style={styles.pillLabel}>
            {label}
          </Text>
          {icon ? (
            <View style={styles.pillIcon}>
              <NativeHost>
                <Icon
                  name={AppIcons[icon]}
                  size={scale(24)}
                  color={OnArt.onSolid}
                />
              </NativeHost>
            </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  round: {
    width: TouchTarget.min,
    height: TouchTarget.min,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    flex: 1,
    height: TouchTarget.large,
    borderRadius: Radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  pillLabel: {
    color: OnArt.onSolid,
  },
  pillIcon: {
    // Optical centring: the chevron's ink sits left of its own box.
    marginTop: 1,
  },
  faded: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.7,
  },
});
