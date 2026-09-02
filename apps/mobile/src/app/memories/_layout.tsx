import { Stack } from "expo-router";

import { useThemeColors } from "@/hooks/use-theme";

/**
 * A single category's page, pushed on top of the tabs from the Memories tab.
 *
 * On top rather than as a tab of its own: there are three categories and the
 * bar already carries five destinations, and a page reached from the tile that
 * names it is a page the reader can leave the same way they arrived. It carries
 * its own large "Back" control, so the way out is a labelled button and never a
 * gesture.
 */
export default function MemoriesLayout() {
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
