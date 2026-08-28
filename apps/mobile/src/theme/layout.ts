import { Platform } from "react-native";

/**
 * Global size dial.
 *
 * Every spacing, radius, touch target and type size in the app is derived from
 * this multiplier, so the whole UI can be tightened or loosened from one place.
 * 1 is the original scale, tuned for low-vision and low-dexterity users; lower
 * values fit more on screen for everyone else.
 */
export const UIScale = 0.75;

/** Applies {@link UIScale} to a base value, rounded to whole pixels. */
export const scale = (value: number) => Math.round(value * UIScale);

const scaleAll = <T extends Record<string, number>>(values: T) =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, scale(value)]),
  ) as { [K in keyof T]: number };

/**
 * Spacing scale. Generous by design — dense layouts are hard to parse and hard
 * to tap for the people this app is built for.
 */
export const Spacing = scaleAll({
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  "4xl": 64,
});

export const Radius = {
  ...scaleAll({
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28,
  }),
  pill: 999,
};

/**
 * Minimum hit areas. The platform floor is 44–48pt; Smaran uses larger targets
 * because tremor and reduced fine motor control make small targets unreliable.
 * Scaled values are clamped so they never drop below the platform floor.
 */
const platformFloor = 48;
const scaleTarget = (value: number) => Math.max(scale(value), platformFloor);

export const TouchTarget = {
  /** Icon buttons, list chevrons. */
  min: scaleTarget(56),
  /** Standard buttons and list rows. */
  comfortable: scaleTarget(64),
  /** Primary and emergency actions. */
  large: scaleTarget(76),
};

/** Height reserved for the native tab bar so content never hides behind it. */
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;

/** Keeps line length readable on tablets and the web build. */
export const MaxContentWidth = 640;

export const HitSlop = { top: 12, bottom: 12, left: 12, right: 12 } as const;
