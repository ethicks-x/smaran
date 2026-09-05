import { Icon } from "@expo/ui";
import { type ReactNode, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, RefreshControl, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcons } from "@/components/ui/icons";
import { NativeHost } from "@/components/ui/native-host";
import { Text } from "@/components/ui/text";
import { useScrollBackdrop } from "@/hooks/use-scroll-backdrop";
import { useThemeColors } from "@/hooks/use-theme";
import {
  HitSlop,
  MaxContentWidth,
  Radius,
  Spacing,
  scale,
  TouchTarget,
} from "@/theme";

export type ScreenProps = {
  /** Large heading announced first by screen readers. */
  title: string;
  /** One short sentence explaining the screen in plain language. */
  subtitle?: string;
  /** Rendered at the trailing end of the app bar — keep it to icon buttons. */
  headerAction?: ReactNode;
  /** Shows a back arrow at the leading end of the app bar. */
  onBack?: () => void;
  /**
   * Pins the app bar so the title, the back arrow and the actions stay put as
   * the page scrolls under them, and gives it the same background the status
   * bar strip gets: nothing at the top of the page, `surface` once anything has
   * moved under it.
   *
   * Off by default. The bar is normally part of the page and scrolls away with
   * it, which keeps the first screenful whole — a bar held back from a page
   * that fits without one is a band of chrome charged for nothing. Turn it on
   * where the page is a long list and the way out of it should not be several
   * flicks above the reader.
   */
  stickyHeader?: boolean;
  /** Set false for screens that manage their own scrolling or fill the frame. */
  scrollable?: boolean;
  /**
   * Makes the page pull-to-refresh. Called when the reader drags down from the
   * top; the spinner stays up until whatever it returns settles.
   *
   * Only ever an extra way to do something the app already does on its own —
   * never the only way to reach anything, which a gesture is not allowed to be
   * (`AGENTS.md` §2.3). Screens showing nothing but the phone's own settings
   * leave it off: a pull that cannot change what is on the page is a gesture
   * that teaches the reader it does nothing.
   *
   * Ignored when `scrollable` is false — there is nothing to pull.
   */
  onRefresh?: () => Promise<void> | void;
  /** Set false outside the tab navigator, where nothing covers the bottom
   * inset. Inside it the tab bar sits in the layout flow and owns that inset. */
  withTabBar?: boolean;
  children?: ReactNode;
};

/**
 * The standard page frame: an app bar, safe areas, comfortable gutters, and a
 * capped line length. Screens supply content only.
 *
 * Back, title and actions sit on one row, in the places every other app on the
 * phone puts them. The row itself is transparent — it is the top of the page,
 * not a lid on it — and what keeps the clock readable is the strip behind the
 * status bar, which fades in only once there is something under it
 * (`useScrollBackdrop`). `stickyHeader` extends that strip down over the whole
 * bar and holds the bar in place.
 */
export function Screen({
  title,
  subtitle,
  headerAction,
  onBack,
  stickyHeader = false,
  scrollable = true,
  onRefresh,
  withTabBar = true,
  children,
}: ScreenProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { onScroll, backdropStyle } = useScrollBackdrop();
  const [refreshing, setRefreshing] = useState(false);

  // The spinner is driven from here rather than by the caller, so a screen that
  // wants the gesture supplies the work and nothing else.
  const refresh = useCallback(() => {
    if (!onRefresh) {
      return;
    }

    setRefreshing(true);
    void Promise.resolve(onRefresh()).finally(() => setRefreshing(false));
  }, [onRefresh]);

  const backdrop = [
    styles.backdrop,
    { backgroundColor: colors.surface, borderBottomColor: colors.border },
    backdropStyle,
  ];

  const bar = (
    <View style={styles.bar}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={HitSlop}
          accessibilityRole="button"
          accessibilityLabel={t("common.goBack")}
          style={({ pressed }) => [
            styles.back,
            { backgroundColor: colors.surfaceMuted },
            pressed && styles.pressed,
          ]}
        >
          <NativeHost>
            <Icon name={AppIcons.back} size={scale(28)} color={colors.text} />
          </NativeHost>
        </Pressable>
      ) : null}

      <View style={styles.barText}>
        <Text variant="heading" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>

      {headerAction}
    </View>
  );

  const padding = {
    paddingTop: (stickyHeader ? 0 : insets.top) + Spacing.lg,
    paddingBottom: Spacing["2xl"],
  };

  const body = (
    <View style={styles.content}>
      {stickyHeader ? null : bar}
      {children}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {stickyHeader ? (
        <View style={[styles.stickyBar, { paddingTop: insets.top }]}>
          <Animated.View style={[backdrop, styles.fill]} pointerEvents="none" />
          {bar}
        </View>
      ) : null}

      {scrollable ? (
        <Animated.ScrollView
          style={styles.scroller}
          contentContainerStyle={[styles.centerer, padding]}
          onScroll={onScroll}
          scrollEventThrottle={16}
          // Older readers often enlarge system text; never trap content off-screen.
          showsVerticalScrollIndicator={false}
          // Screens with fields in them: the keyboard shrinks the scrollable area
          // rather than covering the line being typed, and a tap outside a field
          // still lands on whatever was tapped.
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                // The spinner lands under a bar that is part of the page, so it
                // starts below the inset rather than behind the clock.
                progressViewOffset={insets.top}
                accessibilityLabel={t("common.refresh")}
                // iOS draws the words; Android has no room for them.
                title={t("common.refresh")}
                titleColor={colors.textSecondary}
                tintColor={colors.primary}
                colors={[colors.primary]}
                progressBackgroundColor={colors.surface}
              />
            ) : undefined
          }
        >
          {body}
        </Animated.ScrollView>
      ) : (
        <View style={[styles.scroller, styles.centerer, padding]}>{body}</View>
      )}

      {/* Only where the bar is not already covering the inset itself. */}
      {stickyHeader ? null : (
        <Animated.View
          style={[backdrop, { height: insets.top }]}
          pointerEvents="none"
        />
      )}

      {/* Outside the tabs there is no bar to paint the gesture area, so the
          page paints it — content stops at the inset instead of sliding into
          the strip the system reserves for itself. */}
      {withTabBar ? null : (
        <View
          style={{ height: insets.bottom, backgroundColor: colors.surface }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stickyBar: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  bar: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    minHeight: TouchTarget.min,
  },
  barText: {
    flex: 1,
    gap: Spacing.xs,
  },
  fill: {
    bottom: 0,
  },
  scroller: {
    flex: 1,
  },
  centerer: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  content: {
    width: "100%",
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    gap: Spacing.xl,
  },
  back: {
    width: TouchTarget.min,
    height: TouchTarget.min,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
});
