/**
 * The props both action buttons take.
 *
 * They live apart from either implementation because Metro swaps the whole
 * module on Android, and a file cannot import a type from itself — the same
 * split `select-field-props.ts` makes.
 */
export type ActionButtonProps = {
  label: string;
  onPress: () => void;
  /** Visual weight. One `filled` button per screen keeps the choice obvious. */
  variant?: "filled" | "outlined" | "text";
  /** `danger` is reserved for calling for help. */
  tone?: "primary" | "danger";
  /** `large` is for the single most important action on a screen. */
  size?: "comfortable" | "large";
  disabled?: boolean;
  accessibilityLabel?: string;
};
