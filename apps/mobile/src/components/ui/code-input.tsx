import { StyleSheet, TextInput, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useThemeColors } from "@/hooks/use-theme";
import { Radius, Spacing, scale, TouchTarget } from "@/theme";

/**
 * How a single box should read: untyped, plain, right, right-letter-wrong-box,
 * or not in the answer at all.
 */
export type CodeBoxStatus =
  | "empty"
  | "filled"
  | "correct"
  | "present"
  | "absent";

export type CodeInputProps = {
  /** How many boxes to draw. */
  length: number;
  value: string;
  onChangeText: (value: string) => void;
  /** Status per box, index-aligned. Defaults to plain filled/empty. */
  statuses?: CodeBoxStatus[];
  /** Drawn in an empty box — one per index, e.g. a space or a hint letter. */
  placeholders?: (string | undefined)[];
  autoFocus?: boolean;
  editable?: boolean;
  accessibilityLabel?: string;
};

const BOX_WIDTH = scale(64);
const BOX_HEIGHT = scale(80);

/**
 * One box per character, with a single invisible field laid over them
 * collecting the keystrokes. Splitting the answer into boxes shows how much is
 * left to type without asking anyone to count, and because the real field is
 * the thing being tapped, the keyboard opens the way it does anywhere else.
 */
export function CodeInput({
  length,
  value,
  onChangeText,
  statuses,
  placeholders,
  autoFocus = true,
  editable = true,
  accessibilityLabel,
}: CodeInputProps) {
  const colors = useThemeColors();

  const boxes = Array.from({ length }, (_, index) => index);
  /** Where the next letter will land — the box that reads as "type here". */
  const active = Math.min(value.length, length - 1);

  return (
    <View style={styles.row}>
      {boxes.map((index) => {
        const character = value[index];
        const status = statuses?.[index] ?? (character ? "filled" : "empty");
        const isActive = editable && index === active && !character;

        return (
          <View
            key={index}
            style={[
              styles.box,
              {
                backgroundColor: backgroundFor(status, colors),
                borderColor: isActive
                  ? colors.primary
                  : borderFor(status, colors),
              },
            ]}
          >
            <Text variant="title" color={textFor(status)} center>
              {character ?? placeholders?.[index] ?? ""}
            </Text>
          </View>
        );
      })}

      {/* Invisible, but on top and full size: opacity does not affect touch
          handling, so every tap on a box lands on the field itself. An
          off-screen field would take the text but never the tap. */}
      <TextInput
        value={value}
        onChangeText={(next) => onChangeText(next.slice(0, length))}
        maxLength={length}
        editable={editable}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        caretHidden
        importantForAutofill="no"
        accessibilityLabel={accessibilityLabel}
        style={[StyleSheet.absoluteFill, styles.field]}
      />
    </View>
  );
}

const backgroundFor = (
  status: CodeBoxStatus,
  colors: ReturnType<typeof useThemeColors>,
) => {
  switch (status) {
    case "correct":
      return colors.successMuted;
    case "present":
      return colors.warningMuted;
    case "absent":
      return colors.dangerMuted;
    case "filled":
      return colors.surface;
    default:
      return colors.surfaceMuted;
  }
};

const borderFor = (
  status: CodeBoxStatus,
  colors: ReturnType<typeof useThemeColors>,
) => {
  switch (status) {
    case "correct":
      return colors.success;
    case "present":
      return colors.warning;
    case "absent":
      return colors.danger;
    default:
      return colors.border;
  }
};

const textFor = (status: CodeBoxStatus) => {
  switch (status) {
    case "correct":
      return "success" as const;
    case "present":
      return "warning" as const;
    case "absent":
      return "danger" as const;
    default:
      return "text" as const;
  }
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  box: {
    width: BOX_WIDTH,
    height: Math.max(BOX_HEIGHT, TouchTarget.min),
    borderRadius: Radius.md,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  field: {
    opacity: 0,
  },
});
