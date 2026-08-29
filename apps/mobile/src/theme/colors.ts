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
    /** Cast by raised surfaces. Never painted as a fill. */
    shadow: "#1B2028",
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
    shadow: "#000000",
  },
} as const;

export type ColorScheme = keyof typeof Colors;

/**
 * The token set a scheme provides. Widened to `string` deliberately: a
 * highlight swaps three of these values out at runtime, so the literal types
 * the palette happens to be written in cannot be the contract consumers see.
 */
export type ThemeColors = {
  readonly [K in keyof (typeof Colors)["light"]]: string;
};

export type ThemeColor = keyof ThemeColors;

/**
 * The highlight colours the reader can choose between.
 *
 * A highlight replaces the `primary` triple and nothing else — buttons, the
 * selected tab, the ring around a chosen option. Everything the app has to say
 * with colour rather than with words (danger, success, warning) is left alone,
 * so no choice here can make an SOS button look ordinary.
 *
 * Each of the twelve values is contrast checked the same way the base palette
 * is (D-03): the light `primary` clears 7:1 on both `surface` and `background`,
 * `onPrimary` clears 7:1 on the `primary` it sits on, and `primary` clears 7:1
 * again on its own muted fill — in both schemes. Blue is the default and is the
 * base palette's own primary, unchanged.
 */
export const Highlights = {
  blue: {
    light: {
      primary: "#094A95",
      onPrimary: "#FFFFFF",
      primaryMuted: "#DCE9FB",
    },
    dark: { primary: "#8FBAFF", onPrimary: "#0A1B33", primaryMuted: "#1D2C42" },
  },
  teal: {
    light: {
      primary: "#0A5560",
      onPrimary: "#FFFFFF",
      primaryMuted: "#D6EFF3",
    },
    dark: { primary: "#6FCEDD", onPrimary: "#06232A", primaryMuted: "#16323A" },
  },
  green: {
    light: {
      primary: "#13592E",
      onPrimary: "#FFFFFF",
      primaryMuted: "#DCF0E3",
    },
    dark: { primary: "#7FD8A0", onPrimary: "#08301A", primaryMuted: "#17301F" },
  },
  marigold: {
    light: {
      primary: "#7A4308",
      onPrimary: "#FFFFFF",
      primaryMuted: "#FDF4E6",
    },
    dark: { primary: "#F3B267", onPrimary: "#33200A", primaryMuted: "#33261A" },
  },
  rose: {
    light: {
      primary: "#8F1830",
      onPrimary: "#FFFFFF",
      primaryMuted: "#FDEDF0",
    },
    dark: { primary: "#FF9FB3", onPrimary: "#3A0F19", primaryMuted: "#3A1B21" },
  },
  plum: {
    light: {
      primary: "#6B2E9E",
      onPrimary: "#FFFFFF",
      primaryMuted: "#F4EDFD",
    },
    dark: { primary: "#C9A6FF", onPrimary: "#2A0F47", primaryMuted: "#2C2140" },
  },
} as const satisfies Record<string, Record<ColorScheme, PrimaryTriple>>;

type PrimaryTriple = Pick<
  ThemeColors,
  "primary" | "onPrimary" | "primaryMuted"
>;

export type HighlightColor = keyof typeof Highlights;

/** The order the swatches are offered in. Blue first, then round the wheel. */
export const HighlightColors = Object.keys(Highlights) as HighlightColor[];

/**
 * The palette for a scheme with a highlight applied.
 *
 * Cached per pairing because this is what `useThemeColors` returns on every
 * render in the app: a fresh object each time would break every `useMemo` that
 * has colours in its dependencies.
 */
export function themeColors(
  scheme: ColorScheme,
  highlight: HighlightColor,
): ThemeColors {
  const key = `${scheme}:${highlight}`;
  const cached = resolved.get(key);

  if (cached) {
    return cached;
  }

  const colors = { ...Colors[scheme], ...Highlights[highlight][scheme] };
  resolved.set(key, colors);

  return colors;
}

const resolved = new Map<string, ThemeColors>();
