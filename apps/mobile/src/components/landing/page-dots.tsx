import { Animated, StyleSheet, View } from "react-native";

import { OnArt } from "@/components/landing/on-art";
import { Radius, Spacing, scale } from "@/theme";

const DOT = scale(12);
const DOT_ACTIVE = scale(40);

export type PageDotsProps = {
  count: number;
  /** Horizontal scroll offset of the pager the dots are reporting on. */
  scrollX: Animated.Value;
  /** One page's width. */
  width: number;
  /** Read out to screen readers in place of the dots themselves. */
  label: string;
};

/**
 * Where you are in the story. The current page's dot stretches into a bar
 * rather than only changing opacity, so position is carried by shape as well —
 * legible at arm's length and to anyone who cannot separate the two states.
 *
 * The stretch tracks the finger: it grows as a page is dragged in, so the
 * gesture is answered while it is still happening.
 */
export function PageDots({ count, scrollX, width, label }: PageDotsProps) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      {Array.from({ length: count }, (_, index) => {
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
        ];

        return (
          <Animated.View
            // biome-ignore lint/suspicious/noArrayIndexKey: dots are positions
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: OnArt.text,
                width: scrollX.interpolate({
                  inputRange,
                  outputRange: [DOT, DOT_ACTIVE, DOT],
                  extrapolate: "clamp",
                }),
                opacity: scrollX.interpolate({
                  inputRange,
                  outputRange: [0.32, 1, 0.32],
                  extrapolate: "clamp",
                }),
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: DOT,
  },
  dot: {
    height: DOT,
    borderRadius: Radius.pill,
  },
});
