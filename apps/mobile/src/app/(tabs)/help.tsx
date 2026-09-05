import { Icon } from "@expo/ui";
import { useTranslation } from "react-i18next";
import { Linking, StyleSheet, View } from "react-native";

import {
  ActionButton,
  AppIcons,
  EmptyState,
  NativeHost,
  Screen,
  Section,
  Surface,
  Text,
} from "@/components/ui";
import { useCareLink } from "@/hooks/use-care-link";
import { useRefresh } from "@/hooks/use-refresh";
import { useThemeColors } from "@/hooks/use-theme";
import { Radius, Spacing, scale } from "@/theme";

const AVATAR_SIZE = scale(72);

/**
 * Help — one unmistakable way to reach a person.
 *
 * The person is the caregiver who accepted this reader at setup, and their name
 * and number ride along on the care link (`lib/care-link.ts`), which is cached
 * on the device. So this screen draws the same with the radio off, which is the
 * whole point of it: the moment somebody needs to call for help is not a moment
 * that waits for a signal (`AGENTS.md` §2.1).
 *
 * When there is no number the screen says so and shows **no button at all**. A
 * dead button is worse than none here — a red rectangle that does nothing when
 * pressed is exactly the wrong thing to learn about the Help screen, and there
 * is nothing the reader could do to fix it anyway; the caregiver fills their
 * number in on their own account.
 *
 * TODO: tell the caregiver dashboard that help was asked for, once there is a
 * route to tell. TODO: list the backup contacts, once `person` is synced down —
 * the table is already there and nothing fills it.
 */
export default function HelpScreen() {
  const { t } = useTranslation();
  const { caregiver } = useCareLink();
  const refresh = useRefresh();

  const name = caregiver?.name?.trim() || null;
  const phone = caregiver?.phone?.trim() || null;

  return (
    <Screen
      title={t("help.title")}
      subtitle={t("help.subtitle")}
      // A caregiver who has just changed their number is the one case where
      // what is on this page is out of date and the reader can do something
      // about it.
      onRefresh={refresh}
    >
      <Section title={t("help.callSection")}>
        {phone ? (
          <>
            <CaregiverCard name={name} phone={phone} />
            <ActionButton
              label={name ? t("help.callNamed", { name }) : t("help.call")}
              onPress={() => Linking.openURL(`tel:${phone}`)}
              tone="danger"
              size="large"
              accessibilityLabel={t("help.callHint")}
            />
            <Text variant="caption" color="textSecondary" center>
              {t("help.callNote")}
            </Text>
          </>
        ) : (
          <EmptyState
            icon="help"
            title={t("help.noContactTitle")}
            message={t("help.noContactMessage")}
          />
        )}
      </Section>

      <Section
        title={t("help.otherContacts")}
        description={t("help.otherContactsDescription")}
      >
        <EmptyState
          icon="people"
          title={t("help.backupTitle")}
          message={t("help.backupMessage")}
        />
      </Section>
    </Screen>
  );
}

/**
 * Who the button calls: their face-sized initial, their name, and the number
 * itself.
 *
 * The number is shown rather than hidden behind the button because seeing it is
 * how a reader recognises the person as theirs — and because a phone that will
 * not dial can still be read out to somebody standing next to them.
 */
function CaregiverCard({
  name,
  phone,
}: {
  name: string | null;
  phone: string;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Surface elevated>
      <View style={styles.card}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryMuted }]}>
          {name ? (
            <Text variant="heading" color="primary">
              {initialOf(name)}
            </Text>
          ) : (
            <NativeHost>
              <Icon
                name={AppIcons.profile}
                size={scale(34)}
                color={colors.primary}
              />
            </NativeHost>
          )}
        </View>

        <View style={styles.details}>
          <Text variant="heading">{name ?? t("help.caregiverLabel")}</Text>
          {name ? (
            <Text variant="caption" color="textSecondary">
              {t("help.caregiverLabel")}
            </Text>
          ) : null}
          <Text variant="bodyLarge">{phone}</Text>
        </View>
      </View>
    </Surface>
  );
}

/** The first letter of a name, whatever script it is written in. */
function initialOf(name: string): string {
  return [...name][0]?.toUpperCase() ?? "?";
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  details: {
    flex: 1,
    gap: Spacing.xs,
  },
});
