import { useAppearancePreferences } from "@/hooks/use-appearance";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { TextSizeScales, type ThemeColors, themeColors } from "@/theme";

export type Theme = {
  scheme: "light" | "dark";
  isDark: boolean;
  colors: ThemeColors;
};

/** The resolved theme for the current colour scheme and highlight. */
export function useTheme(): Theme {
  const scheme = useColorScheme();

  return { scheme, isDark: scheme === "dark", colors: useThemeColors() };
}

/** Shorthand for the common case of only needing colours. */
export function useThemeColors(): ThemeColors {
  return themeColors(useColorScheme(), useAppearancePreferences().highlight);
}

/**
 * The multiplier the reader's text size choice puts on the type scale. `Text`
 * applies it for every string in the app; anything drawing type by hand should
 * apply it too.
 */
export function useTextScale(): number {
  return TextSizeScales[useAppearancePreferences().textSize];
}

/** Whether the reader has asked for a heavier face. `Text` applies it. */
export function useBoldText(): boolean {
  return useAppearancePreferences().boldText;
}
