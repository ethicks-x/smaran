import { Icon } from "@expo/ui";
import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import {
  type LayoutRectangle,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcons } from "@/components/ui/icons";
import { NativeHost } from "@/components/ui/native-host";
import { useThemeColors } from "@/hooks/use-theme";
import { HitSlop, Radius, Spacing, scale, TouchTarget } from "@/theme";

/** Long enough to be a movement you can follow with your eyes, short enough that the
 * photograph is not something you wait for. */
const TRAVEL_MS = 260;

/** How small the photograph starts. It grows out of the page rather than appearing on top
 * of it, so it reads as the same picture getting closer. */
const START_SCALE = 0.88;

const CLOSE_ICON = scale(26);

export type PhotoViewerProps = {
  visible: boolean;
  /** A path into the media cache, never a URL — this draws with the radio off. */
  photoUri: string | null;
  /** What a screen reader hears for the picture. */
  label: string;
  /** What the way out is called. Drawn as a cross, said in full to a screen reader. */
  closeLabel: string;
  onRequestClose: () => void;
};

/**
 * One photograph, as large as the screen will draw it.
 *
 * A picture inside a board is sized for the board — big enough to recognise, small enough
 * to leave room for the question under it. This is the other thing a reader sometimes
 * wants: to look at the photograph itself, at whatever size the screen can give. Nothing
 * here is part of the game. It answers nothing, scores nothing, and closing it puts the
 * board back exactly as it was.
 *
 * It grows in and shrinks back out rather than cutting, so the reader can see where the
 * large picture came from and where it went — with motion turned down in the OS both ends
 * are instant, which is the honest reduced form of a picture growing.
 *
 * There are two ways out and both of them are large: the cross in the corner, and anywhere
 * else on the screen. This is the one place in the app where a tap beside the thing closes
 * it — a `Dialog` is a decision and a stray tap must not answer it, but this is a picture
 * being looked at and there is nothing here to get wrong.
 */
export function PhotoViewer({
  visible,
  photoUri,
  label,
  closeLabel,
  onRequestClose,
}: PhotoViewerProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  // The modal outlives `visible` by the length of the closing animation: a modal torn down
  // the moment it is hidden takes the picture with it and there is nothing left to animate.
  const [mounted, setMounted] = useState(visible);

  // The photograph is drawn at its own size rather than filling the screen and letter-boxing
  // itself, so the frame around it is the picture's own edge — which is the only way a
  // rounded corner or a border is on the photograph rather than on empty space beside it.
  const [area, setArea] = useState<LayoutRectangle | null>(null);
  const [ratio, setRatio] = useState<number | null>(null);

  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    }
  }, [visible]);

  const settle = useCallback(() => {
    setMounted(false);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    if (reduceMotion) {
      progress.value = visible ? 1 : 0;

      if (!visible) {
        settle();
      }

      return;
    }

    progress.value = withTiming(
      visible ? 1 : 0,
      { duration: TRAVEL_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished && !visible) {
          runOnJS(settle)();
        }
      },
    );
  }, [visible, mounted, reduceMotion, progress, settle]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const photoStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: START_SCALE + (1 - START_SCALE) * progress.value }],
  }));

  if (!mounted) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      // The fade and the growth are both ours, so the platform must not add one of its own.
      animationType="none"
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      {/* The scrim takes the touch itself, which is both how a tap outside closes the
          photograph and why nothing behind it can be tapped by mistake through the modal.
          It says nothing to a screen reader — the picture and the cross carry the labels. */}
      <AnimatedPressable
        accessible={false}
        onPress={onRequestClose}
        style={[
          styles.scrim,
          {
            backgroundColor: colors.overlay,
            // The modal is drawn under the status and gesture bars. Now that the frame is
            // the picture's own edge, it has to stop short of both or a corner is rounded
            // underneath something the reader cannot move.
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
          scrimStyle,
        ]}
      >
        {/* Everything the photograph is allowed to fill. Measured rather than assumed:
            what is left after the scrim's padding and the safe areas is the only thing the
            picture can be fitted to. */}
        <View
          style={styles.area}
          onLayout={({ nativeEvent }) => setArea(nativeEvent.layout)}
        >
          <Animated.View
            style={[styles.stage, fitted(area, ratio), photoStyle]}
          >
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={styles.photo}
                // The whole picture, uncropped and as large as the screen will draw it —
                // being able to see all of it is the only reason this screen exists.
                contentFit="contain"
                transition={0}
                onLoad={({ source }) =>
                  setRatio(
                    source.height > 0 ? source.width / source.height : null,
                  )
                }
                accessible
                accessibilityRole="image"
                accessibilityLabel={label}
              />
            ) : null}
          </Animated.View>
        </View>

        <Pressable
          onPress={onRequestClose}
          hitSlop={HitSlop}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          style={({ pressed }) => [
            styles.close,
            {
              top: Spacing.lg + insets.top,
              backgroundColor: colors.surface,
            },
            pressed && styles.pressed,
          ]}
        >
          <NativeHost>
            <Icon name={AppIcons.close} size={CLOSE_ICON} color={colors.text} />
          </NativeHost>
        </Pressable>
      </AnimatedPressable>
    </Modal>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The largest the photograph goes inside the space it is given, at its own shape.
 *
 * Until it has been measured the frame fills that space: `contain` keeps the picture the
 * right shape in the meantime, so the only thing settling in is the frame drawn around it.
 */
function fitted(area: LayoutRectangle | null, ratio: number | null) {
  if (!area || !ratio || area.width <= 0 || area.height <= 0) {
    return styles.stageUnmeasured;
  }

  return {
    width: Math.min(area.width, area.height * ratio),
    height: Math.min(area.height, area.width / ratio),
  };
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingInline: Spacing["2xl"],
  },
  area: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  // No width cap: on this screen the photograph is the whole point, so it takes everything
  // the screen has and keeps its own shape doing it.
  stage: {
    borderRadius: Radius.xl,
    overflow: "hidden",
  },
  stageUnmeasured: {
    width: "100%",
    height: "100%",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  close: {
    position: "absolute",
    right: Spacing.lg,
    width: TouchTarget.min,
    height: TouchTarget.min,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
});
