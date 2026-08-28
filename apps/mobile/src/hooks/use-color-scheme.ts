import { useColorScheme as useRNColorScheme } from "react-native";

import { useAppearancePreferences } from "@/hooks/use-appearance";
import type { ColorScheme } from "@/theme";

/**
 * The active colour scheme.
 *
 * The reader's own choice wins; "match my phone" — the default — falls through
 * to the platform, whose `null`/`"unspecified"` states resolve to `"light"` so
 * callers never have to guard.
 */
export function useColorScheme(): ColorScheme {
  const system = useRNColorScheme() === "dark" ? "dark" : "light";
  const { themeMode } = useAppearancePreferences();

  return themeMode === "system" ? system : themeMode;
}
