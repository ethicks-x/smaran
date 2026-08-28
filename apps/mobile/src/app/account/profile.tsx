import { useUser } from "@clerk/expo";
import { router } from "expo-router";

import {
  ActionButton,
  Detail,
  Screen,
  Section,
  Surface,
  Text,
} from "@/components/ui";

/**
 * Account — the details Smaran holds about the reader.
 *
 * Read-only for now: changing a name or a photo is a caregiver job, and asking
 * an unsteady hand to edit a text field is a poor trade for it.
 *
 * TODO: allow editing name and photo once `PATCH /users/me` exists.
 */
export default function ProfileScreen() {
  const { user } = useUser();

  const name = user?.fullName?.trim() || user?.firstName?.trim();
  const email = user?.primaryEmailAddress?.emailAddress;
  const phone = user?.primaryPhoneNumber?.phoneNumber;

  return (
    <Screen
      title="Account"
      subtitle="What Smaran knows about you."
      onBack={() => router.back()}
      withTabBar={false}
    >
      <Section title="Your details">
        <Surface>
          <Detail label="Name" value={name ?? "Not set yet"} />
          <Detail label="Email" value={email ?? "Not set yet"} />
          <Detail label="Phone" value={phone ?? "Not set yet"} />
        </Surface>
      </Section>

      <Section
        title="Your photo"
        description="Shown at the top of the Account tab."
      >
        <Surface tone="muted">
          <Text variant="body" color="textSecondary">
            Your family can change your photo from the caregiver dashboard.
          </Text>
        </Surface>
      </Section>

      <Section
        title="Something wrong?"
        description="Anyone in your circle can correct these for you."
      >
        <ActionButton
          label="Ask someone for help"
          onPress={() => router.push("/help")}
          variant="outlined"
        />
      </Section>
    </Screen>
  );
}
