import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { Choice } from "@/components/ui/choice-group";
import { Text } from "@/components/ui/text";
import { useThemeColors } from "@/hooks/use-theme";
import { Radius, Spacing, scale, TouchTarget } from "@/theme";

const TRACK_HEIGHT = scale(10);
const TICK_SIZE = scale(12);
const THUMB_SIZE = scale(38);

export type StepSliderProps<T extends string> = {
  /** Names the whole set for screen readers, e.g. "Text size". */
  label: string;
  options: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Drawn at the small end of the track. */
  minLabel?: ReactNode;
  /** Drawn at the large end. */
  maxLabel?: ReactNode;
};

/**
 * A slider with stops — the shape used for text size on every phone, so the
 * page is recognised before it is read.
 *
 * It is a slider that never has to be dragged. Each stop is its own tap target,
 * a whole finger wide, because a drag is the one gesture a hand with a tremor
 * cannot reliably finish; the thumb slides to whichever stop was tapped. The
 * chosen stop is also named in words underneath, so the control is answerable
 * without seeing where the thumb landed.
 */
export function StepSlider<T extends string>({
  label,
  options,
  value,
  onChange,
  minLabel,
  maxLabel,
}: StepSliderProps<T>) {
  const colors = useThemeColors();

  const count = options.length;
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  // Percentages rather than measured pixels: the track runs between the centres
  // of the first and last stop, each of which is one stop wide.
  const inset = 50 / count;
  const fill = count > 1 ? (index / (count - 1)) * (100 - 2 * inset) : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {minLabel}

        <View
          style={styles.slider}
          accessibilityRole="radiogroup"
          accessibilityLabel={label}
        >
          <View
            style={[
              styles.track,
              {
                left: `${inset}%`,
                right: `${inset}%`,
                backgroundColor: colors.surfaceMuted,
              },
            ]}
          />
          <View
            style={[
              styles.track,
              {
                left: `${inset}%`,
                width: `${fill}%`,
                backgroundColor: colors.primary,
              },
            ]}
          />

          {options.map((option, position) => (
            <Stop
              key={option.value}
              option={option}
              selected={position === index}
              filled={position <= index}
              onPress={() => onChange(option.value)}
            />
          ))}
        </View>

        {maxLabel}
      </View>

      <Text variant="caption" center color="primary" style={styles.name}>
        {options[index]?.label ?? ""}
      </Text>
    </View>
  );
}

function Stop<T extends string>({
  option,
  selected,
  filled,
  onPress,
}: {
  option: Choice<T>;
  selected: boolean;
  filled: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={option.label}
      accessibilityHint={option.description}
      accessibilityState={{ checked: selected, selected }}
      style={({ pressed }) => [styles.stop, pressed && styles.pressed]}
    >
      {selected ? (
        <View
          style={[
            styles.thumb,
            { backgroundColor: colors.primary, borderColor: colors.surface },
          ]}
        />
      ) : (
        <View
          style={[
            styles.tick,
            {
              backgroundColor: filled ? colors.primary : colors.border,
            },
          ]}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  slider: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: TouchTarget.min,
  },
  track: {
    position: "absolute",
    height: TRACK_HEIGHT,
    borderRadius: Radius.pill,
  },
  stop: {
    flex: 1,
    height: TouchTarget.min,
    alignItems: "center",
    justifyContent: "center",
  },
  tick: {
    width: TICK_SIZE,
    height: TICK_SIZE * 1.5,
    borderRadius: Radius.pill,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: Radius.pill,
    borderWidth: scale(4),
  },
  name: {
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.6,
  },
});
