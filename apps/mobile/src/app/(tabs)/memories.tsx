import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  COLUMNS,
  KIND_SEE_ALL,
  KIND_TITLE,
  SeeAllCard,
  SubjectGrid,
} from "@/components/memories";
import { EmptyState, Screen, Section } from "@/components/ui";
import type { MemorySubjectKind } from "@/db/schema";
import { useMemorySubjects } from "@/hooks/use-memory-subjects";

/**
 * How many subjects a category shows here before the rest move behind a tile.
 *
 * Two rows of {@link COLUMNS}, with the last cell spent on the way through to
 * the whole category. A block of a fixed size is the point: every category is
 * the same shape whether the family has added four people or forty, so the tab
 * is one screenful a reader can take in rather than a column of faces that
 * pushes Places and Things somewhere they will never be scrolled to.
 */
const PREVIEW = COLUMNS * 2 - 1;

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
 * the same with the radio off — including the category pages, which read the
 * same rows.
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
        .map((group) => {
          const hidden = group.subjects.length - PREVIEW;

          return (
            <Section key={group.kind} title={t(KIND_TITLE[group.kind])}>
              <SubjectGrid
                subjects={
                  hidden > 0 ? group.subjects.slice(0, PREVIEW) : group.subjects
                }
                missingPhotoLabel={t("memories.noPhoto")}
                closeLabel={t("memories.photoClose")}
                trailing={
                  // Only when something is actually behind it: a tile that
                  // opens a page showing the same faces is a tap that led
                  // nowhere, and nowhere is a hard place to come back from.
                  hidden > 0 ? (
                    <SeeAllCard
                      label={t("memories.seeAll")}
                      remaining={t("memories.more", { count: hidden })}
                      accessibilityLabel={t(KIND_SEE_ALL[group.kind])}
                      onPress={() => open(group.kind)}
                    />
                  ) : undefined
                }
              />
            </Section>
          );
        })}
    </Screen>
  );
}

/** Push the category's own page, on top of the tabs. */
function open(kind: MemorySubjectKind) {
  router.push({ pathname: "/memories/[kind]", params: { kind } });
}
