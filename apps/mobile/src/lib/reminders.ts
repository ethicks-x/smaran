import { and, eq, gte, lt } from "drizzle-orm";

import { db, newId, takeSeq } from "@/db";
import {
	type ReminderKind,
	type ReminderOutcome,
	type ReminderRow,
	reminder,
	reminderEvent,
	syncQueue,
} from "@/db/schema";

/**
 * Reminders, on this device, with the radio off.
 *
 * A reminder is a *definition* — what to do and when — and a reminder event is
 * what happened when one came due. The two are stored and treated very
 * differently: a definition lives and dies on the device that holds it, and an
 * event is evidence, so it goes into `sync_queue` in the same transaction that
 * writes it, exactly the way a game session does (`lib/game-history.ts`).
 *
 * Everything here is synchronous for the same reason the rest of `src/db` is
 * (`decisions.md` D-24): a screen can ask for today's reminders while it
 * renders, and no caller has to grow a loading state for a query that reads a
 * handful of rows off local flash.
 *
 * **Nothing here schedules a notification.** `expo-notifications` is not
 * installed, so `reminder.notification_ids` stays at its `[]` default and a
 * reminder is something the reader *sees on Today*, not something the phone
 * announces. That is a smaller feature, not a broken one — the column and this
 * module are already shaped for the day the dependency lands, and the Today
 * screen does not change when it does.
 */

/**
 * When a reminder comes due: a time of day, and the days of the week it repeats
 * on with Sunday first.
 *
 * Stored as `HH:MM|1111111` — a 24-hour time and a seven-character mask — which
 * is the "simple time-of-day plus a days mask" `data-model.md` §1 allows for.
 * A string rather than two columns because the server's definitions are
 * rrule-ish and will need somewhere to land; a parse that fails is a reminder
 * this build does not understand, and it is skipped rather than guessed at.
 */
export type ReminderSchedule = {
	/** 0 - 23, local time. Reminders are wall-clock things, not instants. */
	hour: number;
	/** 0 - 59, local time. */
	minute: number;
	/** 0 is Sunday, matching `Date#getDay`. */
	days: readonly number[];
};

/** The days of the week, Sunday first — and the only repeat the app offers. */
export const EveryDay: readonly number[] = [0, 1, 2, 3, 4, 5, 6];

const SCHEDULE = /^([01]\d|2[0-3]):([0-5]\d)\|([01]{7})$/;

export function encodeSchedule({
	hour,
	minute,
	days,
}: ReminderSchedule): string {
	const mask = EveryDay.map((day) => (days.includes(day) ? "1" : "0")).join("");

	return `${pad(hour)}:${pad(minute)}|${mask}`;
}

/** The stored string, read back — or null if this build cannot read it. */
export function parseSchedule(text: string): ReminderSchedule | null {
	const match = SCHEDULE.exec(text);

	if (!match) {
		return null;
	}

	const [, hour, minute, mask] = match;

	return {
		hour: Number(hour),
		minute: Number(minute),
		days: [...mask].flatMap((day, index) => (day === "1" ? [index] : [])),
	};
}

/**
 * One reminder on one day: the definition, the moment it is due, and — if the
 * reader has already said so — the moment they did it.
 *
 * `dueAt` is part of the identity here rather than a detail of it. The same
 * reminder comes due again tomorrow, and yesterday's "done" must not make
 * today's look finished.
 */
export type ReminderOccurrence = {
	/** The reminder's id. Not unique within a day's list — `dueAt` completes it. */
	id: string;
	kind: ReminderKind;
	title: string;
	detail: string | null;
	dueAt: number;
	/** When the reader marked it done, or null if they have not. */
	doneAt: number | null;
};

/**
 * Everything due on one day, earliest first, with what has already been done.
 *
 * Occurrences are computed rather than stored: a row per reminder per day would
 * be a table that grows forever and a background job to fill it, and there is
 * no promise of background execution here (`AGENTS.md` §2.2). Seven reminders
 * and a weekday check cost nothing to work out at the moment the screen draws.
 */
