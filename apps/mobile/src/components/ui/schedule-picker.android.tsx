import { DatePickerDialog, TimePickerDialog } from "@expo/ui/jetpack-compose";
import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native";

import { NativeHost } from "@/components/ui/native-host";
import type { SchedulePickerProps } from "@/components/ui/schedule-picker-props";
import { useThemeColors } from "@/hooks/use-theme";

export type { SchedulePickerProps };

/**
 * A date or a time of day, picked with Android's own Material 3 dialogs — the
 * calendar for a date, the clock for a time.
 *
 * This replaces `schedule-picker.tsx` on Android, which is the point: the
 * platform dialog is the one the reader has already met in every clock and
 * calendar app on the phone, it is translated and it grows with their system
 * text size, and the accessibility services already know it. `NativeHost` hands
 * it Smaran's colour scheme so it arrives in the app's colours (D-43).
 *
 * The clock dial D-25 warns about is still here — it is Material's, and it comes
 * with the keyboard entry toggle beside it, which is the tap-only way through
 * for a hand that cannot finish a drag. That toggle, not a control of our own,
 * is what answers the tremor case on this platform.
 *
 * The host draws nothing itself: a dialog is a window, so the view it is
 * anchored to has no size and no place in the layout.
 */
export function SchedulePicker({
	visible,
	mode,
	value,
	hour12,
	minimum,
	onChange,
	onClose,
}: SchedulePickerProps) {
	const { t } = useTranslation();
	const colors = useThemeColors();

	if (!visible) {
		return null;
	}

	const shared = {
		initialDate: value.toISOString(),
		color: colors.primary,
		confirmButtonLabel: t("common.done"),
		dismissButtonLabel: t("common.cancel"),
		onDismissRequest: onClose,
	};

	const chose = (picked: Date) => {
		onChange(picked);
		onClose();
	};

	return (
		<NativeHost matchContents={false} style={styles.host}>
			{mode === "date" ? (
				<DatePickerDialog
					{...shared}
					selectableDates={minimum ? { start: minimum } : undefined}
					onDateSelected={chose}
				/>
			) : (
				<TimePickerDialog
					{...shared}
					is24Hour={!hour12}
					onDateSelected={chose}
				/>
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
