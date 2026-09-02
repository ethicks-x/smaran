import {
  AlertDialog,
  Text as ComposeText,
  DatePickerDialog,
  type DatePickerElementColors,
  DateTimePicker,
  TextButton,
  type TimePickerElementColors,
} from "@expo/ui/jetpack-compose";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native";

import { NativeHost } from "@/components/ui/native-host";
import type { SchedulePickerProps } from "@/components/ui/schedule-picker-props";
import { useTextScale, useThemeColors } from "@/hooks/use-theme";
import { TextStyles } from "@/theme";

export type { SchedulePickerProps };

/**
 * A date or a time of day, picked with Android's own Material 3 dialogs — the
 * calendar for a date, the clock for a time.
 *
 * This replaces `schedule-picker.tsx` on Android, which is the point: the
 * platform dialog is the one the reader has already met in every clock and
 * calendar app on the phone, it is translated and it grows with their system
 * text size, and the accessibility services already know it. `NativeHost` hands
 * it Smaran's colour scheme, and every element colour below is named outright
 * so the dialog arrives in the app's own palette rather than in tones Material
 * generated from the seed (D-43).
 *
 * The clock dial D-25 warns about is still here, and it is Material's. Its
 * numbers are tapped, not only dragged, so a hand that cannot finish a drag can
 * still set a time — but the keyboard-entry toggle that used to sit beside it
 * is gone with the library's own dialog (D-44), and a typed time with it.
 *
 * The host draws nothing itself: a dialog is a window, so the view it is
 * anchored to has no size and no place in the layout.
 */
export function SchedulePicker({
  visible,
  mode,
  value,
  title,
  hour12,
  minimum,
  onChange,
  onClose,
}: SchedulePickerProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const textScale = useTextScale();

  // The clock reports every drag and tap as it happens, but the reader has not
  // chosen a time until they say so — so the last time it reported is held here
  // and only handed over by "Done". Anything else and cancelling would still
  // have changed the reminder.
  const picked = useRef(value);

  useEffect(() => {
    if (visible) {
      picked.current = value;
    }
  }, [visible, value]);

  if (!visible) {
    return null;
  }

  // Every colour the dialog paints is named here rather than left to Material.
  // A seeded palette generates its own containers and its own "on" colours,
  // and those arrive as tones next to the app's own — a tinted card behind a
  // Smaran card, and a contrast ratio nobody checked. These are the tokens
  // D-03 already cleared, in the roles the Material dialog asks for.
  const elementColors: DatePickerElementColors & TimePickerElementColors = {
    containerColor: colors.surfaceRaised,
    titleContentColor: colors.textSecondary,
    headlineContentColor: colors.text,
    weekdayContentColor: colors.textSecondary,
    subheadContentColor: colors.textSecondary,
    navigationContentColor: colors.primary,
    yearContentColor: colors.text,
    currentYearContentColor: colors.primary,
    selectedYearContentColor: colors.onPrimary,
    selectedYearContainerColor: colors.primary,
    dayContentColor: colors.text,
    selectedDayContentColor: colors.onPrimary,
    selectedDayContainerColor: colors.primary,
    todayContentColor: colors.primary,
    todayDateBorderColor: colors.primary,
    dividerColor: colors.border,

    clockDialColor: colors.surfaceMuted,
    clockDialSelectedContentColor: colors.onPrimary,
    clockDialUnselectedContentColor: colors.text,
    selectorColor: colors.primary,
    periodSelectorBorderColor: colors.border,
    periodSelectorSelectedContainerColor: colors.primary,
    periodSelectorUnselectedContainerColor: colors.surface,
    periodSelectorSelectedContentColor: colors.onPrimary,
    periodSelectorUnselectedContentColor: colors.text,
    timeSelectorSelectedContainerColor: colors.primaryMuted,
    timeSelectorUnselectedContainerColor: colors.surfaceMuted,
    timeSelectorSelectedContentColor: colors.primary,
    timeSelectorUnselectedContentColor: colors.text,
  };

  const chose = (chosen: Date) => {
    onChange(chosen);
    onClose();
  };

  const labelSize = Math.round(TextStyles.label.fontSize * textScale);

  return (
    <NativeHost matchContents={false} style={styles.host}>
      {mode === "date" ? (
        <DatePickerDialog
          initialDate={value.toISOString()}
          color={colors.primary}
          elementColors={elementColors}
          confirmButtonLabel={t("common.done")}
          dismissButtonLabel={t("common.cancel")}
          selectableDates={minimum ? { start: minimum } : undefined}
          onDateSelected={chose}
          onDismissRequest={onClose}
        />
      ) : (
        // The clock is Material's own, but the card around it is ours. The
        // library's `TimePickerDialog` builds its own `AlertDialog` and never
        // passes it a container colour, so that card is whatever tone Compose
        // generated from the seed — a pink surface under a rose highlight, and
        // a different one per highlight. `DatePickerDialog` takes `colors` and
        // needs no such treatment, which is why only this branch is assembled
        // by hand: the same Material clock, in a dialog we colour ourselves.
        <AlertDialog
          onDismissRequest={onClose}
          colors={{
            containerColor: colors.surfaceRaised,
            titleContentColor: colors.text,
            textContentColor: colors.text,
          }}
        >
          <AlertDialog.Title>
            <ComposeText
              color={colors.text}
              style={{
                fontSize: Math.round(TextStyles.heading.fontSize * textScale),
              }}
            >
              {title}
            </ComposeText>
          </AlertDialog.Title>

          <AlertDialog.Text>
            <DateTimePicker
              initialDate={value.toISOString()}
              displayedComponents="hourAndMinute"
              is24Hour={!hour12}
              color={colors.primary}
              elementColors={elementColors}
              onDateSelected={(chosen) => {
                picked.current = chosen;
              }}
            />
          </AlertDialog.Text>

          <AlertDialog.ConfirmButton>
            <TextButton onClick={() => chose(picked.current)}>
              <ComposeText
                color={colors.primary}
                style={{ fontSize: labelSize }}
              >
                {t("common.done")}
              </ComposeText>
            </TextButton>
          </AlertDialog.ConfirmButton>

          <AlertDialog.DismissButton>
            <TextButton onClick={onClose}>
              <ComposeText
                color={colors.primary}
                style={{ fontSize: labelSize }}
              >
                {t("common.cancel")}
              </ComposeText>
            </TextButton>
          </AlertDialog.DismissButton>
        </AlertDialog>
      )}
    </NativeHost>
  );
}

const styles = StyleSheet.create({
  host: {
    width: 0,
    height: 0,
  },
});
