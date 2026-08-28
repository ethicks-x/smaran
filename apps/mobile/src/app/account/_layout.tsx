import { Stack } from "expo-router";

import { useThemeColors } from "@/hooks/use-theme";

/**
 * The screens pushed from Account. They arrive with the platform's own push
 * transition, and each one carries its own large "Back" control, so the way out
 * is a labelled button and not just a gesture.
 */
export default function AccountLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