export function remindersFor(day: Date = new Date()): ReminderOccurrence[] {
	const start = startOfDay(day);
	const end = startOfDay(day);
	const weekday = day.getDay();

	// Not `start + 24 hours`: a day with a clock change in it is 23 or 25.
	end.setDate(end.getDate() + 1);

	const acknowledged = new Map(
		db()
			.select()
			.from(reminderEvent)
			.where(
				and(
					gte(reminderEvent.dueAt, start.getTime()),
					lt(reminderEvent.dueAt, end.getTime()),
					eq(reminderEvent.outcome, "done"),
				),
			)
			.all()
			.map(
				(event) =>
					[
						occurrenceKey(event.reminderId, event.dueAt),
						event.acknowledgedAt,
					] as const,
			),
	);

	return db()
		.select()
		.from(reminder)
		.where(eq(reminder.active, true))
		.all()
		.flatMap((row) => {
			const schedule = parseSchedule(row.schedule);

			if (!schedule?.days.includes(weekday)) {
				return [];
			}

			const dueAt = new Date(start).setHours(schedule.hour, schedule.minute);

			return [
				{
					id: row.id,
					kind: row.kind,
					title: row.title,
					detail: row.detail,
					dueAt,
					doneAt: acknowledged.get(occurrenceKey(row.id, dueAt)) ?? null,
				},
			];
		})
		.sort((a, b) => a.dueAt - b.dueAt);
}

export type NewReminder = {
	kind: ReminderKind;
	/** Already in the reader's language: it is shown, and one day spoken, as-is. */
	title: string;
	detail?: string;
	schedule: ReminderSchedule;
};

/** Keep a new reminder. Live from the next time Today is drawn. */
export function addReminder(input: NewReminder): ReminderRow {
	const row = {
		id: newId(),
		kind: input.kind,
		title: input.title.trim(),
		detail: input.detail?.trim() || null,
		schedule: encodeSchedule(input.schedule),
		active: true,
		// Nothing is booked with the OS yet, so there is nothing to cancel later.
		notificationIds: "[]",
	};

	db().insert(reminder).values(row).run();

	return row;
}

/**
 * Record what happened when a reminder came due.
 *
 * The event and its `sync_queue` entry go in **one transaction**, as
 * `data-model.md` §1 requires — an event that exists without a queue entry is a
 * silently lost sync, and nothing later would notice it was missing. This is
 * the half of reminders the caregiver dashboard is actually waiting for:
 * adherence is computed from these rows, against this patient's own history and
 * nobody else's (`AGENTS.md` §2.4).
 */
export function acknowledge(
	occurrence: Pick<ReminderOccurrence, "id" | "dueAt">,
	outcome: ReminderOutcome = "done",
	at: number = Date.now(),
): void {
	db().transaction((tx) => {
		const row = {
			id: newId(),
			reminderId: occurrence.id,
			seq: takeSeq(tx),
			dueAt: occurrence.dueAt,
			// A missed reminder was never acknowledged — that is what missed means.
			acknowledgedAt: outcome === "missed" ? null : at,
			outcome,
		};

		tx.insert(reminderEvent).values(row).run();

		// A snapshot rather than a pointer, for the same reason a session's is:
		// a retry sends exactly what the first attempt sent.
		tx.insert(syncQueue)
			.values({
				entity: "reminder_event",
				entityId: row.id,
				seq: row.seq,
				payload: JSON.stringify(row),
				createdAt: at,
			})
			.run();
	});
}

/** A reminder and the day it fell on. Tomorrow's is a different occurrence. */
const occurrenceKey = (id: string, dueAt: number) => `${id}:${dueAt}`;

const pad = (value: number) => String(value).padStart(2, "0");

/** Midnight local time, which is where a day starts for the person living it. */
function startOfDay(day: Date): Date {
	const start = new Date(day);

	start.setHours(0, 0, 0, 0);

	return start;
}
