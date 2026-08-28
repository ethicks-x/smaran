import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useTheme } from "@/hooks/use-theme";
import { TextStyles } from "@/theme";

/**
 * Four destinations, always visible, always labelled. Recognition beats recall:
 * no hidden drawers, no gesture-only navigation, no more than four choices.
 */
export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <NativeTabs
      backgroundColor={colors.surface}
      tintColor={colors.primary}
      indicatorColor={colors.primaryMuted}
      iconColor={{ default: colors.textSecondary, selected: colors.primary }}
      labelStyle={{
        default: {
          fontSize: TextStyles.caption.fontSize,
          color: colors.textSecondary,
        },
        selected: { fontWeight: "600", color: colors.primary },
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sun.max.fill" md="today" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="people">
        <NativeTabs.Trigger.Label>People</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.2.fill" md="group" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="memories">
        <NativeTabs.Trigger.Label>Memories</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="photo.on.rectangle.angled"
          md="photo_library"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="help">
        <NativeTabs.Trigger.Label>Help</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="phone.fill" md="call" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
