import { Icon } from "@expo/ui";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { type AppIconName, AppIcons } from "@/components/ui/icons";
import { NativeHost } from "@/components/ui/native-host";
import { Surface } from "@/components/ui/surface";
import { Text } from "@/components/ui/text";
import { useThemeColors } from "@/hooks/use-theme";
import { Radius, Spacing, scale } from "@/theme";

const BADGE_SIZE = scale(52);
const BADGE_ICON = scale(28);

export type SettingCardProps = {
  icon: AppIconName;
  title: string;
  /** One short line saying what the choice below actually does. */
  description?: string;
  children: ReactNode;
};

/**
 * One setting, raised off the page: a tinted icon beside its name, a line of
 * plain explanation, and the control itself underneath.
 *
 * The icon is a landmark rather than a decoration — a reader who has been here
 * before finds the text size dial by looking for the letter tile, without
 * reading three headings to get there. It is never the only cue: the heading
 * beside it says the same thing in words.
 */
export function SettingCard({
  icon,
  title,
  description,
  children,
}: SettingCardProps) {
  const colors = useThemeColors();

  return (
    <Surface elevated style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: colors.primaryMuted }]}>
          <NativeHost>
            <Icon
              name={AppIcons[icon]}
              size={BADGE_ICON}
              color={colors.primary}
            />
          </NativeHost>
        </View>

        <View style={styles.headerText}>
          <Text variant="heading" accessibilityRole="header">
            {title}
          </Text>
          {description ? (
            <Text variant="caption" color="textSecondary">
              {description}
            </Text>
          ) : null}
        </View>
      </View>

      {children}
    </Surface>
  );
}

export type SettingFieldProps = {
  label: string;
  description?: string;
  children: ReactNode;
};

/**
 * One dial inside a card that holds more than one, named by a quiet label above
 * it. The card's heading says what the group is for; this says which of its two
 * questions is being answered.
 */
export function SettingField({
  label,
  description,
  children,
}: SettingFieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldText}>
        <Text variant="label" color="textSecondary" accessibilityRole="header">
          {label}
        </Text>
        {description ? (
          <Text variant="caption" color="textSecondary">
            {description}
          </Text>
        ) : null}
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    gap: Spacing.xs,
  },
  field: {
    gap: Spacing.md,
  },
  fieldText: {
    gap: Spacing.xs,
  },
});
