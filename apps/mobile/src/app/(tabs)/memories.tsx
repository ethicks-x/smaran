import { useTranslation } from "react-i18next";

import { KIND_TITLE, SubjectGrid } from "@/components/memories";
import { EmptyState, Screen, Section } from "@/components/ui";
import { useMemorySubjects } from "@/hooks/use-memory-subjects";

/**
 * Memories — the people, places and objects the family wants the reader to
 * recognise, in three named groups.
 *
 * Grouped rather than one long feed, because the groups are how a person looks
 * for something here: "who is that" and "where is that" are different questions
 * and a mixed list answers neither. The order is fixed and the headings are
 * always the same words, so the page is in the same shape every time it is
 * opened — recognition over recall (`AGENTS.md` §2.3).
 *
 * An empty category is left out entirely. A heading with nothing under it is a
 * gap the reader has to work out the meaning of, and there is nothing they could
 * do about it — only the family can add a subject, on the dashboard.
 *
 * Everything drawn here came off local flash. The rows and the photographs are
 * synced down and cached (`lib/memory-subjects.ts`), so the tab opens exactly
 * the same with the radio off.
 *
 * TODO: read each name and relationship aloud on tap, once there is TTS.
 */
export default function MemoriesScreen() {
  const { t } = useTranslation();
  const { groups, any } = useMemorySubjects();

  if (!any) {
    return (
      <Screen title={t("memories.title")} subtitle={t("memories.subtitle")}>
        <EmptyState
          icon="memories"
          title={t("memories.emptyTitle")}
          message={t("memories.emptyMessage")}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title={t("memories.title")}
      subtitle={t("memories.subtitle")}
      // A long page once a family has filled it in, and the way back to the
      // other tabs should not be several flicks above the reader.
      stickyHeader
    >
      {groups
        .filter((group) => group.subjects.length > 0)
        .map((group) => (
          <Section key={group.kind} title={t(KIND_TITLE[group.kind])}>
            <SubjectGrid
              subjects={group.subjects}
              missingPhotoLabel={t("memories.noPhoto")}
            />
          </Section>
        ))}
    </Screen>
  );
}
