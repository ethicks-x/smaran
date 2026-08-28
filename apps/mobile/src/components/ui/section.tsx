import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/text";
import { Spacing } from "@/theme";

export type SectionProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

/** A titled group of related content within a screen. */
export function Section({ title, description, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text variant="heading" accessibilityRole="header">
          {title}
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
  section: {
    gap: Spacing.lg,
  },
  heading: {
    gap: Spacing.xs,
  },
});
