import { useAuth, useUser } from "@clerk/expo";
import { Icon } from "@expo/ui";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
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
import { useAppearance, useAppearanceOptions } from "@/hooks/use-appearance";
import { useLanguage } from "@/hooks/use-language";
import { useThemeColors } from "@/hooks/use-theme";
import { Languages } from "@/i18n/languages";
import { HitSlop, Radius, Spacing, scale, TouchTarget } from "@/theme";

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
  const { t } = useTranslation();

  const appearance = useAppearanceSummary();
  const language = useLanguageSummary();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <Screen title={t("account.title")} headerAction={<HeaderActions />}>
      <Profile />

      <SettingsAccordion>
        <SettingsGroup title={t("account.groupAccount")}>
          <SettingsLink
            icon="profile"
            tint="primary"
            label={t("account.rows.profile.label")}
            description={t("account.rows.profile.description")}
            onPress={() => router.push("/account/profile")}
          />
          <SettingsLink
            icon="reminder"
            tint="warning"
            label={t("account.rows.notifications.label")}
            description={t("account.rows.notifications.description")}
            onPress={() => router.push("/account/notifications")}
          />
          <SettingsLink
            icon="appearance"
            tint="accent"
            label={t("account.rows.appearance.label")}
            description={appearance}
            onPress={() => router.push("/account/appearance")}
          />
          {/* A screen rather than an expanding row: the answer is a choice, and
              the four names have to be shown in their own scripts to be
              recognised at all. */}
          <SettingsLink
            icon="language"
            tint="success"
            label={t("account.rows.language.label")}
            description={language}
            onPress={() => router.push("/account/language")}
          />
        </SettingsGroup>

        <SettingsGroup title={t("account.groupSafety")}>
          <SettingsRow
            icon="security"
            tint="primary"
            label={t("account.rows.privacy.label")}
            description={t("account.rows.privacy.description")}
          >
            <Text variant="body" color="textSecondary">
              {t("account.rows.privacy.body")}
            </Text>
          </SettingsRow>
          <SettingsRow
            icon="help"
            tint="danger"
            label={t("account.rows.helpCentre.label")}
            description={t("account.rows.helpCentre.description")}
          >
            <Text variant="body" color="textSecondary">
              {t("account.rows.helpCentre.body")}
            </Text>
            <ActionButton
              label={t("account.rows.helpCentre.action")}
              onPress={() => router.push("/help")}
              variant="outlined"
            />
          </SettingsRow>
          <SettingsRow
            icon="info"
            tint="neutral"
            label={t("account.rows.about.label")}
            description={t("account.rows.about.description", { version })}
          >
            <Text variant="body" color="textSecondary">
              {t("account.rows.about.body")}
            </Text>
            <Detail label={t("account.rows.about.version")} value={version} />
          </SettingsRow>
          <SettingsRow
            icon="signOut"
            tint="danger"
            label={t("account.rows.signOut.label")}
            description={t("account.rows.signOut.description")}
          >
            <Text variant="body" color="textSecondary">
              {t("account.rows.signOut.body")}
            </Text>
            <ActionButton
              label={t("account.rows.signOut.action")}
              onPress={() => signOut()}
              variant="outlined"
              tone="danger"
              accessibilityLabel={t("account.rows.signOut.hint")}
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
  const { t } = useTranslation();
  const { themeMode, textSize } = useAppearance();
  const { themeModes, textSizes } = useAppearanceOptions();

  const brightness = themeModes.find((o) => o.value === themeMode)?.label ?? "";
  const size = textSizes.find((o) => o.value === textSize)?.label ?? "";

  return t("appearance.summary", { brightness, size });
}

/**
 * The Language row names its own answer in its own script, so someone who reads
 * only Assamese can still tell at a glance that Assamese is what is set.
 */
function useLanguageSummary() {
  const { language } = useLanguage();

  return Languages.find((entry) => entry.code === language)?.endonym ?? "";
}

/**
 * Two shortcuts beside the title. Both go somewhere real — a button that only
 * looks like a button is worse here than no button at all.
 */
function HeaderActions() {
  const { t } = useTranslation();

  return (
    <View style={styles.headerActions}>
      <IconButton
        icon="reminder"
        label={t("account.todaysReminders")}
        onPress={() => router.push("/")}
      />
      <IconButton
        icon="help"
        label={t("account.callForHelp")}
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
  const { t } = useTranslation();

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
              accessibilityLabel={t("account.yourPhoto")}
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
          accessibilityLabel={t("account.changePhoto")}
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
          {name ?? t("account.yourAccount")}
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
