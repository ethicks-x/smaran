import { StyleSheet, View } from "react-native";

import { SubjectCard } from "@/components/memories/subject-card";
import type { MemorySubjectRow } from "@/db/schema";
import { Spacing } from "@/theme";

/** Two to a row, matching the games block on Today. */
const COLUMNS = 2;

export type SubjectGridProps = {
  subjects: readonly MemorySubjectRow[];
  missingPhotoLabel: string;
};

/**
 * One category's subjects, as a block of cards.
 *
 * Two columns rather than one, which is the opposite of what this app does with
 * lists of things to *do* — a reminder gets a whole row because it is being
 * asked about. These are being looked at, and a face is recognised faster beside
 * another face than a full screen-width away from it. Two columns still leaves
 * each photograph large on the narrowest phone this app runs on.
 *
 * A short last row keeps its gap instead of stretching the card across it: a
 * wide card among square ones reads as something more important, and it is not.
 */
export function SubjectGrid({ subjects, missingPhotoLabel }: SubjectGridProps) {
  return (
    <View style={styles.grid}>
      {rowsOf(subjects).map((row) => (
        <View key={row[0]?.id} style={styles.row}>
          {row.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              missingPhotoLabel={missingPhotoLabel}
            />
          ))}

          {row.length < COLUMNS ? <View style={styles.filler} /> : null}
        </View>
      ))}
    </View>
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
