import { useColorScheme as useRNColorScheme } from "react-native";

import type { ColorScheme } from "@/theme";

/**
 * The active colour scheme, with the platform's `null`/`"unspecified"` states
 * resolved to `"light"` so callers never have to guard.
 */
export function useColorScheme(): ColorScheme {
  return useRNColorScheme() === "dark" ? "dark" : "light";
}
