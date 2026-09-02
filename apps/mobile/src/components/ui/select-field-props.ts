/**
 * The props both select fields take.
 *
 * They live apart from either implementation because Metro swaps the whole
 * module on Android, and a file cannot import a type from itself.
 */
export type SelectOption<T extends string | number> = {
  value: T;
  label: string;
};

export type SelectFieldProps<T extends string | number> = {
  /** Names the question, e.g. "What is it for". Stays above the control. */
  label: string;
  options: readonly SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
};
