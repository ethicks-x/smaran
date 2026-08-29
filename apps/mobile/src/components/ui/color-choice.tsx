import { Icon } from "@expo/ui";
import { startTransition, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { Choice } from "@/components/ui/choice-group";
import { AppIcons } from "@/components/ui/icons";
import { NativeHost } from "@/components/ui/native-host";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColors } from "@/hooks/use-theme";
import {
  type HighlightColor,
  Highlights,
  Radius,
  Spacing,
  scale,
  TouchTarget,
} from "@/theme";

const SWATCH_SIZE = scale(58);
const CHECK_SIZE = scale(30);
const RING_GAP = scale(5);

export type ColorChoiceProps = {
  /** Names the whole set for screen readers, e.g. "Highlight colour". */
  label: string;
  options: readonly Choice<HighlightColor>[];
  value: HighlightColor;
  onChange: (value: HighlightColor) => void;
};

/**
 * The highlight colours, as a row of filled circles with the chosen one ringed
 * and ticked, and its name spelled out underneath.
 *
 * The name and the tick are what carry the choice — a row of circles is
 * unreadable to a reader who cannot separate the hues, and every one of these
 * is a legitimate answer, so nothing may depend on telling teal from blue.
 */
export function ColorChoice({
  label,
  options,
  value,
  onChange,
}: ColorChoiceProps) {
  // Picking a colour repaints the whole app. The ring is not allowed to wait
  // for it: the tapped swatch is marked from local state on the next frame and
  // the repaint itself goes out as a transition.
  const [pending, setPending] = useState<HighlightColor | null>(null);
  const selected = pending ?? value;

  useEffect(() => {
    if (pending !== null && pending === value) {
      setPending(null);
    }
  }, [pending, value]);

  const select = (next: HighlightColor) => {
    if (next === selected) {
      return;
    }

    setPending(next);
    startTransition(() => onChange(next));
  };

  const name = options.find((option) => option.value === selected)?.label ?? "";

  return (
    <View style={styles.wrap}>
      <View
        style={styles.row}
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
      >
        {options.map((option) => (
          <Swatch
            key={option.value}
            option={option}
            selected={option.value === selected}
            onPress={() => select(option.value)}
          />
        ))}
      </View>

      <Text variant="caption" center color="primary" style={styles.name}>
        {name}
      </Text>
    </View>
  );
}

function Swatch({
  option,
  selected,
  onPress,
}: {
  option: Choice<HighlightColor>;
  selected: boolean;
  onPress: () => void;
}) {
  const scheme = useColorScheme();
  const colors = useThemeColors();
  const swatch = Highlights[option.value][scheme];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={option.label}
      accessibilityState={{ checked: selected, selected }}
      style={({ pressed }) => [styles.target, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.ring,
          {
            // The ring is the reader's own text colour rather than the swatch's
            // own, so which one is chosen reads the same on every hue.
            borderColor: selected ? colors.text : "transparent",
          },
        ]}
      >
        <View style={[styles.swatch, { backgroundColor: swatch.primary }]}>
          {selected ? (
            <NativeHost>
              <Icon
                name={AppIcons.check}
                size={CHECK_SIZE}
                color={swatch.onPrimary}
              />
            </NativeHost>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: Spacing.sm,
    justifyContent: "space-between",
  },
  target: {
    minHeight: TouchTarget.comfortable,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    padding: RING_GAP,
    borderRadius: Radius.pill,
    borderWidth: scale(4),
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.6,
  },
});
