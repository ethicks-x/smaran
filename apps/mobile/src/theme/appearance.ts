/**
 * Appearance preferences.
 *
 * Two dials, and deliberately only two: how bright the app is, and how large it
 * reads. Both are things a reader is likely to want changed once and then never
 * again, so each option is spelled out in full rather than hidden behind a
 * slider with no labels.
 */

/** What the reader asked for — not what is currently on screen. */
export type ThemeMode = "system" | "light" | "dark";

export type ThemeModeOption = {
  value: ThemeMode;
  label: string;
  /** One plain sentence describing what choosing this does. */
  description: string;
};

export const ThemeModeOptions: readonly ThemeModeOption[] = [
  {
    value: "system",
    label: "Match my phone",
    description: "Turns dark when your phone does.",
  },
  {
    value: "light",
    label: "Always light",
    description: "Dark text on a pale background.",
  },
  {
    value: "dark",
    label: "Always dark",
    description: "Pale text on a dark background. Easier at night.",
  },
] as const;

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

export type TextSizeOption = {
  value: TextSize;
  label: string;
  description: string;
};

export const TextSizeOptions: readonly TextSizeOption[] = [
  { value: "normal", label: "Normal", description: "The standard size." },
  { value: "large", label: "Large", description: "A little bigger." },
  {
    value: "largest",
    label: "Largest",
    description: "As big as Smaran goes. Fewer words fit on a screen.",
  },
] as const;
