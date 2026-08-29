import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Animated, StyleSheet, View } from "react-native";

import { OnArt } from "@/components/landing/on-art";
import type { LandingSlide as Slide } from "@/components/landing/slides";
import { Text } from "@/components/ui";
import { MaxContentWidth, Spacing, scale } from "@/theme";

/** The vertical wash over the art: dark under the headline and the controls,
 * near-clear across the middle where the subject of the photograph lives. */
const SCRIM = require("@/assets/images/landing/scrim.png");

/** How far the art drifts against the page as it is swiped past, in points. */
const PARALLAX = scale(64);

export type LandingSlideProps = {
  slide: Slide;
  /** Position in the story — decides which slice of the scroll it reacts to. */
  index: number;
  /** Horizontal scroll offset of the pager, shared by every page. */
  scrollX: Animated.Value;
  /** One page's width, i.e. the window's. */
  width: number;
  /** Room to leave clear at the top for the wordmark, and at the bottom for
   * the controls — both float above the pager and must not be written under. */
  topInset: number;
  bottomInset: number;
};

/**
 * One page of the landing story: the art fills the screen, a scrim carries the
 * type, and the promise is set in large white display type near the top.
 *
 * The art drifts slower than the page it is on, so a swipe reads as panning a
 * camera across one scene rather than shuffling cards. The words move with the
 * page at full speed and cross-fade, because copy that lags is copy you try to
 * read mid-flight.
 */
export function LandingSlide({
  slide,
  index,
  scrollX,
  width,
  topInset,
  bottomInset,
}: LandingSlideProps) {
  const { t } = useTranslation();

  // Neighbouring pages either side, so the art is already drifting into place
  // before the page it belongs to is on screen.
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const artShift = scrollX.interpolate({
    inputRange,
    outputRange: [PARALLAX, 0, -PARALLAX],
    extrapolate: "clamp",
  });

  const copyShift = scrollX.interpolate({
    inputRange,
    outputRange: [scale(28), 0, -scale(28)],
    extrapolate: "clamp",
  });

  const copyFade = scrollX.interpolate({
    inputRange,
    outputRange: [0, 1, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.page, { width }]}>
      <Animated.View
        style={[styles.artLayer, { transform: [{ translateX: artShift }] }]}
      >
        <Image
          source={slide.art}
          style={styles.fill}
          contentFit="cover"
          // The art is atmosphere; the headline over it carries the meaning.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          transition={260}
        />
      </Animated.View>

      <Image
        source={SCRIM}
        style={styles.fill}
        contentFit="fill"
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />

      <Animated.View
        style={[
          styles.copy,
          {
            paddingTop: topInset + Spacing.xl,
            paddingBottom: bottomInset,
            opacity: copyFade,
            transform: [{ translateX: copyShift }],
          },
        ]}
      >
        <Text variant="caption" style={styles.kicker}>
          {t(`landing.slides.${slide.key}.kicker`).toLocaleUpperCase()}
        </Text>
        <Text variant="display" style={styles.title} accessibilityRole="header">
          {t(`landing.slides.${slide.key}.title`)}
        </Text>
        <Text variant="bodyLarge" style={styles.body}>
          {t(`landing.slides.${slide.key}.body`)}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: OnArt.canvas,
    // The art layer is wider than the page it belongs to, so the page has to
    // clip it. Without this the neighbouring slide's art spills over this one
    // mid-swipe and the two images meet in a seam that moves.
    overflow: "hidden",
  },
  fill: {
    ...StyleSheet.absoluteFill,
  },
  artLayer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    // Wider than the page, so the drift never uncovers an edge.
    left: -PARALLAX,
    right: -PARALLAX,
  },
  copy: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  kicker: {
    color: OnArt.textFaint,
    letterSpacing: 1.6,
  },
  title: {
    color: OnArt.text,
  },
  body: {
    color: OnArt.textMuted,
    // Long enough to say something, short enough not to fill the frame.
    maxWidth: scale(440),
  },
});
