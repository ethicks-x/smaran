import { Platform } from "react-native";

/**
 * Spacing scale. Generous by design — dense layouts are hard to parse and hard
 * to tap for the people this app is built for.
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  "4xl": 64,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

/**
 * Minimum hit areas. The platform floor is 44–48pt; Smaran uses larger targets
 * because tremor and reduced fine motor control make small targets unreliable.
 */
export const TouchTarget = {
  /** Icon buttons, list chevrons. */
  min: 56,
  /** Standard buttons and list rows. */
  comfortable: 64,
  /** Primary and emergency actions. */
  large: 76,
} as const;

/** Height reserved for the native tab bar so content never hides behind it. */
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;

/** Keeps line length readable on tablets and the web build. */
export const MaxContentWidth = 640;

export const HitSlop = { top: 12, bottom: 12, left: 12, right: 12 } as const;
