import { Icon } from "@expo/ui";
import { startTransition, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppIcons } from "@/components/ui/icons";
import { NativeHost } from "@/components/ui/native-host";
import { Surface } from "@/components/ui/surface";
import { Text } from "@/components/ui/text";
import { useThemeColors } from "@/hooks/use-theme";
import { Spacing, scale, TouchTarget } from "@/theme";

const CHECK_SIZE = scale(32);

export type Choice<T extends string> = {
  value: T;
  label: string;
  /** One short line saying what picking this does. Never essential alone. */
  description?: string;
};

export type ChoiceGroupProps<T extends string> = {
  /** Names the whole set for screen readers, e.g. "Brightness". */
  label: string;
  options: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * A short list of mutually exclusive options, one per full-width row.
 *
 * Every option is spelled out and visible at once — no segmented control, no
 * slider, nothing that has to be dragged. The chosen row says so three times
 * over: a tick, a tinted fill, and a heavier label, so the answer survives both
 * a colour-blind reader and a glance in bright sun.
 */
export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: ChoiceGroupProps<T>) {
  const colors = useThemeColors();

  // A choice that repaints the whole app — the theme — takes a moment to land
  // everywhere. The tick is not allowed to wait for it: the tapped row is
  // marked from local state on the very next frame, and the change itself goes
  // out as a transition, so the expensive repaint happens around it rather than
  // in front of it.
  const [pending, setPending] = useState<T | null>(null);
  const selected = pending ?? value;

  useEffect(() => {
    if (pending !== null && pending === value) {
      setPending(null);
    }
  }, [pending, value]);

  const select = (next: T) => {
    if (next === selected) {
      return;
    }

    setPending(next);
    startTransition(() => onChange(next));
  };

  return (
    <Surface
      padded={false}
      style={styles.card}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      {options.map((option, index) => {
        const isSelected = option.value === selected;

        return (
          <View key={option.value}>
            {index > 0 ? (
              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />
            ) : null}

            <Pressable
              onPress={() => select(option.value)}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityHint={option.description}
              accessibilityState={{ checked: isSelected, selected: isSelected }}
              style={({ pressed }) => [
                styles.row,
                isSelected && { backgroundColor: colors.primaryMuted },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.rowText}>
                <Text
                  variant="bodyLarge"
                  color={isSelected ? "primary" : "text"}
                  style={isSelected && styles.selectedLabel}
                >
                  {option.label}
                </Text>
                {option.description ? (
                  <Text variant="caption" color="textSecondary">
                    {option.description}
                  </Text>
                ) : null}
              </View>

              {isSelected ? (
                <NativeHost>
                  <Icon
                    name={AppIcons.check}
                    size={CHECK_SIZE}
                    color={colors.primary}
                  />
                </NativeHost>
              ) : (
                // Holds the tick's place so labels never shift as the choice
                // moves down the list.
                <View style={styles.checkPlaceholder} />
              )}
            </Pressable>
          </View>
        );
      })}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth * 2,
    marginLeft: Spacing.lg,
  },
  row: {
    minHeight: TouchTarget.comfortable,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  rowText: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  selectedLabel: {
    fontWeight: "700",
  },
  checkPlaceholder: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
  },
  pressed: {
    opacity: 0.9,
  },
});
