import { Icon } from "@expo/ui";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { KIND_ICON } from "@/components/memories/kinds";
import { AppIcons, NativeHost, PhotoViewer } from "@/components/ui";
import type { MemorySubjectKind } from "@/db/schema";
import { useThemeColors } from "@/hooks/use-theme";
import { Radius, scale } from "@/theme";

/** Big enough to recognise a face at arm's length, capped so a tablet does not turn the
 * photograph into the whole screen with the question pushed off the bottom. */
const MAX_SIZE = scale(320);

/** How far from square the frame will follow a photograph. Family pictures are portrait
 * about as often as they are landscape and both should arrive uncropped, but a very tall
 * one left to its own shape would push the question off the bottom of the screen and a very
 * wide one would leave a face too small to read — outside these two the frame stops
 * following and the picture fills it instead. */
const TALLEST = 3 / 4;
const WIDEST = 3 / 2;

const PLACEHOLDER_ICON = scale(64);

/** The mark in the corner saying the picture opens. Small, because it must not compete with
 * the face behind it, and off to one side of a picture rather than over the middle of it. */
const ENLARGE_ICON = scale(22);
const ENLARGE_PAD = scale(8);

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
  /** The way out of the enlarged photograph. Omit it, and the picture is not tappable. */
  closeLabel?: string;
};

/**
 * The photograph a question is about, shown large above it.
 *
 * It keeps the shape the picture was taken in, between a portrait and a landscape, so a
 * face arrives whole rather than cropped to a square by the frame it happens to be in. A
 * photograph further from square than that is drawn to fill the frame at the nearest shape
 * this screen has room for — the alternative is a question pushed off the bottom edge.
 * Until the picture has been measured the frame is square, which is the shape it settles
 * closest to and the least movement on the way there.
 *
 * Tapping it opens the same photograph as large as the screen will draw it, and nothing
 * else: this is the question, and the answers are somewhere else on the screen. A tap that
 * lands here by mistake costs the reader a look at a picture and a button to come back —
 * never an answer, never a try.
 */
export function PhotoPrompt({
  photoUri,
  kind,
  label,
  closeLabel,
}: PhotoPromptProps) {
  const colors = useThemeColors();
  const [ratio, setRatio] = useState(1);
  const [viewing, setViewing] = useState(false);

  const canView = photoUri !== null && closeLabel !== undefined;

  const frame = (
    // The width lives on the wrapper. A frame carrying both a capped width and an aspect
    // ratio measures the ratio against the width it asked for rather than the one it was
    // given, which on a wide screen makes it far taller than it is wide.
    <View style={styles.sizer}>
      <View
        style={[
          styles.frame,
          { aspectRatio: ratio },
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        ]}
      >
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.photo}
            contentFit="cover"
            // Already on disk, so there is nothing to fade in from.
            transition={0}
            onLoad={({ source }) =>
              setRatio(clamp(source.width / source.height, TALLEST, WIDEST))
            }
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

        {/* The one cue that this picture opens. It is a mark without a word beside it,
            which the app otherwise does not do (§2.3) — a sentence here would sit between
            the photograph and the question it is asking, and this is an extra rather than
            the way to do anything. Everything the mark offers, the picture's own
            announcement says in full to a screen reader. */}
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
    </View>
  );

  if (!canView) {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel={label}>
        {frame}
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setViewing(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel={label}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {frame}
      </Pressable>

      <PhotoViewer
        visible={viewing}
        photoUri={photoUri}
        label={label}
        closeLabel={closeLabel}
        onRequestClose={() => setViewing(false)}
      />
    </>
  );
}

const clamp = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : 1;

const styles = StyleSheet.create({
  sizer: {
    alignSelf: "center",
    width: "100%",
    maxWidth: MAX_SIZE,
  },
  frame: {
    width: "100%",
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
});
