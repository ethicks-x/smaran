import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, type ThemeColors } from "@/theme";

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
