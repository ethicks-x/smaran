import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { KIND_SUBTITLE, KIND_TITLE, SubjectGrid } from "@/components/memories";
import { EmptyState, Screen } from "@/components/ui";
import type { MemorySubjectKind } from "@/db/schema";
import { useMemorySubjects } from "@/hooks/use-memory-subjects";
import { SUBJECT_KINDS } from "@/lib/memory-subjects";

/**
 * One category in full — every person, or every place, or every thing the
 * family has added, in the order the tab shows them in.
 *
 * The same grid and the same cards as the block on the Memories tab, so a
 * reader who tapped through finds the six they were looking at exactly where
 * they were, with the rest underneath. Nothing is re-ordered and nothing is
 * added on arrival: this page is the block continued, not a different view of
 * it.
 *
 * The rows come off local flash through the same hook the tab uses, so this
 * opens with the radio off and never waits on anything (`AGENTS.md` §2.1).
 */
export default function MemoryCategoryScreen() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const { t } = useTranslation();
  const { groups } = useMemorySubjects();

  const category = asKind(kind);
  const subjects = category
    ? (groups.find((group) => group.kind === category)?.subjects ?? [])
    : [];

  // A link nobody can follow from inside the app, so this is a deep link that
  // named a category that does not exist. It says there is nothing here in the
  // reader's own words rather than showing them a failure they cannot act on.
  if (!category || subjects.length === 0) {
    return (
      <Screen
        title={t("memories.title")}
        onBack={() => router.back()}
        withTabBar={false}
      >
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
      title={t(KIND_TITLE[category])}
      subtitle={t(KIND_SUBTITLE[category])}
      onBack={() => router.back()}
      withTabBar={false}
      // A long page by definition — this is the one that exists because the
      // category did not fit — so the way back stays on screen throughout.
      stickyHeader
    >
      <SubjectGrid
        subjects={subjects}
        missingPhotoLabel={t("memories.noPhoto")}
        closeLabel={t("memories.photoClose")}
      />
    </Screen>
  );
}

/** The route parameter, if it names one of the three categories. */
function asKind(kind: string | undefined): MemorySubjectKind | null {
  return SUBJECT_KINDS.find((known) => known === kind) ?? null;
}
