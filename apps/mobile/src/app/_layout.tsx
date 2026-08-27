import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";

function requirePublishableKey(): string {
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!key) {
    throw new Error("Add your Clerk Publishable Key to the .env file");
  }

  return key;
}

const publishableKey = requirePublishableKey();

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <AppTabs />
      </ThemeProvider>
    </ClerkProvider>
  );
}
