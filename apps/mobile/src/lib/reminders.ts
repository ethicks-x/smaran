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
 * A reminder that comes back: a time of day and the days of the week it repeats
 * on, Sunday first.
 */
export type RepeatingSchedule = {
	/** 0 - 23, local time. Reminders are wall-clock things, not instants. */
	hour: number;
	/** 0 - 59, local time. */
	minute: number;
	/** 0 is Sunday, matching `Date#getDay`. */
	days: readonly number[];
};

/** A reminder that happens once: a time of day and the one date it falls on. */
export type OneOffSchedule = {
	hour: number;
	minute: number;
	/** `YYYY-MM-DD`, local. An appointment is on a date, not at an instant. */
	date: string;
};

/**
 * When a reminder comes due.
 *
 * Stored as `HH:MM|1111111` — a 24-hour time and a seven-character days mask —
 * or, for something that happens once, `HH:MM@YYYY-MM-DD`. Both are the "simple
 * time-of-day plus a days mask" `data-model.md` §1 allows for; the second is the
 * degenerate case of it, written as a date because a mask cannot say *which*
 * Tuesday. A string rather than columns because the server's definitions are
 * rrule-ish and will need somewhere to land; a parse that fails is a reminder
 * this build does not understand, and it is skipped rather than guessed at.
 */
export type ReminderSchedule = RepeatingSchedule | OneOffSchedule;

/** True for a reminder that happens on one date and then never again. */
export function isOneOff(schedule: ReminderSchedule): schedule is OneOffSchedule {
	return "date" in schedule;
}

/** The days of the week, Sunday first. */
export const EveryDay: readonly number[] = [0, 1, 2, 3, 4, 5, 6];

const REPEATING = /^([01]\d|2[0-3]):([0-5]\d)\|([01]{7})$/;
const ONE_OFF = /^([01]\d|2[0-3]):([0-5]\d)@(\d{4})-(\d{2})-(\d{2})$/;

export function encodeSchedule(schedule: ReminderSchedule): string {
	const at = `${pad(schedule.hour)}:${pad(schedule.minute)}`;

	if (isOneOff(schedule)) {
		return `${at}@${schedule.date}`;
	}

	const mask = EveryDay.map((day) =>
		schedule.days.includes(day) ? "1" : "0",
	).join("");

	return `${at}|${mask}`;
}

/** The stored string, read back — or null if this build cannot read it. */
export function parseSchedule(text: string): ReminderSchedule | null {
	const repeating = REPEATING.exec(text);

	if (repeating) {
		const [, hour, minute, mask] = repeating;

		return {
			hour: Number(hour),
			minute: Number(minute),
			days: [...mask].flatMap((day, index) => (day === "1" ? [index] : [])),
		};
	}

	const once = ONE_OFF.exec(text);

	if (!once) {
		return null;
	}

	const [, hour, minute, year, month, day] = once;
	const date = `${year}-${month}-${day}`;

	// The regex cannot tell the 31st of February from a real date, and a day that
	// does not exist is a reminder that would never come due. Skipped, not guessed.
	if (localDate(new Date(Number(year), Number(month) - 1, Number(day))) !== date) {
		return null;
	}

	return { hour: Number(hour), minute: Number(minute), date };
}

/**
 * A date as `YYYY-MM-DD` in the reader's own timezone.
 *
 * Not `toISOString()`, which is UTC: east of Greenwich that turns the evening
 * into tomorrow, and a reminder set for tonight would arrive on the wrong day.
 */
