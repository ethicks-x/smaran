import { Platform, type TextStyle } from "react-native";

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

/**
 * Type scale.
 *
 * The floor is 18pt — roughly 1.3x a stock mobile app — and line heights are
 * loose, both of which measurably help readers with presbyopia. Weights stay at
 * 600 or below for body copy so glyphs keep their open counters.
 */
export const TextStyles = {
  /** One number or word that carries a whole screen. */
  display: { fontSize: 44, lineHeight: 50, fontWeight: "700" },
  /** Screen titles. */
  title: { fontSize: 34, lineHeight: 42, fontWeight: "700" },
  /** Card and section headings. */
  heading: { fontSize: 26, lineHeight: 34, fontWeight: "600" },
  /** Prominent body copy — the default for anything the user must read. */
  bodyLarge: { fontSize: 22, lineHeight: 32, fontWeight: "500" },
  /** Standard body copy. */
  body: { fontSize: 20, lineHeight: 30, fontWeight: "400" },
  /** Button and tab labels. */
  label: { fontSize: 20, lineHeight: 26, fontWeight: "600" },
  /** Supporting detail. Never used for anything essential. */
  caption: { fontSize: 18, lineHeight: 26, fontWeight: "500" },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof TextStyles;
