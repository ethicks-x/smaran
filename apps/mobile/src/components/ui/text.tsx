import { useMemo } from "react";
import {
  Text as RNText,
  type TextProps as RNTextProps,
  StyleSheet,
} from "react-native";

import { useTextScale, useThemeColors } from "@/hooks/use-theme";
import { TextStyles, type TextVariant, type ThemeColor } from "@/theme";

export type TextProps = RNTextProps & {
  /** Role in the type scale. Defaults to `body`. */
  variant?: TextVariant;
  /** Semantic colour token. Defaults to `text`. */
  color?: ThemeColor;
  center?: boolean;
};

/**
 * The only text component screens should use. Every string in the app goes
 * through the type scale, so nothing accidentally ships below the 18pt floor —
 * and the reader's text size choice lands on all of it from here.
 */
export function Text({
  variant = "body",
  color = "text",
  center,
  style,
  ...rest
}: TextProps) {
  const colors = useThemeColors();
  const textScale = useTextScale();

  const sized = useMemo(
    () => sizeFor(variant, textScale),
    [variant, textScale],
  );

  return (
    <RNText
      // Respects the reader's OS-level font size preference on top of our scale.
      maxFontSizeMultiplier={1.8}
      style={[
        TextStyles[variant],
        sized,
        { color: colors[color] },
        center && styles.center,
        style,
      ]}
      {...rest}
    />
  );
}

/** Size and leading grow together, so long paragraphs keep their rhythm. */
function sizeFor(variant: TextVariant, textScale: number) {
  if (textScale === 1) {
    return null;
  }

  const base = TextStyles[variant];

  return {
    fontSize: Math.round(base.fontSize * textScale),
    lineHeight: Math.round(base.lineHeight * textScale),
  };
}

const styles = StyleSheet.create({
  center: { textAlign: "center" },
});
