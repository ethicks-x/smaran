/**
 * Appearance preferences.
 *
 * Two dials, and deliberately only two: how bright the app is, and how large it
 * reads. Both are things a reader is likely to want changed once and then never
 * again, so each option is spelled out in full rather than hidden behind a
 * slider with no labels.
 *
 * The labels and descriptions themselves are not here — they live in the locale
 * catalogues under `appearance.mode.*` and `appearance.size.*`, keyed by the
 * values below. A token table that carried English strings would be a second
 * place for copy to go stale, and one the translator never sees.
 */

/** What the reader asked for — not what is currently on screen. */
export type ThemeMode = "system" | "light" | "dark";

/** The order the choices are offered in, brightest intent first. */
export const ThemeModes = [
  "system",
  "light",
  "dark",
] as const satisfies readonly ThemeMode[];

/**
 * Text size steps, as multipliers on the type scale. The app's floor is already
 * 18pt, so the top step is genuinely large rather than merely bigger — and the
 * OS-level font setting still multiplies on top of whichever step is chosen.
 */
export type TextSize = "normal" | "large" | "largest";

export const TextSizeScales = {
  normal: 1,
  large: 1.15,
  largest: 1.3,
} as const satisfies Record<TextSize, number>;

export const TextSizes = [
  "normal",
  "large",
  "largest",
] as const satisfies readonly TextSize[];
