import { Icon } from "@expo/ui";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { KIND_ICON } from "@/components/memories/kinds";
import { AppIcons, NativeHost, Surface, Text } from "@/components/ui";
import type { MemorySubjectRow } from "@/db/schema";
import { useThemeColors } from "@/hooks/use-theme";
import { Spacing, scale } from "@/theme";

const PLACEHOLDER_ICON = scale(52);

export type SubjectCardProps = {
  subject: MemorySubjectRow;
  /** Read aloud in place of a missing photograph, and by a screen reader. */
  missingPhotoLabel: string;
};

/**
 * One person, place or object: their photograph, their name, and who or what
 * they are to the reader.
 *
 * **Not tappable, and that is the design.** There is nowhere for a tap to go —
 * a subject has no detail worth a second screen — and a card that looks
 * pressable and does nothing teaches a reader with dementia that this app does
 * not respond to them. It is here to be looked at and recognised.
 *
 * The picture comes off local flash: `photoUri` is a path into the media cache,
 * written there by sync, and this component never touches a URL
 * (`AGENTS.md` §2.1). A subject whose photograph has not arrived — no signal
 * yet, or none was ever uploaded — draws the category's own mark instead, so the
 * card keeps its shape and the name underneath is unaffected.
 */
export function SubjectCard({ subject, missingPhotoLabel }: SubjectCardProps) {
  const colors = useThemeColors();

  return (
    <Surface padded={false} style={styles.card}>
      <View style={[styles.frame, { backgroundColor: colors.surfaceMuted }]}>
        {subject.photoUri ? (
          <Image
            source={{ uri: subject.photoUri }}
            style={styles.photo}
            // The face is the point, so fill the frame rather than letter-boxing
            // it into a portrait with margins on either side.
            contentFit="cover"
            accessibilityLabel={subject.name ?? missingPhotoLabel}
            // Already on disk, so there is nothing to fade in from — a
            // transition here is a delay before a picture that is ready.
            transition={0}
          />
        ) : (
          <View
            style={styles.placeholder}
            accessible
            accessibilityLabel={missingPhotoLabel}
          >
            <NativeHost>
              <Icon
                name={AppIcons[KIND_ICON[subject.kind]]}
                size={PLACEHOLDER_ICON}
                color={colors.textSecondary}
              />
            </NativeHost>
          </View>
        )}
      </View>

      <View style={styles.text}>
        {subject.name ? (
          <Text variant="label" center numberOfLines={2}>
            {subject.name}
          </Text>
        ) : null}

        {subject.relationship ? (
          <Text
            variant="caption"
            color="textSecondary"
            center
            numberOfLines={2}
          >
            {subject.relationship}
          </Text>
        ) : null}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  frame: {
    // Square, so a row of cards lines up whatever shape the photographs are.
    // The top corners are rounded by `Surface`, which clips its children.
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
});
