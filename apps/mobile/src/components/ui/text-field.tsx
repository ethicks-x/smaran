import { useState } from "react";
import { StyleSheet, TextInput, type TextInputProps, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useTextScale, useThemeColors } from "@/hooks/use-theme";
import { Radius, Spacing, TextStyles, TouchTarget } from "@/theme";

export type TextFieldProps = Omit<
  TextInputProps,
  "style" | "placeholderTextColor" | "value" | "onChangeText"
> & {
  /** Always visible above the field — never a placeholder standing in for it. */
  label: string;
  /** One short line saying what belongs here. */
  hint?: string;
  value: string;
  onChangeText: (value: string) => void;
};

/**
 * A single line of text the reader can change.
 *
 * The label sits above the box and stays there while typing: a placeholder that
 * disappears on the first keystroke asks the reader to remember what they were
 * answering, which is the one thing this app never asks of anyone. The box is a
 * full row tall, and the border turns the primary colour on focus so the
 * question being answered is obvious from across the room.
 */
export function TextField({
  label,
  hint,
  value,
  onChangeText,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const colors = useThemeColors();
  const textScale = useTextScale();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        accessibilityLabel={label}
        accessibilityHint={hint}
        selectionColor={colors.primary}
        // The reader's text size choice applies to typed text as well; `Text`
        // does this for every other string in the app.
        maxFontSizeMultiplier={1.8}
        style={[
          styles.input,
          {
            fontSize: Math.round(TextStyles.bodyLarge.fontSize * textScale),
            backgroundColor: colors.surface,
            borderColor: focused ? colors.primary : colors.border,
            color: colors.text,
          },
        ]}
        {...rest}
      />

      {hint ? (
        <Text variant="caption" color="textSecondary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.xs,
  },
  input: {
    minHeight: TouchTarget.comfortable,
    borderRadius: Radius.md,
    borderWidth: 2,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontWeight: "500",
  },
});
