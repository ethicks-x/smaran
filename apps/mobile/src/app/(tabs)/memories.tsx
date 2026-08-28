import { EmptyState, Screen, Section } from "@/components/ui";

/**
 * Memories — photos, voice notes and short stories shared by the family.
 *
 * TODO: load shared memories and render a large-tile, one-per-row feed with
 * captions read aloud on tap.
 */
export default function MemoriesScreen() {
  return (
    <Screen title="Memories" subtitle="Photos and moments your family shared.">
      <Section title="Recently shared">
        <EmptyState
          icon="memories"
          title="No memories yet"
          message="Photos and stories shared with you will collect here, newest first."
        />
      </Section>
    </Screen>
  );
}
