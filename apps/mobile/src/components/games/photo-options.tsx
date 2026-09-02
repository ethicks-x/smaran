import { Icon } from "@expo/ui";
import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { KIND_ICON } from "@/components/memories/kinds";
import { AppIcons, NativeHost } from "@/components/ui";
import type { MemorySubjectKind } from "@/db/schema";
import { useThemeColors } from "@/hooks/use-theme";
import { Radius, Spacing, scale, TouchTarget } from "@/theme";

/** Two to a row, always. A photograph any smaller stops being a face you can recognise, and
 * recognising it is the entire task.
 *
 * Every tile is this wide whatever the round holds, so an odd one left over on the last row
 * is the same picture at the same size as the two above it rather than a wide one stretched
 * across the whole board. A photograph twice the size of its neighbours reads as the
 * important one, and on a board where they are all equally the question that would be a
 * hint the game never meant to give. */
const TILE_BASIS = "44%";
const MIN_TILE = Math.max(scale(132), TouchTarget.large);
const PLACEHOLDER_ICON = scale(40);

export type PhotoOptionState = "idle" | "wrong" | "correct";

export type PhotoOption = {
  id: string;
  /** A path into the media cache. Null draws the category's mark instead. */
  photoUri: string | null;
  /** What a screen reader hears for this face. Never drawn — the picture is the task. */
  label: string;
  kind: MemorySubjectKind;
  state: PhotoOptionState;
};

export type PhotoOptionsProps = {
  options: readonly PhotoOption[];
  /** Names the whole set, e.g. "Choose the photograph". */
  label: string;
  /** Given a name, the whole sentence a screen reader hears for one already tried. */
  wrongLabel: (name: string) => string;
  onPress: (id: string) => void;
};

/**
 * The photographs to choose between — the answer half of a "which one is this?" question.
 *
 * `MissingOptions` is the same idea for symbols and words and this is deliberately not it:
 * these are the family's own pictures, they come off local flash rather than out of a
 * constant, and a tile has to be big enough to tell one relative from another. Sharing one
 * component would have meant a prop for every one of those differences.
 *
 * An option tapped and found wrong stays exactly where it is, tinted. Nothing is removed,
 * nothing is disabled, and there is no limit on tries — the same promise every board in
 * this app makes. Tapping it again does nothing at all.
 */
export function PhotoOptions({
  options,
  label,
  wrongLabel,
  onPress,
}: PhotoOptionsProps) {
  const colors = useThemeColors();

  return (
    <View
      style={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      {options.map((option) => {
        const tone =
          option.state === "wrong"
            ? { fill: colors.dangerMuted, edge: colors.danger }
            : option.state === "correct"
              ? { fill: colors.successMuted, edge: colors.success }
              : { fill: colors.surface, edge: colors.border };

        return (
          <Pressable
            key={option.id}
            onPress={() => onPress(option.id)}
            accessibilityRole="radio"
            accessibilityLabel={
              option.state === "wrong" ? wrongLabel(option.label) : option.label
            }
            accessibilityState={{
              checked: option.state === "correct",
              selected: option.state === "correct",
            }}
            style={({ pressed }) => [
              styles.option,
              { backgroundColor: tone.fill, borderColor: tone.edge },
              pressed && styles.pressed,
            ]}
          >
            {option.photoUri ? (
              <Image
                source={{ uri: option.photoUri }}
                style={styles.photo}
                contentFit="cover"
                transition={0}
              />
            ) : (
              <View style={styles.placeholder}>
                <NativeHost>
                  <Icon
                    name={AppIcons[KIND_ICON[option.kind]]}
                    size={PLACEHOLDER_ICON}
                    color={colors.textSecondary}
                  />
                </NativeHost>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.md,
  },
  option: {
    flexBasis: TILE_BASIS,
    minHeight: MIN_TILE,
    aspectRatio: 1,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth * 3,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.85,
  },
});
