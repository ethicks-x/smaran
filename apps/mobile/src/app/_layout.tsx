import { ClerkProvider, useAuth } from "@clerk/expo";
import { resourceCache } from "@clerk/expo/resource-cache";
import { tokenCache } from "@clerk/expo/token-cache";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useMemo } from "react";

import "@/i18n";

import { AppearanceProvider, useAppearance } from "@/hooks/use-appearance";
import { CareLinkProvider, useCareLink } from "@/hooks/use-care-link";
import { LanguageProvider, useLanguage } from "@/hooks/use-language";
import { RecallProvider, useRecall } from "@/hooks/use-recall";
import { useRoleEnrolment } from "@/hooks/use-role-enrolment";
import { useSync } from "@/hooks/use-sync";
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
		// Without a resource cache Clerk can only finish loading by reaching its
		// API, so with the radio off `isLoaded` never flips and the splash below
		// never lifts — the app simply does not open (§2.1). The cache lets it
		// restore the last known session and environment from the device instead,
		// and it refreshes them in the background once there is a network again.
		<ClerkProvider
			publishableKey={publishableKey}
			tokenCache={tokenCache}
			__experimental_resourceCache={resourceCache}
		>
			<LanguageProvider>
				<AppearanceProvider>
					<CareLinkProvider>
						<RecallProvider>
							<RootNavigator />
						</RecallProvider>
					</CareLinkProvider>
				</AppearanceProvider>
			</LanguageProvider>
		</ClerkProvider>
	);
}

/**
 * Holds the splash screen until Clerk has restored the session, the reader's
 * appearance and language choices have been read back, and the device has said
 * who looks after them — then routes to the landing screen, setup, the
 * once-a-launch name recall, or the app itself. Keeping the guard here means no
 * screen ever renders in a half-authenticated state — or, for a frame, in the
 * wrong theme or the wrong language.
 *
 * Every one of those four is a **local** read. The care link in particular is
 * the cached answer and never the network's (`hooks/use-care-link.tsx`), so a
 * phone that was set up in March opens in a house with no signal in June.
 */
function RootNavigator() {
	const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
	const { isLoaded: isAppearanceLoaded } = useAppearance();
	const { isLoaded: isLanguageLoaded } = useLanguage();
	const { isRecalled } = useRecall();
	const { isLoaded: isCareLinkLoaded, isLinked } = useCareLink();
	const { isDark, colors } = useTheme();

	// Fires on the first session this account has on this phone, and is awaited by
	// nothing — the splash below lifts on Clerk and the stored preferences, never
	// on a network call.
	useRoleEnrolment();

	// The outbox, drained on the way in and whenever the reader comes back. Also
	// awaited by nothing: what the phone has recorded is already on the phone, and
	// sending it is the only part that is allowed to fail (§2.1).
	useSync();

	const isLoaded =
		isAuthLoaded && isAppearanceLoaded && isLanguageLoaded && isCareLinkLoaded;

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
				{/* Before anything else a signed-in reader can see: a phone
            nobody has connected to a family has no reminders to show and
            nowhere for what it records to go. Setup is the only screen that
            needs a signal, and it needs it once. */}
				<Stack.Protected guard={isSignedIn && !isLinked}>
					<Stack.Screen name="setup" />
				</Stack.Protected>

				<Stack.Protected guard={isSignedIn && isLinked && !isRecalled}>
					<Stack.Screen name="recall" />
				</Stack.Protected>

				<Stack.Protected guard={isSignedIn && isLinked && isRecalled}>
					<Stack.Screen name="(tabs)" />
					{/* No `animation` override: each platform already knows what a
              pushed screen should do, and a phone's own transition is the one
              its owner has already learnt. */}
					<Stack.Screen name="account" />
					<Stack.Screen name="games" />
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
