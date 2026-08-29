import { Host, type UniversalHostProps } from "@expo/ui";

import { useAppearancePreferences } from "@/hooks/use-appearance";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Highlights } from "@/theme";

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
  const { highlight } = useAppearancePreferences();

  // The seed is the light-scheme primary in both schemes, deliberately. A seed
  // is not a colour to paint — it is the root of a tonal palette, which the
  // platform regenerates from scratch every time the value changes, in every
  // host on screen. Letting `colorScheme` say which end of that palette to use
  // means switching light to dark no longer rebuilds a Material 3 scheme per
  // icon; only the reader changing their highlight does, which is rare.
  return (
    <Host
      matchContents={matchContents}
      colorScheme={scheme}
      seedColor={Highlights[highlight].light.primary}
      {...rest}
    />
  );
}
