import { useTranslation } from "react-i18next";

import { EmptyState, Screen, Section } from "@/components/ui";

/**
 * People — familiar faces: who they are, how they are related, and how to
 * reach them.
 *
 * TODO: load the circle from the API and show a photo grid with names and
 * relationships, each tile opening a call/profile view.
 */
export default function PeopleScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t("people.title")} subtitle={t("people.subtitle")}>
      <Section title={t("people.circle")}>
        <EmptyState
          icon="people"
          title={t("people.emptyTitle")}
          message={t("people.emptyMessage")}
        />
      </Section>
    </Screen>
  );
}
