import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { SubjectCard } from "@/components/memories/subject-card";
import type { MemorySubjectRow } from "@/db/schema";
import { Spacing } from "@/theme";

/** Three to a row. */
export const COLUMNS = 3;

/**
 * The empty cells a short row is padded with, keyed by name.
 *
 * A row is never wider than {@link COLUMNS}, so two spare keys is all this can
 * ever need. They exist because a filler is genuinely interchangeable and has
 * nothing to key it by — and one wide filler instead of two would leave the
 * last real card a gap wider than the cards above it.
 */
const FILLER_KEYS = ["filler-a", "filler-b"] as const;

export type SubjectGridProps = {
  subjects: readonly MemorySubjectRow[];
  missingPhotoLabel: string;
  /**
   * Drawn in the cell after the last subject — on the Memories tab, the way
   * through to the whole category. Left out on the category's own page, where
   * there is nothing further to go to.
   */
  trailing?: ReactNode;
};

/**
 * One category's subjects, as a block of cards.
 *
 * Three to a row rather than one, which is the opposite of what this app does
 * with lists of things to *do* — a reminder gets a whole row because it is being
 * asked about. These are being looked at, and a face is recognised faster beside
 * another face than a full screen-width away from it. Three still leaves each
 * photograph large enough to recognise on the narrowest phone this app runs on,
 * and it puts a category's first two rows on the screen at once, so the tab
 * shows people, places and things together rather than one long column of
 * faces.
 *
 * A short last row keeps its gap instead of stretching the card across it: a
 * wide card among square ones reads as something more important, and it is not.
 */
export function SubjectGrid({
  subjects,
  missingPhotoLabel,
  trailing,
}: SubjectGridProps) {
  const rows = rowsOf(subjects);

  // The trailing cell joins the last row when there is room, and starts a row
  // of its own when there is not.
  const last = rows.at(-1);
  const trailingRow =
    trailing !== undefined && (!last || last.length === COLUMNS);

  return (
    <View style={styles.grid}>
      {rows.map((row, index) => {
        const isLast = index === rows.length - 1;
        const filled =
          row.length +
          (isLast && trailing !== undefined && !trailingRow ? 1 : 0);

        return (
          <View key={row[0]?.id} style={styles.row}>
            {row.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                missingPhotoLabel={missingPhotoLabel}
              />
            ))}

            {isLast && !trailingRow ? trailing : null}
            <Fillers count={COLUMNS - filled} />
          </View>
        );
      })}

      {trailingRow ? (
        <View style={styles.row}>
          {trailing}
          <Fillers count={COLUMNS - 1} />
        </View>
      ) : null}
    </View>
  );
}

/** The empty cells that keep a short row's cards the width of a full row's. */
function Fillers({ count }: { count: number }) {
  return (
    <>
      {FILLER_KEYS.slice(0, Math.max(count, 0)).map((key) => (
        <View key={key} style={styles.filler} />
      ))}
    </>
  );
}

/** The subjects, cut into rows of {@link COLUMNS}. */
function rowsOf(subjects: readonly MemorySubjectRow[]): MemorySubjectRow[][] {
  const rows: MemorySubjectRow[][] = [];

  for (let start = 0; start < subjects.length; start += COLUMNS) {
    rows.push(subjects.slice(start, start + COLUMNS));
  }

  return rows;
}

const styles = StyleSheet.create({
  grid: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: Spacing.md,
  },
  filler: {
    flex: 1,
  },
});
