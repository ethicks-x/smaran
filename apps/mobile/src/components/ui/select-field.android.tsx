import { Icon } from "@expo/ui";
import {
  Text as ComposeText,
  DropdownMenuItem,
  ExposedDropdownMenu,
  ExposedDropdownMenuBox,
  OutlinedTextField,
  Shape,
  type TextFieldRef,
} from "@expo/ui/jetpack-compose";
import {
  fillMaxWidth,
  menuAnchor,
  onVisibilityChanged,
} from "@expo/ui/jetpack-compose/modifiers";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppIcons } from "@/components/ui/icons";
import { NativeHost } from "@/components/ui/native-host";
import type {
  SelectFieldProps,
  SelectOption,
} from "@/components/ui/select-field-props";
import { Text } from "@/components/ui/text";
import { useTextScale, useThemeColors } from "@/hooks/use-theme";
import { Radius, Spacing, scale, TextStyles, TouchTarget } from "@/theme";

export type { SelectFieldProps, SelectOption };

const CHEVRON = scale(28);

/**
 * The card radius the rest of the form's rows are drawn with. Called rather
 * than written as JSX: the shape helpers return a branded element type that
 * only survives a direct call, and `shape` will not take a plain `Element`.
 */
const CORNERS = Shape.RoundedCorner({
  cornerRadii: {
    topStart: Radius.md,
    topEnd: Radius.md,
    bottomStart: Radius.md,
    bottomEnd: Radius.md,
  },
});

/**
 * One answer from a short list, in Android's own Material 3 exposed dropdown
 * menu.
 *
 * This replaces `select-field.tsx` on Android — the shared file uses `Picker`,
 * whose Compose anchor takes its fill and its width from the Material theme
 * rather than from ours (D-43). Left alone that anchor is a tonal container the
 * palette never chose, sitting at Material's own width beside two of our
 * full-width rows. The menu is worth keeping and the colours are not, so the
 * same Compose pieces `Picker` is built from are assembled here with Smaran's
 * tokens passed in and `fillMaxWidth` on the anchor.
 *
 * The result matches `TextField` and `FieldTrigger` on the same form: a caption
 * label above, a full-width outlined row a touch target tall, and a chevron
 * that says the row opens something.
 */
export function SelectField<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: SelectFieldProps<T>) {
  const colors = useThemeColors();
  const textScale = useTextScale();
  const [expanded, setExpanded] = useState(false);
  const [shown, setShown] = useState(false);
  const anchor = useRef<TextFieldRef>(null);

  const selected =
    options.find((option) => option.value === value)?.label ?? "";
  const fontSize = Math.round(TextStyles.bodyLarge.fontSize * textScale);

  // The anchor field holds its own text natively, so the chosen label has to be
  // pushed into it — and only once the view is actually on screen, or the write
  // lands on nothing.
  useEffect(() => {
    if (shown) {
      anchor.current?.setText(selected);
    }
  }, [selected, shown]);

  return (
    <View style={styles.field}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>

      <NativeHost
        matchContents={{ vertical: true }}
        style={styles.host}
        accessibilityLabel={label}
      >
        <ExposedDropdownMenuBox
          expanded={expanded}
          onExpandedChange={setExpanded}
          modifiers={[fillMaxWidth()]}
        >
          <OutlinedTextField
            ref={anchor}
            readOnly
            singleLine
            modifiers={[
              menuAnchor(),
              fillMaxWidth(),
              onVisibilityChanged(setShown),
            ]}
            shape={CORNERS}
            textStyle={{ fontSize, color: colors.text, fontWeight: "500" }}
            colors={{
              focusedTextColor: colors.text,
              unfocusedTextColor: colors.text,
              focusedContainerColor: colors.surface,
              unfocusedContainerColor: colors.surface,
              focusedIndicatorColor: colors.primary,
              unfocusedIndicatorColor: colors.border,
              focusedTrailingIconColor: colors.primary,
              unfocusedTrailingIconColor: colors.primary,
            }}
          >
            <OutlinedTextField.TrailingIcon>
              <Icon
                name={AppIcons.chevronDown}
                size={CHEVRON}
                color={colors.primary}
              />
            </OutlinedTextField.TrailingIcon>
          </OutlinedTextField>

          <ExposedDropdownMenu
            expanded={expanded}
            onDismissRequest={() => setExpanded(false)}
            containerColor={colors.surfaceRaised}
          >
            {options.map((option) => (
              <DropdownMenuItem
                key={option.value}
                elementColors={{ textColor: colors.text }}
                onClick={() => {
                  onChange(option.value);
                  setExpanded(false);
                }}
              >
                <DropdownMenuItem.Text>
                  <ComposeText color={colors.text} style={{ fontSize }}>
                    {option.label}
                  </ComposeText>
                </DropdownMenuItem.Text>
              </DropdownMenuItem>
            ))}
          </ExposedDropdownMenu>
        </ExposedDropdownMenuBox>
      </NativeHost>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.xs,
  },
  host: {
    alignSelf: "stretch",
    // The Material field is already a full row tall; this is the floor it is
    // not allowed to fall below at a small `UIScale`.
    minHeight: TouchTarget.comfortable,
    width: "100%",
  },
});
