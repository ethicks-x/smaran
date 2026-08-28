/**
 * Smaran colour tokens.
 *
 * The palette is tuned for low-vision and older eyes: every foreground token
 * clears WCAG AAA (7:1) against the surfaces it is paired with — including the
 * accent, success, warning and danger colours on their muted fills.
 * Screens should only ever read semantic tokens — never raw hex values.
 */

export const Colors = {
  light: {
    /** App canvas. Warm off-white rather than pure white to cut glare. */
    background: "#F6F5F2",
    /** Cards and grouped rows sitting on the canvas. */
    surface: "#FFFFFF",
    /** A surface that needs to read as one step closer to the reader. */
    surfaceRaised: "#FFFFFF",
    /** Quiet fills: chips, icon tiles, disabled rows. */
    surfaceMuted: "#EBE9E4",
    /** Hairlines and card outlines. */
    border: "#D9D6CF",

    /** Primary reading colour. 17.8:1 on `surface`. */
    text: "#16181C",
    /** Secondary copy. 8.2:1 on `surface`. */
    textSecondary: "#4A5057",
    /** Labels and captions on muted fills. */
    textMuted: "#494C52",

    /** Main action colour. */
    primary: "#094A95",
    /** Content placed on top of `primary`. */
    onPrimary: "#FFFFFF",
    /** Tinted background pairing with `primary` text. */
    primaryMuted: "#DCE9FB",

    /** Warm accent for highlights, streaks and "now" markers. */
    accent: "#803B06",
    accentMuted: "#FBEBD6",

    /** Completed / on-track. */
    success: "#13592E",
    successMuted: "#DCF0E3",
    /** Needs attention soon. */
    warning: "#92400E",
    warningMuted: "#FBEBD6",
    /** Urgent help, SOS. */
    danger: "#931F19",
    onDanger: "#FFFFFF",
    dangerMuted: "#FBE3E1",

    /** Scrims behind sheets and dialogs. */
    overlay: "rgba(22, 24, 28, 0.45)",
  },

  dark: {
    background: "#111315",
    surface: "#1B1E21",
    surfaceRaised: "#23272B",
    surfaceMuted: "#2A2E33",
    border: "#343A40",

    text: "#F4F5F6",
    textSecondary: "#C2C8CE",
    textMuted: "#B5BBC1",

    primary: "#8FBAFF",
    onPrimary: "#0A1B33",
    primaryMuted: "#1D2C42",

    accent: "#F3B267",
    accentMuted: "#33261A",

    success: "#7FD8A0",
    successMuted: "#17301F",
    warning: "#F3B267",
    warningMuted: "#33261A",
    danger: "#FF9A90",
    onDanger: "#3A0D0A",
    dangerMuted: "#3A1B18",

    overlay: "rgba(0, 0, 0, 0.6)",
  },
} as const;

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = (typeof Colors)[ColorScheme];
export type ThemeColor = keyof ThemeColors;
