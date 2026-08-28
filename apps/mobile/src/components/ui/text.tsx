import {
  Text as RNText,
  type TextProps as RNTextProps,
  StyleSheet,
} from "react-native";

import { useThemeColors } from "@/hooks/use-theme";
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
 * through the type scale, so nothing accidentally ships below the 18pt floor.
 */
export function Text({
  variant = "body",
  color = "text",
  center,
  style,
  ...rest
}: TextProps) {
  const colors = useThemeColors();

  return (
    <RNText
      // Respects the reader's OS-level font size preference on top of our scale.
      maxFontSizeMultiplier={1.8}
      style={[
        TextStyles[variant],
        { color: colors[color] },
        center && styles.center,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  center: { textAlign: "center" },
});
