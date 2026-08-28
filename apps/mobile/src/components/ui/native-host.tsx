import { Host, type UniversalHostProps } from "@expo/ui";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/theme";

/**
 * The brand colour the native side derives its own palette from.
 *
 * Deliberately one constant rather than the current theme's `primary`. A seed
 * is not a colour to paint — it is the root of a tonal palette, which the
 * platform regenerates from scratch every time the value changes, in every host
 * on screen. Handing it a fixed seed and letting `colorScheme` say which end of
 * that palette to use means switching light to dark no longer rebuilds a
 * Material 3 scheme per icon.
 */
const SEED_COLOR = Colors.light.primary;

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
  const scheme = useColorScheme();

  return (
    <Host
      matchContents={matchContents}
      colorScheme={scheme}
      seedColor={SEED_COLOR}
      {...rest}
    />
  );
}
