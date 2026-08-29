import { Platform, type TextStyle } from "react-native";

import { scale } from "./layout";

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
 * The base floor is 18pt — roughly 1.3x a stock mobile app — and line heights
 * are loose, both of which measurably help readers with presbyopia. Weights stay
 * at 600 or below for body copy so glyphs keep their open counters.
 *
 * Sizes run through `scale` so the app-wide `UIScale` dial moves type along with
 * spacing and touch targets.
 */
export const TextStyles = {
  /** One number or word that carries a whole screen. */
  display: { fontSize: scale(44), lineHeight: scale(50), fontWeight: "700" },
  /** Screen titles. */
  title: { fontSize: scale(34), lineHeight: scale(42), fontWeight: "700" },
  /** Card and section headings. */
  heading: { fontSize: scale(26), lineHeight: scale(34), fontWeight: "600" },
  /** Prominent body copy — the default for anything the user must read. */
  bodyLarge: { fontSize: scale(22), lineHeight: scale(32), fontWeight: "500" },
  /** Standard body copy. */
  body: { fontSize: scale(20), lineHeight: scale(30), fontWeight: "400" },
  /** Button and tab labels. */
  label: { fontSize: scale(20), lineHeight: scale(26), fontWeight: "600" },
  /** Supporting detail. Never used for anything essential. */
  caption: { fontSize: scale(18), lineHeight: scale(26), fontWeight: "500" },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof TextStyles;

/**
 * The heavier face used when the reader has asked for bold text — one step up
 * the weight scale rather than a jump to 700 everywhere, which would flatten
 * the difference between a heading and the paragraph under it.
 */
export function boldWeight(weight: TextStyle["fontWeight"]) {
  return BOLDER[String(weight)] ?? weight;
}

const BOLDER: Record<string, TextStyle["fontWeight"]> = {
  "400": "600",
  "500": "600",
  "600": "700",
  "700": "800",
};
