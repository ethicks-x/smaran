/**
 * The props both schedule pickers take.
 *
 * They live apart from either implementation because Metro swaps the whole
 * module on Android, and a file cannot import a type from itself.
 */
export type SchedulePickerProps = {
	visible: boolean;
	mode: "date" | "time";
	/** The moment the picker opens on, and the one it edits. */
	value: Date;
	/** Names the picker where the platform's dialog has no headline of its own. */
	title: string;
	/** True where the reader's language writes 9 pm rather than 21:00. */
	hour12: boolean;
	/** The earliest date worth offering, in `date` mode. */
	minimum?: Date;
	onChange: (value: Date) => void;
	onClose: () => void;
};
