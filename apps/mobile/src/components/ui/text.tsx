import { useMemo } from "react";
import {
  Text as RNText,
  type TextProps as RNTextProps,
  StyleSheet,
} from "react-native";

import { useBoldText, useTextScale, useThemeColors } from "@/hooks/use-theme";
import {
  boldWeight,
  TextStyles,
  type TextVariant,
  type ThemeColor,
} from "@/theme";

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
  const bold = useBoldText();

  const sized = useMemo(
    () => sizeFor(variant, textScale, bold),
    [variant, textScale, bold],
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
function sizeFor(variant: TextVariant, textScale: number, bold: boolean) {
  if (textScale === 1 && !bold) {
    return null;
  }

  const base = TextStyles[variant];

  return {
    fontSize: Math.round(base.fontSize * textScale),
    lineHeight: Math.round(base.lineHeight * textScale),
    fontWeight: bold ? boldWeight(base.fontWeight) : base.fontWeight,
  };
}

const styles = StyleSheet.create({
  center: { textAlign: "center" },
});
