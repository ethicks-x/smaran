import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useThemeColors } from "@/hooks/use-theme";
import { Radius, scale } from "@/theme";

export type ProgressBarProps = {
  /** How far along, 0–1. Values outside the range are clamped. */
  value: number;
  /** Fill colour. `success` is for a bar that has arrived. */
  tone?: "primary" | "success" | "warning";
  /** What the bar is measuring, for screen readers. */
  accessibilityLabel?: string;
};

const TRACK_HEIGHT = scale(18);

/**
 * A single, chunky progress bar. It is thick enough to read from arm's length
 * and animates rather than jumping, so a change is something you can watch
 * happen instead of something you have to notice after the fact.
 */
export function ProgressBar({
  value,
  tone = "primary",
  accessibilityLabel,
}: ProgressBarProps) {
  const colors = useThemeColors();
  const progress = useSharedValue(clamp(value));

  useEffect(() => {
    progress.value = withTiming(clamp(value), { duration: 220 });
  }, [value, progress]);

  const fill = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const percent = Math.round(clamp(value) * 100);

  return (
    <View
      style={[styles.track, { backgroundColor: colors.surfaceMuted }]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <Animated.View
        style={[styles.fill, { backgroundColor: colors[tone] }, fill]}
      />
    </View>
  );
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));

const styles = StyleSheet.create({
  track: {
    width: "100%",
    height: TRACK_HEIGHT,
    borderRadius: Radius.pill,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: Radius.pill,
  },
});
