import { Icon } from "@expo/ui";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppIcons, NativeHost, ProgressBar, Text } from "@/components/ui";
import { useThemeColors } from "@/hooks/use-theme";
import { Spacing, scale } from "@/theme";

const MARK_SIZE = scale(56);

export type PreparingBoardProps = {
  /** What is happening, in one warm line. Announced when it changes. */
  title: string;
  /** One sentence under it saying what to expect. */
  message: string;
  /** What the bar is measuring, for screen readers. */
  progressLabel: string;
  /** How long the bar takes to fill. Long — it is a "please wait", not a countdown. */
  durationMs: number;
};

/**
 * The screen a game shows while it gets itself ready.
 *
 * There is exactly one thing on it that moves and **nothing on it to decide about** — no
 * button, no way to skip, no way to get it wrong. That is the whole design: a reader with
 * dementia meeting a screen with a choice on it is a reader who has to work out what the
 * choice is, and here there is genuinely nothing for them to do but wait a moment.
 *
 * The bar is honest about being approximate rather than dishonest about being precise. It
 * fills over a fixed span because what it is waiting on — a photograph over a village
 * connection, a model writing a sentence — has no percentage anybody could report, and a
 * bar that jumped from nothing to everything would say less than one that simply travels.
 * If the wait ends early the screen moves on early, which is the only direction that can
 * surprise anyone pleasantly.
 */
export function PreparingBoard({
  title,
  message,
  progressLabel,
  durationMs,
}: PreparingBoardProps) {
  const colors = useThemeColors();

  // The bar holds its own travel because `ProgressBar` starts wherever it is first given
  // and animates only on a change — handed 1 from the outset it would be full before the
  // first frame. It starts empty and is told to fill on the render after that.
  const [filled, setFilled] = useState(0);

  useEffect(() => setFilled(1), []);

  return (
    <View style={styles.container}>
      <View style={[styles.mark, { backgroundColor: colors.primaryMuted }]}>
        <NativeHost>
          <Icon
            name={AppIcons.memories}
            size={MARK_SIZE * 0.55}
            color={colors.primary}
          />
        </NativeHost>
      </View>

      <Text variant="heading" center accessibilityLiveRegion="polite">
        {title}
      </Text>

      <Text variant="body" color="textSecondary" center>
        {message}
      </Text>

      {/* Starts empty and is told to fill over the whole wait, so the travel itself is the
          wait rather than something animated on top of it. */}
      <ProgressBar
        value={filled}
        tone="primary"
        durationMs={durationMs}
        accessibilityLabel={progressLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "stretch",
    gap: Spacing.lg,
    paddingVertical: Spacing["3xl"],
  },
  mark: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: MARK_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
