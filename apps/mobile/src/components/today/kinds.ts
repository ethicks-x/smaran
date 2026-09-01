import type { AppIconName } from "@/components/ui";
import type { ReminderKind } from "@/db/schema";

/**
 * A picture for each kind of reminder, always beside the words and never
 * instead of them.
 *
 * Shared by the card and the list so the same reminder is the same picture in
 * both places — that recognition is most of what makes the list readable at a
 * glance (`AGENTS.md` §2.3).
 */
export const KIND_ICON: Record<ReminderKind, AppIconName> = {
	medicine: "medication",
	hydration: "water",
	activity: "activity",
	appointment: "appointment",
};
