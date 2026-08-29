import { useTranslation } from "react-i18next";

import { EmptyState, Screen, Section } from "@/components/ui";

/**
 * Memories — photos, voice notes and short stories shared by the family.
 *
 * TODO: load shared memories and render a large-tile, one-per-row feed with
 * captions read aloud on tap.
 */
export default function MemoriesScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t("memories.title")} subtitle={t("memories.subtitle")}>
      <Section title={t("memories.recent")}>
        <EmptyState
          icon="memories"
          title={t("memories.emptyTitle")}
          message={t("memories.emptyMessage")}
        />
      </Section>
    </Screen>
  );
}
