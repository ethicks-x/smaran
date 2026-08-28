import { Host, type UniversalHostProps } from "@expo/ui";

import { useTheme } from "@/hooks/use-theme";

/**
 * Bridges into SwiftUI (iOS) / Jetpack Compose (Android) with the app theme
 * already applied, so `@expo/ui` controls pick up Smaran's colour scheme and
 * accent instead of the platform defaults.
 *
 * Every `@expo/ui` component in the app must be rendered inside one of these.
 */
export function NativeHost({
  matchContents = true,
  ...rest
}: UniversalHostProps) {
  const { scheme, colors } = useTheme();

  return (
    <Host
      matchContents={matchContents}
      colorScheme={scheme}
      seedColor={colors.primary}
      {...rest}
    />
  );
}