export function localDate(day: Date): string {
	return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
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

			if (!schedule) {
				return [];
			}

			if (
				isOneOff(schedule)
					? schedule.date !== localDate(day)
					: !schedule.days.includes(weekday)
			) {
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

/**
 * Keep a new reminder. Live from the next time Today is drawn, and on its way to the
 * family the next time this phone reaches the network.
 *
 * The row and its `sync_queue` entry go in **one transaction**, for the same reason a
 * session's do: a reminder that exists without a queue entry is one the caregiver will
 * never see, and nothing later would notice it was missing. That was exactly the gap this
 * closed — reminders synced down and never up, so the one kind of reminder the dashboard
 * could not show was the kind the reader made themselves (D-36).
 *
 * Creating is all the device may do. Editing, switching off and retiring belong to the
 * caregiver, so there is no second queue entry anywhere in this file — one write, once, at
 * the moment it is made.
 */
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

	db().transaction((tx) => {
		tx.insert(reminder).values(row).run();

		// A snapshot rather than a pointer, so a retry sends what the first attempt
		// sent even if the caregiver has since changed the reminder underneath it.
		// `notificationIds` is not in it: what this phone has booked with the OS is
		// nobody else's business.
		tx.insert(syncQueue)
			.values({
				entity: "reminder",
				entityId: row.id,
				seq: takeSeq(tx),
				payload: JSON.stringify(row),
				createdAt: Date.now(),
			})
			.run();
	});

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

/**
 * A reminder definition as the server hands it down.
 *
 * `title` and `detail` arrive already in the reader's language — a caregiver
 * typed them for this person — so nothing here translates or reformats them.
 */
export type PulledReminder = {
	id: string;
	kind: ReminderKind;
	title: string;
	detail: string | null;
	schedule: string;
	active: boolean;
	/** The caregiver retired it. Everything else is the last thing we knew. */
	deleted: boolean;
};

type ReminderChangeListener = () => void;
const reminderListeners = new Set<ReminderChangeListener>();

export function onRemindersChange(listener: ReminderChangeListener): () => void {
	reminderListeners.add(listener);
	return () => {
		reminderListeners.delete(listener);
	};
}

export function notifyRemindersChange(): void {
	for (const listener of reminderListeners) {
		try {
			listener();
		} catch (error) {
			console.warn("Error in reminder change listener", error);
		}
	}
}

/**
 * Take what the caregiver decided.
 *
 * Reminder definitions are server-authoritative (`data-model.md` §3 rule 2), so
 * this is a replace and not a merge: there is one owner, so there is no conflict
 * to resolve and nothing to ask anybody about.
 *
 * **Reminders the reader added on this phone are not touched.** They have local
 * ids the server has never seen, and only ids named in this pull are written or
 * removed — a device-created reminder is never collateral of a caregiver's edit.
 * The other half of that is a real gap: a reminder added on the phone stays
 * invisible on the dashboard, because definitions do not yet sync **up** (D-34).
 *
 * `notification_ids` is deliberately left alone on an update. It is this
 * device's own scheduling state — which OS notifications this reminder currently
 * has booked — and the server neither knows nor should know it. When
 * `expo-notifications` lands, an edit arriving here is what has to cancel and
 * rebook them, and it will read that column to know what to cancel.
 *
 * Returns how many rows actually changed, for the diagnostic. Whole thing is one
 * transaction: a pull that dies halfway leaves the day the reader can see intact
 * rather than half-rewritten.
 */
export function applyReminders(pulled: readonly PulledReminder[]): number {
	if (pulled.length === 0) {
		return 0;
	}

	const count = db().transaction((tx) => {
		for (const row of pulled) {
			if (row.deleted) {
				// The reminder's own events cascade away with it. Their `sync_queue`
				// entries do not — the queue holds a JSON snapshot rather than a
				// pointer, so an acknowledgement that has not synced yet still will.
				// Nothing removes a fact; this only stops the phone showing something
				// nobody can see any more.
				tx.delete(reminder).where(eq(reminder.id, row.id)).run();
				continue;
			}

			const values = {
				id: row.id,
				kind: row.kind,
				title: row.title,
				detail: row.detail,
				schedule: row.schedule,
				active: row.active,
				notificationIds: "[]",
			};

			tx.insert(reminder)
				.values(values)
				.onConflictDoUpdate({
					target: reminder.id,
					set: {
						kind: values.kind,
						title: values.title,
						detail: values.detail,
						schedule: values.schedule,
						active: values.active,
					},
				})
				.run();
		}

		return pulled.length;
	});

	notifyRemindersChange();
	return count;
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
