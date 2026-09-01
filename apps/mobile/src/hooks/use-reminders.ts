import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
	acknowledge,
	addReminder,
	type NewReminder,
	onRemindersChange,
	type ReminderOccurrence,
	remindersFor,
} from "@/lib/reminders";

export type Reminders = {
	/** The next thing to do — the first one not yet done, overdue or not. */
	nextUp: ReminderOccurrence | null;
	/** Everything else today, in time order, including what is already done. */
	rest: ReminderOccurrence[];
	/**
	 * False when the local database could not be opened. The screen still draws;
	 * it just does not offer to add a reminder it would have nowhere to put.
	 */
	available: boolean;
	add: (reminder: NewReminder) => void;
	markDone: (occurrence: ReminderOccurrence) => void;
};

/**
 * Today's reminders, and the two things the reader can do to them.
 *
 * The store is synchronous, so this is state rather than a query: the rows are
 * read once when the screen comes into focus and again after every write. Coming
 * back to Today re-reads deliberately — the phone is left on a table for hours,
 * and a day that has rolled over past midnight must not still be showing
 * yesterday's list.
 *
 * Every call is guarded. `src/db` is a native module and a development build
 * made before it was installed cannot open the file at all (`decisions.md`
 * D-24); Today is the screen the reader lands on, and it is not allowed to be
 * the screen a missing native module takes down. A failure costs the reminders
 * and leaves the greeting, the date and the way into the games alone.
 */
export function useReminders(): Reminders {
	const [occurrences, setOccurrences] = useState<ReminderOccurrence[] | null>(
		null,
	);

	const refresh = useCallback(() => {
		setOccurrences(attempt(() => remindersFor()) ?? null);
	}, []);

	useFocusEffect(refresh);

	useEffect(() => {
		return onRemindersChange(refresh);
	}, [refresh]);

	const add = useCallback(
		(reminder: NewReminder) => {
			attempt(() => addReminder(reminder));
			refresh();
		},
		[refresh],
	);

	const markDone = useCallback(
		(occurrence: ReminderOccurrence) => {
			attempt(() => acknowledge(occurrence));
			refresh();
		},
		[refresh],
	);

	return useMemo(() => {
		const today = occurrences ?? [];
		const next = today.find((occurrence) => occurrence.doneAt === null) ?? null;

		return {
			nextUp: next,
			rest: today.filter((occurrence) => occurrence !== next),
			available: occurrences !== null,
			add,
			markDone,
		};
	}, [occurrences, add, markDone]);
}

/**
 * Run a store call, or give up quietly.
 *
 * The message is logged and the rows are not: what a reminder says is health
 * data about a vulnerable person and it does not belong in a log
 * (`AGENTS.md` §2.5).
 */
function attempt<T>(read: () => T): T | undefined {
	try {
		return read();
	} catch (error) {
		console.warn(
			`Reminders are unavailable: ${error instanceof Error ? error.message : "the local database could not be read"}`,
		);

		return undefined;
	}
}
