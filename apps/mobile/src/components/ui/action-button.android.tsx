import {
  Button as ComposeButton,
  Text as ComposeText,
  type TextProps as ComposeTextProps,
  OutlinedButton,
  Shape,
  TextButton,
} from "@expo/ui/jetpack-compose";
import { fillMaxWidth, height } from "@expo/ui/jetpack-compose/modifiers";
import { StyleSheet, type TextStyle } from "react-native";

import type { ActionButtonProps } from "@/components/ui/action-button-props";
import { NativeHost } from "@/components/ui/native-host";
import { useBoldText, useTextScale, useThemeColors } from "@/hooks/use-theme";
import { boldWeight, Radius, TextStyles, TouchTarget } from "@/theme";

export type { ActionButtonProps };

/** The card radius every other row on a screen is drawn with. Called rather
 * than written as JSX, like `SelectField`'s: the shape helpers return a branded
 * element type that only survives a direct call. */
const CORNERS = Shape.RoundedCorner({
  cornerRadii: {
    topStart: Radius.md,
    topEnd: Radius.md,
    bottomStart: Radius.md,
    bottomEnd: Radius.md,
  },
});

const TRANSPARENT = "#00000000";

/**
 * The same button on Android, told every colour it paints.
 *
 * This replaces `action-button.tsx` on Android for the same reason
 * `select-field.android.tsx` replaces its shared file (D-43, D-44): a Compose
 * `Button` fills itself from the Material theme the host seeds, and the
 * `backgroundColor` the shared file passed became a `background` **modifier**,
 * which paints the box *behind* the button rather than the button. A filled
 * danger button came out as the seed's own green pill with a red rim around it.
 *
 * Material 3 has the right seam for this and it is `colors`: container and
 * content, both taken from Smaran's tokens, which is also what keeps the label
 * at the contrast the palette documents (§2.3). The disabled pair is given
 * explicitly too — Compose's own default is the content colour at 38% opacity,
 * which lands under 3:1 on any of our fills.
 */
export function ActionButton({
  label,
  onPress,
  variant = "filled",
  tone = "primary",
  size = "comfortable",
  disabled,
  accessibilityLabel,
}: ActionButtonProps) {
  const colors = useThemeColors();
  const textScale = useTextScale();
  const bold = useBoldText();

  const box = TouchTarget[size];
  const accent = tone === "danger" ? colors.danger : colors.primary;
  const onAccent = tone === "danger" ? colors.onDanger : colors.onPrimary;
  const filled = variant === "filled";

  const Component = VARIANTS[variant];
  const base = TextStyles.label;
  const content = disabled ? colors.textMuted : filled ? onAccent : accent;

  return (
    <NativeHost
      matchContents={{ vertical: true }}
      style={[styles.host, { height: box }]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Component
        onClick={onPress}
        enabled={!disabled}
        shape={CORNERS}
        modifiers={[fillMaxWidth(), height(box)]}
        colors={{
          containerColor: filled ? accent : TRANSPARENT,
          contentColor: filled ? onAccent : accent,
          // A button nobody may press still has to be readable — it is telling
          // the reader what is not available, and a ghost of a label says only
          // that something has gone wrong with the screen.
          disabledContainerColor: filled ? colors.surfaceMuted : TRANSPARENT,
          disabledContentColor: colors.textMuted,
        }}
      >
        <ComposeText
          color={content}
          style={{
            fontSize: Math.round(base.fontSize * textScale),
            fontWeight: weightOf(
              bold ? boldWeight(base.fontWeight) : base.fontWeight,
            ),
          }}
        >
          {label}
        </ComposeText>
      </Component>
    </NativeHost>
  );
}

/** Compose's own weight union, which the package does not export by name. */
type ComposeWeight = NonNullable<
  NonNullable<ComposeTextProps["style"]>["fontWeight"]
>;

/**
 * Our weights as Compose spells them. The type scale only ever uses the numeric
 * ones, so anything else is a weight this file does not know and the label's
 * own semibold is the safe answer.
 */
const WEIGHTS: Record<string, ComposeWeight> = {
  "100": "100",
  "200": "200",
  "300": "300",
  "400": "400",
  "500": "500",
  "600": "600",
  "700": "700",
  "800": "800",
  "900": "900",
};

function weightOf(weight: TextStyle["fontWeight"]): ComposeWeight {
  return WEIGHTS[String(weight)] ?? "600";
}

const VARIANTS = {
  filled: ComposeButton,
  outlined: OutlinedButton,
  text: TextButton,
} as const;

const styles = StyleSheet.create({
  host: {
    width: "100%",
  },
});
