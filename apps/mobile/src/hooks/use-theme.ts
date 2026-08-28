import { useAppearancePreferences } from "@/hooks/use-appearance";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, TextSizeScales, type ThemeColors } from "@/theme";

export type Theme = {
  scheme: "light" | "dark";
  isDark: boolean;
  colors: ThemeColors;
};

/** The resolved theme for the current colour scheme. */
export function useTheme(): Theme {
  const scheme = useColorScheme();

  return { scheme, isDark: scheme === "dark", colors: Colors[scheme] };
}

/** Shorthand for the common case of only needing colours. */
export function useThemeColors(): ThemeColors {
  return Colors[useColorScheme()];
}

/**
 * The multiplier the reader's text size choice puts on the type scale. `Text`
 * applies it for every string in the app; anything drawing type by hand should
 * apply it too.
 */
export function useTextScale(): number {
  return TextSizeScales[useAppearancePreferences().textSize];
}
