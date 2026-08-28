import { StyleSheet, View, type ViewProps } from "react-native";

import { useThemeColors } from "@/hooks/use-theme";
import { Radius, Spacing } from "@/theme";

export type SurfaceProps = ViewProps & {
  /** Which background token to paint. Defaults to `surface`. */
  tone?: "surface" | "muted" | "primary" | "accent" | "danger";
  /** Padded and rounded like a card. Defaults to `true`. */
  padded?: boolean;
  bordered?: boolean;
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
  style,
  ...rest
}: SurfaceProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.base,
        padded && styles.padded,
        {
          backgroundColor: colors[TONE_BACKGROUND[tone]],
          borderColor: bordered ? colors.border : "transparent",
          borderWidth: bordered ? StyleSheet.hairlineWidth * 2 : 0,
        },
        style,
      ]}
      {...rest}
    />
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
});
