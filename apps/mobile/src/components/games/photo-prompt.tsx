import { Icon } from "@expo/ui";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { KIND_ICON } from "@/components/memories/kinds";
import { AppIcons, NativeHost } from "@/components/ui";
import type { MemorySubjectKind } from "@/db/schema";
import { useThemeColors } from "@/hooks/use-theme";
import { Radius, scale } from "@/theme";

/** Big enough to recognise a face at arm's length, capped so a tablet does not turn the
 * photograph into the whole screen with the question pushed off the bottom. */
const MAX_SIZE = scale(320);

const PLACEHOLDER_ICON = scale(64);

export type PhotoPromptProps = {
  /** A path into the media cache, never a URL — this draws with the radio off. */
  photoUri: string | null;
  kind: MemorySubjectKind;
  /**
   * What a screen reader hears. It must **not** name who or what is in the picture: this
   * is the thing being asked about, and a label carrying the answer would read the answer
   * out before the question.
   */
  label: string;
};

/**
 * The photograph a question is about, shown large above it.
 *
 * Square, so a row of these across a round is the same shape every time whatever shape the
 * family's photographs are, and the face fills the frame rather than sitting in a
 * letterbox with margins either side.
 *
 * Not tappable, and there is nothing to tap it for. The answers are somewhere else on the
 * screen — this is the question.
 */
export function PhotoPrompt({ photoUri, kind, label }: PhotoPromptProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.frame,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
      ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={styles.photo}
          contentFit="cover"
          // Already on disk, so there is nothing to fade in from.
          transition={0}
        />
      ) : (
        <NativeHost>
          <Icon
            name={AppIcons[KIND_ICON[kind]]}
            size={PLACEHOLDER_ICON}
            color={colors.textSecondary}
          />
        </NativeHost>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: "center",
    width: "100%",
    maxWidth: MAX_SIZE,
    aspectRatio: 1,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 3,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
});
