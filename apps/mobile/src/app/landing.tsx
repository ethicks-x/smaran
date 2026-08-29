import { useHostedAuth } from "@clerk/expo/hosted-auth";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  type NativeScrollEvent,
  Pressable,
  type ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  LandingSlide,
  LandingSlides,
  OnArt,
  PageDots,
  PillButton,
  RoundButton,
} from "@/components/landing";
import { Text } from "@/components/ui";
import {
  HitSlop,
  MaxContentWidth,
  Radius,
  Spacing,
  TouchTarget,
} from "@/theme";

const LAST_PAGE = LandingSlides.length - 1;

/**
 * Where the Account Portal sends the browser back to when sign-in is done.
 *
 * Left to itself Clerk builds this out of the bundle identifier — a scheme the
 * app answers but never declared — so it is worth being explicit: this is our
 * own scheme, the one `app.json` registers, and `+native-intent.ts` catches it
 * before the router can mistake it for a page.
 */
const AUTH_REDIRECT_URL = Linking.createURL("sso-callback");

/** What the floating chrome takes out of each page, top and bottom. */
const HEADER_HEIGHT = TouchTarget.min;
const FOOTER_HEIGHT = TouchTarget.large + Spacing["3xl"];

/**
 * Landing — the first thing anyone sees, and the way in.
 *
 * Four full-screen pages introduce the app one idea at a time, and the last one
 * hands over to Clerk's hosted Account Portal. There is no form here: sign-in
 * happens in the browser, so this screen only has to say what Smaran is and
 * then get out of the way.
 *
 * The art and the words are what swipe; the wordmark and the controls float
 * above the pager and never move. So the button that takes you forward is in
 * one place from the first page to the last — where it stops saying "Next" and
 * says "Sign in".
 *
 * This screen ignores the light and dark themes on purpose: the art is dark in
 * both, so its ink is fixed in `OnArt`.
 */
export default function LandingScreen() {
  const { startHostedAuth } = useHostedAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const pager = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  // Mirrors `page` for the scroll handler, which must not be rebuilt — and so
  // must not close over — state that changes on every swipe.
  const pageRef = useRef(0);
  const [page, setPage] = useState(0);

  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFirst = page === 0;
  const isLast = page === LAST_PAGE;

  const nextKey = LandingSlides[page + 1]?.key;
  // Read out ahead of the tap, so someone using a screen reader knows where
  // "Next" goes before they commit to going there.
  const nextTitle = nextKey ? t(`landing.slides.${nextKey}.title`) : "";

  const onScroll = useMemo(
    () =>
      Animated.event<NativeScrollEvent>(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        {
          // JS-driven on purpose: the page dots interpolate this value into a
          // `width`, which the native driver refuses to animate. One value has
          // to drive both them and the art, and a scroll already reports on the
          // JS thread — so the parallax rides along at the same rate.
          useNativeDriver: false,
          listener: (event) => {
            const next = Math.round(
              event.nativeEvent.contentOffset.x / Math.max(width, 1),
            );

            if (next !== pageRef.current) {
              pageRef.current = next;
              setPage(next);
            }
          },
        },
      ),
    [scrollX, width],
  );

  const goTo = (index: number) => {
    pager.current?.scrollTo({ x: index * width, animated: true });
  };

  const signIn = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await startHostedAuth({
        mode: "sign-in",
        redirectUrl: AUTH_REDIRECT_URL,
      });
    } catch {
      setError(t("landing.signInFailed"));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* The art is dark whatever the phone's theme is, so the clock and
          battery above it have to be light. */}
      <StatusBar style="light" />

      <Animated.ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // One page per swipe on Android too, and no half-page resting states.
        decelerationRate="fast"
        style={styles.pager}
      >
        {LandingSlides.map((slide, index) => (
          <LandingSlide
            key={slide.key}
            slide={slide}
            index={index}
            scrollX={scrollX}
            width={width}
            topInset={insets.top + HEADER_HEIGHT}
            bottomInset={insets.bottom + FOOTER_HEIGHT}
          />
        ))}
      </Animated.ScrollView>

      <View
        style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
        pointerEvents="box-none"
      >
        <Text
          variant="label"
          style={styles.wordmark}
          accessibilityRole="header"
        >
          {t("landing.wordmark")}
        </Text>

        <Pressable
          onPress={() => goTo(LAST_PAGE)}
          hitSlop={HitSlop}
          accessibilityRole="button"
          accessibilityLabel={t("landing.skipHint")}
          style={({ pressed }) => [
            styles.skip,
            {
              backgroundColor: OnArt.fill,
              borderColor: OnArt.border,
              opacity: isLast ? 0 : 1,
            },
            pressed && styles.pressed,
          ]}
        >
          <Text variant="caption" style={styles.skipLabel}>
            {t("landing.skip")}
          </Text>
        </Pressable>
      </View>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}
        pointerEvents="box-none"
      >
        {error ? (
          <Text variant="caption" center style={styles.error}>
            {error}
          </Text>
        ) : null}

        {/* Only on the page where signing in is the next thing to do. On the
            way there the controls speak for themselves, and the bar stays as
            close to the bottom edge as the safe area allows. */}
        {isLast ? (
          <Text variant="caption" center style={styles.hint}>
            {t("landing.signInHint")}
          </Text>
        ) : null}

        <PageDots
          count={LandingSlides.length}
          scrollX={scrollX}
          width={width}
          label={t("landing.page", {
            current: page + 1,
            total: LandingSlides.length,
          })}
        />

        <View style={styles.controls}>
          <RoundButton
            icon="back"
            onPress={() => goTo(page - 1)}
            disabled={isFirst}
            accessibilityLabel={t("landing.previousPage")}
          />

          <PillButton
            label={isLast ? t("landing.signIn") : t("landing.next")}
            onPress={isLast ? signIn : () => goTo(page + 1)}
            icon="chevronRight"
            busy={isBusy}
            accessibilityLabel={
              isLast
                ? t("landing.signIn")
                : t("landing.nextTo", { title: nextTitle })
            }
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: OnArt.canvas,
  },
  pager: {
    ...StyleSheet.absoluteFill,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
  },
  wordmark: {
    color: OnArt.text,
    letterSpacing: 0.4,
  },
  skip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  skipLabel: {
    color: OnArt.text,
  },
  pressed: {
    opacity: 0.7,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  error: {
    color: OnArt.danger,
  },
  hint: {
    color: OnArt.textFaint,
  },
});
