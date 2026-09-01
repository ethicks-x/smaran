import { useUser } from "@clerk/expo";
import { router } from "expo-router";
import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
	GameCatalogue,
	GameGrid,
	type GameGridTile,
	HomeGameCount,
} from "@/components/games";
import {
	AddReminderDialog,
	NextReminderCard,
	ReminderList,
} from "@/components/today";
import { ActionButton, EmptyState, Screen, Section } from "@/components/ui";
import { useLocale } from "@/hooks/use-language";
import { useReminders } from "@/hooks/use-reminders";

/**
 * Today — the home screen and the answer to "what am I meant to be doing?".
 *
 * The day's plan is the reader's own: reminders come from the device store
 * (`lib/reminders.ts`), which is where they will still be when the phone has no
 * signal. The dashboard will one day send definitions down and they will land in
 * the same table — nothing on this screen has to change when it does.
 *
 * The day is two things and not four: the card at the top is what to do now,
 * and everything else is one grouped list under a single heading. A card per
 * reminder spent most of the screen on the gaps between them and made every
 * reminder look equally urgent, which is the opposite of the point.
 *
 * One filled button on the page, and it is "I have done this" on the reminder
 * that is next. Adding a reminder is the quieter, outlined action underneath the
 * day, because it is the caregiver's errand and not the reader's.
 */
export default function TodayScreen() {
	const { user } = useUser();
	const { t } = useTranslation();
	const locale = useLocale();
	const { nextUp, rest, available, add, markDone } = useReminders();

	const [adding, setAdding] = useState(false);

	// Nothing at all today, which is different from everything being done: the
	// card says "nothing to do just now", an empty day says so more warmly.
	const empty = nextUp === null && rest.length === 0;

	const firstName = user?.firstName?.trim();

	return (
		<Screen title={greeting(t, firstName)} subtitle={formatToday(locale)}>
			{empty ? (
				<EmptyState
					icon="reminder"
					title={t("today.emptyTitle")}
					message={t("today.emptyMessage")}
				/>
			) : (
				<NextReminderCard
					occurrence={nextUp}
					onDone={() => nextUp && markDone(nextUp)}
				/>
			)}

			{rest.length > 0 ? (
				<Section title={t("today.restOfDay")}>
					<ReminderList occurrences={rest} />
				</Section>
			) : null}

			{/* Hidden rather than disabled when the store could not be opened: a
          button that cannot do its job should not be offered at all. */}
			{available ? (
				<ActionButton
					label={t("today.addReminder")}
					variant="outlined"
					onPress={() => setAdding(true)}
				/>
			) : null}

			{/* A second way into the games, alongside the Games tab. Three boards
          are offered by name and the fourth tile opens the tab with the rest,
          so the common case is one tap from the screen the reader starts on
          and the full list is still one tap away. */}
			<Section
				title={t("games.home.section")}
				description={t("games.home.description")}
			>
				<GameGrid tiles={homeTiles(t)} />
			</Section>

			<AddReminderDialog
				visible={adding}
				onClose={() => setAdding(false)}
				onAdd={add}
			/>
		</Screen>
	);
}

/**
 * The four tiles: the first three games in the catalogue by name, and the way
 * to the Games tab for all of them. Fewer than three games ships fewer than three tiles rather
 * than a placeholder — the grid is a short row and no reader is told about a
 * game that is not there.
 */
function homeTiles(t: TFunction): GameGridTile[] {
	const games: GameGridTile[] = GameCatalogue.slice(0, HomeGameCount).map(
		(game) => ({
			id: game.id,
			icon: game.icon,
			title: t(game.nameKey),
			description: t(game.descriptionKey),
			kind: "game",
			onPress: () => router.push(game.route),
		}),
	);

	return [
		...games,
		{
			id: "all",
			icon: "games",
			title: t("games.home.all"),
			description: t("games.home.allHint"),
			kind: "more",
			onPress: () => router.push("/games"),
		},
	];
}

/**
 * "Good morning, Meera" as one string per language rather than a greeting with
 * a name stuck on the end. Where the name sits in the sentence — and whether it
 * takes a suffix — is the translator's decision, not the layout's.
 */
function greeting(
	t: ReturnType<typeof useTranslation>["t"],
	name: string | undefined,
) {
	const hour = new Date().getHours(); // Returns 0 - 23
	const partOfDay = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";

	return name
		? t(`greeting.named${partOfDay}`, { name })
		: t(`greeting.${partOfDay.toLowerCase() as Lowercase<typeof partOfDay>}`);
}

/**
 * The date in the language on screen, not the one the phone is set to. An
 * Indic locale also brings its own digits with it, which is the point: a date
 * half in one script and half in another is harder to read than either.
 */
function formatToday(locale: string) {
	return new Date().toLocaleDateString(locale, {
		weekday: "long",
		day: "numeric",
		month: "long",
	});
}
