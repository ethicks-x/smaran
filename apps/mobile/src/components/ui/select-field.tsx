import { Picker } from "@expo/ui";
import { StyleSheet, View } from "react-native";

import { NativeHost } from "@/components/ui/native-host";
import type {
  SelectFieldProps,
  SelectOption,
} from "@/components/ui/select-field-props";
import { Text } from "@/components/ui/text";
import { Spacing, TouchTarget } from "@/theme";

export type { SelectFieldProps, SelectOption };

/**
 * One answer from a short list, in the platform's own dropdown — a Material 3
 * exposed dropdown menu on Android, a SwiftUI picker on iOS.
 *
 * The platform control is the right one here for the same reason `ActionButton`
 * uses a native button: it is the widget the reader has already met everywhere
 * else on the phone, it grows with their system text size, and it hands the
 * whole open-and-choose interaction to the accessibility services rather than
 * to something we reimplemented. `NativeHost` gives it Smaran's colour scheme,
 * so it is the platform's shape in the app's colours.
 *
 * Android replaces this file with `select-field.android.tsx`, which builds the
 * same Material 3 dropdown out of its own pieces so the fill, the width and the
 * type all come from Smaran's tokens rather than from the Material theme.
 *
 * `ChoiceGroup` is still the control for a screen that asks one question and can
 * afford to spell every option out. This is the form case, where four
 * full-width rows per question would push the last question below the fold.
 */
export function SelectField<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: SelectFieldProps<T>) {
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
        <Picker selectedValue={value} onValueChange={onChange}>
          {options.map((option) => (
            <Picker.Item
              key={option.value}
              label={option.label}
              value={option.value}
            />
          ))}
        </Picker>
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
    // The platform's own field is already a full row tall; this is the floor it
    // is not allowed to fall below at a small `UIScale`.
    minHeight: TouchTarget.comfortable,
    width: "100%",
  },
});
