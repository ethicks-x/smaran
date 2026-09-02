import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import {
  type MemorySubjectGroup,
  memorySubjectsByKind,
  onMemorySubjectsChange,
} from "@/lib/memory-subjects";

export type MemorySubjects = {
  /** The three categories, in order, each with what is in it. */
  groups: MemorySubjectGroup[];
  /** True once anything at all has been synced down. */
  any: boolean;
  /**
   * False when the local database could not be opened. The screen still draws;
   * it says there is nothing here yet rather than pretending to know.
   */
  available: boolean;
};

/**
 * The people, places and objects the family keeps, read off local flash.
 *
 * The store is synchronous, so this is state rather than a query — and it is
 * re-read on focus for the same reason Today is: this phone is left on a table
 * for hours, and coming back to the tab after a sync should show what arrived
 * rather than what was there when the app opened. The listener covers the other
 * case, where a sync finishes while the tab is already in front of someone.
 *
 * Guarded throughout, like `useReminders`. `src/db` is a native module and a
 * development build made before it was installed cannot open the file at all
 * (`decisions.md` D-24); a missing module costs this tab its contents and takes
 * nothing else down with it.
 */
export function useMemorySubjects(): MemorySubjects {
  const [groups, setGroups] = useState<MemorySubjectGroup[] | null>(null);

  const refresh = useCallback(() => {
    setGroups(attempt(() => memorySubjectsByKind()) ?? null);
  }, []);

  useFocusEffect(refresh);

  useEffect(() => onMemorySubjectsChange(refresh), [refresh]);

  return {
    groups: groups ?? [],
    any: (groups ?? []).some((group) => group.subjects.length > 0),
    available: groups !== null,
  };
}

/**
 * Run a store call, or give up quietly.
 *
 * The message is logged and the rows are not: who this reader's family is, and
 * what their home looks like, is exactly the kind of thing that does not belong
 * in a log (`AGENTS.md` §2.5).
 */
function attempt<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch (error) {
    console.warn(
      `Memories are unavailable: ${error instanceof Error ? error.message : "the local database could not be read"}`,
    );

    return undefined;
  }
}
