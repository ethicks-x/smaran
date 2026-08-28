import { useAuth, useUser } from "@clerk/expo";
import { Icon } from "@expo/ui";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import {
  ActionButton,
  type AppIconName,
  AppIcons,
  Detail,
  NativeHost,
  Screen,
  SettingsAccordion,
  SettingsGroup,
  SettingsLink,
  SettingsRow,
  Text,
} from "@/components/ui";
import { useAppearance } from "@/hooks/use-appearance";
import { useThemeColors } from "@/hooks/use-theme";
import {
  HitSlop,
  Radius,
  Spacing,
  scale,
  TextSizeOptions,
  ThemeModeOptions,
  TouchTarget,
} from "@/theme";

const AVATAR_SIZE = scale(140);
const BADGE_SIZE = scale(50);
const HEADER_ICON_SIZE = scale(28);

/**
 * Account — everything about the person using the app, and the few settings an
 * elder-facing app should ask them to think about.
 *
 * A portrait, then two short lists. Rows come in two kinds and say which they
 * are before they are tapped: a chevron pointing down opens an answer in place,
 * a chevron pointing forward opens a screen. Anything that fits in a sentence
 * or two expands — staying put means never having to find the way back, which
 * is the step people lose most often. Only settings with real choices in them
 * get a screen of their own.
 */
export default function SettingsScreen() {
  const { signOut } = useAuth();

  const appearance = useAppearanceSummary();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <Screen title="Account" headerAction={<HeaderActions />}>
      <Profile />

      <SettingsAccordion>
        <SettingsGroup title="Your account">
          <SettingsLink
            icon="profile"
            tint="primary"
            label="Account"
            description="Name, photo, email"
            onPress={() => router.push("/account/profile")}
          />
          <SettingsLink
            icon="reminder"
            tint="warning"
            label="Notifications"
            description="Reminder sounds and quiet hours"
            onPress={() => router.push("/account/notifications")}
          />
          <SettingsLink
            icon="appearance"
            tint="accent"
            label="Appearance"
            description={appearance}
            onPress={() => router.push("/account/appearance")}
          />
          <SettingsRow
            icon="language"
            tint="success"
            label="Language"
            description="English"
          >
            <Text variant="body" color="textSecondary">
              Smaran speaks English today. More languages are on the way, and it
              will follow the language your phone is set to when they arrive.
            </Text>
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup title="Safety and help">
          <SettingsRow
            icon="security"
            tint="primary"
            label="Privacy and security"
            description="Who can see your reminders"
          >
            <Text variant="body" color="textSecondary">
              Only the family members you have added can see your reminders and
              memories. Nobody else does, and nothing is shared outside the app.
            </Text>
          </SettingsRow>
          <SettingsRow
            icon="help"
            tint="danger"
            label="Help centre"
            description="Reach someone straight away"
          >
            <Text variant="body" color="textSecondary">
              The Help tab calls someone who can help you, any time of day.
            </Text>
            <ActionButton
              label="Go to Help"
              onPress={() => router.push("/help")}
              variant="outlined"
            />
          </SettingsRow>
          <SettingsRow
            icon="info"
            tint="neutral"
            label="About Smaran"
            description={`Version ${version}`}
          >
            <Text variant="body" color="textSecondary">
              Smaran is made to be read easily and used slowly: large type, big
              buttons, and never more than a few choices at once.
            </Text>
            <Detail label="Version" value={version} />
          </SettingsRow>
          <SettingsRow
            icon="signOut"
            tint="danger"
            label="Sign out"
            description="Leave this account on this phone"
          >
            <Text variant="body" color="textSecondary">
              You will need your email address to sign back in.
            </Text>
            <ActionButton
              label="Sign out"
              onPress={() => signOut()}
              variant="outlined"
              tone="danger"
              accessibilityLabel="Sign out of Smaran"
            />
          </SettingsRow>
        </SettingsGroup>
      </SettingsAccordion>
    </Screen>
  );
}

/**
 * What the Appearance row says it is set to, so the current answer is readable
 * without opening the screen.
 */
function useAppearanceSummary() {
  const { themeMode, textSize } = useAppearance();

  const brightness = ThemeModeOptions.find(
    (option) => option.value === themeMode,
  )?.label;
  const size = TextSizeOptions.find(
    (option) => option.value === textSize,
  )?.label;

  return `${brightness} · ${size} text`;
}

/**
 * Two shortcuts beside the title. Both go somewhere real — a button that only
 * looks like a button is worse here than no button at all.
 */
function HeaderActions() {
  return (
    <View style={styles.headerActions}>
      <IconButton
        icon="reminder"
        label="Today's reminders"
        onPress={() => router.push("/")}
      />
      <IconButton
        icon="help"
        label="Call for help"
        onPress={() => router.push("/help")}
      />
    </View>
  );
}

/**
 * The reader's own face, as large as the screen allows, with their name under
 * it. Recognising yourself is the fastest way to know whose account this is —
 * faster than reading an email address, and it still works on a day when
 * reading is hard.
 */
function Profile() {
  const colors = useThemeColors();
  const { user } = useUser();

  const name = user?.fullName?.trim() || user?.firstName?.trim();
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <View style={styles.profile}>
      <View>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: colors.primaryMuted,
              borderColor: colors.surface,
            },
          ]}
        >
          {user?.imageUrl ? (
            <Image
              source={user.imageUrl}
              style={styles.avatarImage}
              contentFit="cover"
              accessibilityIgnoresInvertColors
              accessibilityLabel="Your photo"
            />
          ) : (
            <Text variant="display" color="primary">
              {getInitials(name ?? "")}
            </Text>
          )}
        </View>

        {/* TODO: open the photo picker once the API accepts an avatar upload. */}
        <Pressable
          onPress={() => router.push("/account/profile")}
          hitSlop={HitSlop}
          accessibilityRole="button"
          accessibilityLabel="Change your photo"
          style={({ pressed }) => [
            styles.avatarBadge,
            { backgroundColor: colors.accent, borderColor: colors.background },
            pressed && styles.pressed,
          ]}
        >
          <NativeHost>
            <Icon
              name={AppIcons.edit}
              size={scale(24)}
              color={colors.onPrimary}
            />
          </NativeHost>
        </Pressable>
      </View>

      <View style={styles.profileText}>
        <Text variant="heading" center>
          {name ?? "Your account"}
        </Text>
        {email ? (
          <Text variant="caption" color="textSecondary" center>
            {email}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: AppIconName;
  label: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={HitSlop}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <NativeHost>
        <Icon
          name={AppIcons[icon]}
          size={HEADER_ICON_SIZE}
          color={colors.text}
        />
      </NativeHost>
    </Pressable>
  );
}

/** At most two letters — more than that stops reading as a monogram. */
function getInitials(fullName: string) {
  const letters = fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return letters.slice(0, 2) || "?";
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  iconButton: {
    width: TouchTarget.min,
    height: TouchTarget.min,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  profile: {
    alignItems: "center",
    gap: Spacing.lg,
  },
  profileText: {
    gap: Spacing.xs,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: scale(6),
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarBadge: {
    position: "absolute",
    right: -Spacing.xs,
    bottom: Spacing.xs,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    borderWidth: scale(4),
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
});
