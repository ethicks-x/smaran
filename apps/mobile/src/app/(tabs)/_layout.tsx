import { Icon } from "@expo/ui";
import { TopTabs } from "expo-router/js-top-tabs";
import type { ColorValue } from "react-native";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcons, NativeHost, Text } from "@/components/ui";
import { useTheme } from "@/hooks/use-theme";
import { Radius, Spacing, scale, TextStyles } from "@/theme";

/** Icon, and the pill that sits behind it while its tab is the active one. */
const TAB_ICON_SIZE = scale(32);
const PILL_WIDTH = scale(84);
const PILL_HEIGHT = scale(42);

/** Pill, gap, label — plus a little air above and below. */
const TAB_ITEM_HEIGHT =
  PILL_HEIGHT + Spacing.xs + TextStyles.caption.lineHeight + Spacing.md;

type TabIconName = "today" | "people" | "memories" | "help";

/** What the tab bar hands the icon and label renderers for each state. */
type TabStateProps = { focused: boolean; color: ColorValue };

/**
 * Four destinations, always visible, always labelled. Recognition beats recall:
 * no hidden drawers, no more than four choices, and no label that only shows up
 * once you have already arrived.
 *
 * `TopTabs` is a pager, so the screens also swipe left and right — the gesture
 * people reach for first. The bar is pinned to the bottom and stays fully
 * tappable for anyone who doesn't swipe.
 *
 * The active tab is marked by a filled pill behind its icon rather than a rule
 * under it: a solid shape reads at a glance and from an arm's length away,
 * where a 3pt line does not.
 */
export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <TopTabs
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        // Tapping a tab cuts straight to that screen instead of paging
        // through the ones between. Only the pager animates, and only
        // because a swipe should track the finger that drives it.
        animationEnabled: false,
        tabBarShowIcon: true,
        // Labels never collapse into icon-only tabs, at any width.
        tabBarShowLabel: true,
        tabBarAllowFontScaling: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        // No ripple, no press dimming — the pill moving to the tapped
        // tab is the whole feedback.
        tabBarPressColor: "transparent",
        tabBarPressOpacity: 1,
        // The pill is the indicator; a sliding rule on top of it is noise.
        tabBarIndicator: () => null,
        tabBarItemStyle: {
          height: TAB_ITEM_HEIGHT,
          padding: 0,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          // The bar sits in the layout flow, so it owns the bottom inset.
          paddingBottom: insets.bottom,
          paddingTop: Spacing.xs,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <TopTabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: (props: TabStateProps) => (
            <TabIcon name="today" {...props} />
          ),
          tabBarLabel: TabLabel,
        }}
      />

      <TopTabs.Screen
        name="people"
        options={{
          title: "People",
          tabBarIcon: (props: TabStateProps) => (
            <TabIcon name="people" {...props} />
          ),
          tabBarLabel: TabLabel,
        }}
      />

      <TopTabs.Screen
        name="memories"
        options={{
          title: "Memories",
          tabBarIcon: (props: TabStateProps) => (
            <TabIcon name="memories" {...props} />
          ),
          tabBarLabel: TabLabel,
        }}
      />

      <TopTabs.Screen
        name="help"
        options={{
          title: "Help",
          tabBarIcon: (props: TabStateProps) => (
            <TabIcon name="help" {...props} />
          ),
          tabBarLabel: TabLabel,
        }}
      />
    </TopTabs>
  );
}

/**
 * The pill keeps its size in both states — only its fill changes — so the
 * focused and unfocused layers the tab bar cross-fades stay in register and the
 * icon never shifts as you swipe.
 */
function TabIcon({
  name,
  focused,
  color,
}: TabStateProps & { name: TabIconName }) {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.pill, focused && { backgroundColor: colors.primaryMuted }]}
    >
      <NativeHost>
        <Icon
          name={AppIcons[name]}
          size={TAB_ICON_SIZE}
          color={color as string}
        />
      </NativeHost>
    </View>
  );
}

function TabLabel({
  focused,
  color,
  children,
}: TabStateProps & { children: string }) {
  return (
    <Text
      variant="caption"
      numberOfLines={1}
      style={[styles.label, { color, fontWeight: focused ? "700" : "500" }]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: Spacing.xs,
    textAlign: "center",
    fontSize: TextStyles.caption.fontSize - 2,
  },
});
