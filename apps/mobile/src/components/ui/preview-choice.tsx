import type { ReactNode } from "react";
import { startTransition, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { Choice } from "@/components/ui/choice-group";
import { Text } from "@/components/ui/text";
import { useThemeColors } from "@/hooks/use-theme";
import { Radius, Spacing, scale } from "@/theme";

export type PreviewOption<T extends string> = Choice<T> & {
  /** A small drawing of what picking this does. Never the only cue. */
  preview: ReactNode;
};

export type PreviewChoiceProps<T extends string> = {
  /** Names the whole set for screen readers, e.g. "Brightness". */
  label: string;
  options: readonly PreviewOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * A few options shown side by side as pictures, each with its name and a radio
 * under it — the shape a phone's own display settings use, and the one people
 * have already met somewhere else.
 *
 * A picture is what makes this worth a wider row than a plain list: "Always
 * dark" is a sentence to decode, whereas a dark phone next to a pale one is
 * simply the answer. The name and the radio still carry it on their own, so
 * nothing here depends on seeing the difference between the two drawings.
 */
export function PreviewChoice<T extends string>({
  label,
  options,
  value,
  onChange,
}: PreviewChoiceProps<T>) {
  // Choosing a theme repaints the whole app, which takes a moment. The radio is
  // not allowed to wait for it: the tapped option is marked from local state on
  // the next frame and the change itself goes out as a transition.
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
    <View
      style={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      {options.map((option) => (
        <Option
          key={option.value}
          option={option}
          selected={option.value === selected}
          onPress={() => select(option.value)}
        />
      ))}
    </View>
  );
}

function Option<T extends string>({
  option,
  selected,
  onPress,
}: {
  option: PreviewOption<T>;
  selected: boolean;
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
      style={[styles.option]}
    >
      <View
        style={[
          styles.frame,
          {
            backgroundColor: selected ? colors.surface : "transparent",
            borderColor: selected ? colors.primary : "transparent",
            borderWidth: scale(4),
            filter: selected
              ? undefined
              : "hue-rotate(180deg) saturate(0.5) brightness(0.8)",
            padding: scale(6),
          },
        ]}
      >
        <View style={{ borderRadius: Radius.sm, overflow: "hidden", flex: 1 }}>
          {option.preview}
        </View>
      </View>

      <Text
        variant="caption"
        center
        color={selected ? "primary" : "text"}
        style={selected && styles.selectedLabel}
        numberOfLines={2}
      >
        {option.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  option: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.sm,
  },
  frame: {
    width: "100%",
    aspectRatio: 0.62,
    borderRadius: Radius.md,
    overflow: "hidden",
  },
  selectedLabel: {
    fontWeight: "700",
  },
});
