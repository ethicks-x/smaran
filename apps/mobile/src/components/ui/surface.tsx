import { Platform, StyleSheet, View, type ViewProps } from "react-native";

import { useThemeColors } from "@/hooks/use-theme";
import { Radius, Spacing, scale } from "@/theme";

export type SurfaceProps = ViewProps & {
  /** Which background token to paint. Defaults to `surface`. */
  tone?: "surface" | "muted" | "primary" | "accent" | "danger";
  /** Padded and rounded like a card. Defaults to `true`. */
  padded?: boolean;
  bordered?: boolean;
  /**
   * Lifts the card off the canvas with a soft shadow and a lighter fill. For
   * the one or two cards a screen is actually about — if everything on a screen
   * is raised, nothing is.
   */
  elevated?: boolean;
};

const TONE_BACKGROUND = {
  surface: "surface",
  muted: "surfaceMuted",
  primary: "primaryMuted",
  accent: "accentMuted",
  danger: "dangerMuted",
} as const;

/** A themed container: the building block for every card and grouped row. */
export function Surface({
  tone = "surface",
  padded = true,
  bordered = true,
  elevated = false,
  style,
  ...rest
}: SurfaceProps) {
  const colors = useThemeColors();

  const card = (
    <View
      style={[
        styles.base,
        padded && styles.padded,
        {
          // A raised card also reads as one step closer to the reader: a shadow
          // alone is nearly invisible on a dark canvas, so the fill lightens
          // with it.
          backgroundColor:
            elevated && tone === "surface"
              ? colors.surfaceRaised
              : colors[TONE_BACKGROUND[tone]],
          borderColor: bordered ? colors.border : "transparent",
          borderWidth: bordered ? StyleSheet.hairlineWidth * 2 : 0,
        },
        style,
      ]}
      {...rest}
    />
  );

  if (!elevated) {
    return card;
  }

  // The shadow goes on a wrapper rather than the card itself: the card clips
  // its children to its rounded corners, and on iOS that same clip would erase
  // the shadow it is casting. The wrapper takes no layout of its own — spacing
  // around a raised card belongs to the `gap` of whatever is stacking them.
  return (
    <View style={[styles.shadow, { shadowColor: colors.shadow }]}>{card}</View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    overflow: "hidden",
  },
  padded: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  shadow: {
    borderRadius: Radius.lg,
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowOpacity: 0.16,
        shadowRadius: scale(18),
        shadowOffset: { width: 0, height: scale(6) },
      },
    }),
  },
});
