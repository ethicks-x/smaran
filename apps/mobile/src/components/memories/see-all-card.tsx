import { Icon } from "@expo/ui";
import { Pressable, StyleSheet, View } from "react-native";

import { AppIcons, NativeHost, Surface, Text } from "@/components/ui";
import { useThemeColors } from "@/hooks/use-theme";
import { Spacing, scale } from "@/theme";

const ARROW_ICON = scale(52);

export type SeeAllCardProps = {
  /** The two or three words in the tile itself — "See all". */
  label: string;
  /** How many subjects are not on this page, already in the reader's words. */
  remaining: string;
  /** Said in full by a screen reader: "See all people", never just "See all". */
  accessibilityLabel: string;
  onPress: () => void;
};

/**
 * The last tile in a category on the Memories tab: the way through to the rest
 * of it.
 *
 * Built to the same square-photograph-and-caption shape as {@link SubjectCard}
 * because it stands in the grid beside them, and a tile of a different size
 * among six would read as something more important than the faces around it.
 * What separates it is colour and an arrow — it is the one thing in the block
 * that does something, and it says so in words as well.
 *
 * It is only ever drawn when there is genuinely more behind it. A tap that
 * leads to the same photographs the reader is already looking at teaches
 * someone with dementia that this app does not go anywhere.
 */
export function SeeAllCard({
  label,
  remaining,
  accessibilityLabel,
  onPress,
}: SeeAllCardProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <Surface padded={false} style={styles.card}>
        <View style={[styles.frame, { backgroundColor: colors.primaryMuted }]}>
          <NativeHost>
            <Icon
              name={AppIcons.chevronRight}
              size={ARROW_ICON}
              color={colors.primary}
            />
          </NativeHost>
        </View>

        <View style={styles.text}>
          <Text variant="label" center numberOfLines={2}>
            {label}
          </Text>
          <Text
            variant="caption"
            color="textSecondary"
            center
            numberOfLines={2}
          >
            {remaining}
          </Text>
        </View>
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  card: {
    flex: 1,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  frame: {
    // Square, so the tile lines up with the photographs it sits beside.
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  pressed: {
    opacity: 0.9,
  },
});
