/**
 * Ink for anything drawn on top of the landing art.
 *
 * The landing screen is the one place in Smaran that does not follow the light
 * and dark themes: the art behind it is dark in both, so the type on it is
 * fixed. Every value here is measured against the scrimmed art rather than a
 * theme surface — the headline and button labels clear 7:1, the supporting copy
 * clears 4.5:1 at the lightest point the scrim allows.
 */
export const OnArt = {
  /** Headlines, button labels, icons. */
  text: "#FFFFFF",
  /** Supporting copy under a headline. */
  textMuted: "rgba(255, 255, 255, 0.88)",
  /** Kickers, hints, and the dots for pages you are not on. */
  textFaint: "rgba(255, 255, 255, 0.64)",

  /** Glass fills for the secondary controls sitting on the art. */
  fill: "rgba(255, 255, 255, 0.16)",
  border: "rgba(255, 255, 255, 0.30)",

  /** The one solid control on the screen, and the ink on top of it. */
  solid: "#FFFFFF",
  onSolid: "#0B1017",

  /** Sign-in failures. Lifted from the dark theme's danger token. */
  danger: "#FF9A90",

  /** Painted under everything, so the frame before the art decodes is not white. */
  canvas: "#05070A",
} as const;
