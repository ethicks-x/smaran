import { Icon } from "@expo/ui";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { KIND_ICON } from "@/components/memories/kinds";
import {
  AppIcons,
  NativeHost,
  PhotoViewer,
  Surface,
  Text,
} from "@/components/ui";
import type { MemorySubjectRow } from "@/db/schema";
import { useThemeColors } from "@/hooks/use-theme";
import { Radius, Spacing, scale } from "@/theme";

const PLACEHOLDER_ICON = scale(52);

/** The mark in the corner of a photograph that opens. Small — three of these sit across the
 * narrowest phone and the face behind it is what the card is for. */
const ENLARGE_ICON = scale(16);
const ENLARGE_PAD = scale(6);

export type SubjectCardProps = {
  subject: MemorySubjectRow;
  /** Read aloud in place of a missing photograph, and by a screen reader. */
  missingPhotoLabel: string;
  /** The way out of the enlarged photograph. Omit it, and the card is not tappable. */
  closeLabel?: string;
};

/**
 * One person, place or object: their photograph, their name, and who or what
 * they are to the reader.
 *
 * **Tapping the photograph opens it, and that is the only thing a tap does.**
 * There is still no detail screen behind a subject — the name and who they are
 * is the whole of what the app knows — so the one thing a tap can honestly
 * offer is the picture itself, larger. A card whose photograph has not arrived
 * is not pressable at all, because there would be nothing to open and a card
 * that looks pressable and does nothing teaches a reader with dementia that
 * this app does not respond to them.
 *
 * The picture comes off local flash: `photoUri` is a path into the media cache,
 * written there by sync, and this component never touches a URL
 * (`AGENTS.md` §2.1). A subject whose photograph has not arrived — no signal
 * yet, or none was ever uploaded — draws the category's own mark instead, so the
 * card keeps its shape and the name underneath is unaffected.
 */
export function SubjectCard({
  subject,
  missingPhotoLabel,
  closeLabel,
}: SubjectCardProps) {
  const colors = useThemeColors();
  const [viewing, setViewing] = useState(false);

  const photoUri = subject.photoUri;
  const photoLabel = subject.name ?? missingPhotoLabel;
  const canView = photoUri !== null && closeLabel !== undefined;

  const frame = (
    <View style={[styles.frame, { backgroundColor: colors.surfaceMuted }]}>
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={styles.photo}
          // The face is the point, so fill the frame rather than letter-boxing
          // it into a portrait with margins on either side.
          contentFit="cover"
          accessibilityLabel={photoLabel}
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

      {/* The one cue that this picture opens. A mark without a word beside it,
          which the app otherwise does not do (§2.3) — the caption under the
          card is the person's name and must stay that, and a screen reader
          hears the invitation in full from the card itself. */}
      {canView ? (
        <View
          style={[styles.badge, { backgroundColor: colors.primary }]}
          pointerEvents="none"
        >
          <NativeHost>
            <Icon
              name={AppIcons.enlarge}
              size={ENLARGE_ICON}
              color={colors.onPrimary}
            />
          </NativeHost>
        </View>
      ) : null}
    </View>
  );

  return (
    <Surface padded={false} style={styles.card}>
      {canView ? (
        <Pressable
          onPress={() => setViewing(true)}
          accessibilityRole="imagebutton"
          accessibilityLabel={photoLabel}
          style={({ pressed }) => pressed && styles.pressed}
        >
          {frame}
        </Pressable>
      ) : (
        frame
      )}

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

      {canView ? (
        <PhotoViewer
          visible={viewing}
          photoUri={photoUri}
          label={photoLabel}
          closeLabel={closeLabel}
          onRequestClose={() => setViewing(false)}
        />
      ) : null}
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
  badge: {
    position: "absolute",
    right: ENLARGE_PAD,
    bottom: ENLARGE_PAD,
    padding: ENLARGE_PAD,
    borderRadius: Radius.pill,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
});
