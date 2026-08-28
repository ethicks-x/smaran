import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useMemo } from "react";

import { AppearanceProvider, useAppearance } from "@/hooks/use-appearance";
import { RecallProvider, useRecall } from "@/hooks/use-recall";
import { useTheme } from "@/hooks/use-theme";
import type { ThemeColors } from "@/theme";

function requirePublishableKey(): string {
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!key) {
    throw new Error(
      "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Copy .env.example to .env and add your Clerk publishable key.",
    );
  }

  return key;
}

const publishableKey = requirePublishableKey();

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <AppearanceProvider>
        <RecallProvider>
          <RootNavigator />
        </RecallProvider>
      </AppearanceProvider>
    </ClerkProvider>
  );
}

/**
 * Holds the splash screen until Clerk has restored the session and the reader's
 * appearance choices have been read back, then routes to the landing screen,
 * the once-a-launch name recall, or the app itself. Keeping the guard here means no screen ever renders in a
 * half-authenticated state — or, for a frame, in the wrong theme.
 */
function RootNavigator() {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isLoaded: isAppearanceLoaded } = useAppearance();
  const { isRecalled } = useRecall();
  const { isDark, colors } = useTheme();

  const isLoaded = isAuthLoaded && isAppearanceLoaded;

  const navigationTheme = useMemo(
    () => toNavigationTheme(colors, isDark),
    [colors, isDark],
  );

  useEffect(() => {
    if (isLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoaded]);

  // The layer underneath every screen. Left at its platform default it is pure
  // white, which is what shows through for a frame whenever a screen is being
  // attached or detached — the flash people see on the way back from a pushed
  // screen. Painting it the app canvas makes that frame invisible.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Protected guard={isSignedIn && !isRecalled}>
          <Stack.Screen name="recall" />
        </Stack.Protected>

        <Stack.Protected guard={isSignedIn && isRecalled}>
          <Stack.Screen name="(tabs)" />
          {/* No `animation` override: each platform already knows what a
              pushed screen should do, and a phone's own transition is the one
              its owner has already learnt. */}
          <Stack.Screen name="account" />
        </Stack.Protected>

        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="landing" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

/**
 * React Navigation paints the space around and behind cards from its own theme,
 * which ships a stock grey in light mode and near-black in dark. Handing it our
 * tokens means every surface it draws is one we chose.
 */
function toNavigationTheme(colors: ThemeColors, isDark: boolean) {
  const base = isDark ? DarkTheme : DefaultTheme;

  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
  };
}
