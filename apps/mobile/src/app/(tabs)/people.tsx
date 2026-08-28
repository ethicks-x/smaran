import { EmptyState, Screen, Section } from "@/components/ui";

/**
 * People — familiar faces: who they are, how they are related, and how to
 * reach them.
 *
 * TODO: load the circle from the API and show a photo grid with names and
 * relationships, each tile opening a call/profile view.
 */
export default function PeopleScreen() {
  return (
    <Screen
      title="People"
      subtitle="The people close to you, and how to reach them."
    >
      <Section title="Your circle">
        <EmptyState
          icon="people"
          title="No one added yet"
          message="Family and carers added on the caregiver dashboard will appear here with their photo and name."
        />
      </Section>
    </Screen>
  );
}
