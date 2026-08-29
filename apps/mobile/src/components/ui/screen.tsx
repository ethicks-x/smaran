import { Icon } from "@expo/ui";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcons } from "@/components/ui/icons";
import { NativeHost } from "@/components/ui/native-host";
import { Text } from "@/components/ui/text";
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
  /** Rendered next to the title — keep it to a single icon button. */
  headerAction?: ReactNode;
  /** Shows a labelled back control above the title on pushed screens. */
  onBack?: () => void;
  /** Set false for screens that manage their own scrolling or fill the frame. */
  scrollable?: boolean;
  /** Set false outside the tab navigator, where nothing covers the bottom
   * inset. Inside it the tab bar sits in the layout flow and owns that inset. */
  withTabBar?: boolean;
  children?: ReactNode;
};

/**
 * The standard page frame: safe areas, a single large title, comfortable
 * gutters, and a capped line length. Screens supply content only.
 */
export function Screen({
  title,
  subtitle,
  headerAction,
  onBack,
  scrollable = true,
  withTabBar = true,
  children,
}: ScreenProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const header = (
    <View style={styles.headerBlock}>
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
            <Icon name={AppIcons.back} size={scale(26)} color={colors.text} />
          </NativeHost>
          <Text variant="label">{t("common.back")}</Text>
        </Pressable>
      ) : null}

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="bodyLarge" color="textSecondary">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {headerAction}
      </View>
    </View>
  );

  const content = (
    <View style={styles.content}>
      {header}
      {children}
    </View>
  );

  const padding = {
    paddingTop: insets.top + Spacing.lg,
    paddingBottom: Spacing["2xl"] + (withTabBar ? 0 : insets.bottom),
  };

  if (!scrollable) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.centerer, padding]}>{content}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.centerer, padding]}
      // Older readers often enlarge system text; never trap content off-screen.
      showsVerticalScrollIndicator={false}
      // Screens with fields in them: the keyboard shrinks the scrollable area
      // rather than covering the line being typed, and a tap outside a field
      // still lands on whatever was tapped.
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
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
  headerBlock: {
    gap: Spacing.lg,
  },
  back: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    minHeight: TouchTarget.min,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.lg,
    borderRadius: Radius.pill,
  },
  pressed: {
    opacity: 0.6,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.lg,
  },
  headerText: {
    flex: 1,
    gap: Spacing.xs,
  },
});
