import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { Surface, Text } from "@/components/ui";
import { useLocale } from "@/hooks/use-language";
import { recentSessions } from "@/lib/game-history";
import type { SessionStats } from "@/lib/game-stats";
import { Spacing } from "@/theme";

export type GameSummaryProps = {
	stats: SessionStats;
	/**
	 * What this game calls the thing that was found — "Pairs found" for matching
	 * pairs. Games that have no better word for it can leave it out and get the
	 * generic one.
	 */
	foundLabel?: string;
};

/**
 * How the round went, in four lines, shown once it is over.
 *
 * Four and no more: this card sits inside a dialog on a phone, above the
 * buttons, and it has to stay readable at the largest text size the reader can
 * ask for. Everything else the session measured is in the history, and in the
 * development-only detail below.
 *
 * The numbers are the reader's own and nothing else's (`AGENTS.md` §2.4): there
 * is no pass mark on this card, no grade, no comparison with anybody, and no
 * colour that turns a low number into a warning. It is a record of what
 * happened — this many found, this many turns, about this long — and every one
 * of those lines is a fact rather than a verdict, which is the only version of
 * a score §2.3 leaves room for.
 *
 * Time is deliberately coarse: seconds under a minute and whole minutes after
 * that. A board took "about four minutes", never "4:07" — the exact figure
 * would invite beating it, and this game is explicitly not timed.
 *
 * Reusable across games: it reads only `SessionStats`, so a new game gets this
 * card by handing it the row `useGameSession` already produced.
 */
export function GameSummary({ stats, foundLabel }: GameSummaryProps) {
	const { t } = useTranslation();
	const locale = useLocale();

	const number = (value: number) => new Intl.NumberFormat(locale).format(value);

	return (
		<Surface tone="muted" bordered={false} style={styles.card}>
			<Row
				label={foundLabel ?? t("games.summary.found")}
				value={t("games.summary.foundValue", {
					found: number(stats.correct),
					total: number(stats.total),
				})}
			/>
			<Row label={t("games.summary.turns")} value={number(stats.attempts)} />
			<Row
				label={t("games.summary.accuracy")}
				value={new Intl.NumberFormat(locale, {
					style: "percent",
					maximumFractionDigits: 0,
				}).format(stats.accuracy)}
			/>
			<Row
				label={t("games.summary.time")}
				value={describeDuration(t, stats.durationMs)}
			/>
		</Surface>
	);
}

/** A label and its number, on one line, reading left to right. */
function Row({ label, value }: { label: string; value: string }) {
	return (
		// One row is one sentence to a screen reader: read apart, "Turns taken"
		// and "12" arrive as two unrelated fragments.
		<View
			style={styles.row}
			accessible
			accessibilityLabel={`${label}: ${value}`}
		>
			<Text variant="body" color="textSecondary" style={styles.label}>
				{label}
			</Text>
			<Text variant="bodyLarge">{value}</Text>
		</View>
	);
}

/**
 * How long the board took, in words.
 *
 * Rounded to the minute above sixty seconds, and each case is a whole string of
 * its own so a translator can put the number where their language puts it and
 * pluralise it their way (D-12) — never two fragments joined with a space.
 */
function describeDuration(
	t: ReturnType<typeof useTranslation>["t"],
	durationMs: number,
): string {
	const seconds = Math.round(durationMs / 1000);

	return seconds < 60
		? t("games.summary.timeSeconds", { count: seconds })
		: t("games.summary.timeMinutes", { count: Math.round(seconds / 60) });
}

/**
 * Every number the session produced, unrounded and unsoftened, for whoever is
 * building the next game or the adaptive engine.
 *
 * `__DEV__` only — a caller must guard it, and `matching.tsx` does. That is also
 * why the copy here is English literals rather than catalogue keys, the same
 * exception the developer row on Settings takes (D-21): none of it is compiled
 * into a release build, so no reader can ever meet an untranslated string from
 * it. It is the one place in the app where a raw metric is shown as a metric —
 * nothing here is fit for a patient to read, which is the point of the guard.
 *
 * The tail is this launch's history: the same rows `adjustDifficulty` will read
 * when it lands, in the order it will read them (D-22).
 */
export function GameStatsDetail({ stats }: { stats: SessionStats }) {
	const history = recentSessions({
		gameId: stats.gameId,
		limit: HISTORY_SHOWN,
	});

	return (
		<Surface tone="accent" bordered={false} style={styles.card}>
			<Text variant="caption" color="textMuted">
				Developer · session stats
			</Text>

			{DETAIL_ROWS.map(([label, read]) => (
				<Row key={label} label={label} value={read(stats)} />
			))}

			<Text variant="caption" color="textMuted">
				{`This launch, newest first (${history.length}):`}
			</Text>

			{history.map((session) => (
				<Text key={session.startedAt} variant="caption" color="textMuted">
					{`L${session.difficulty} · ${session.correct}/${session.total} · ${session.attempts} turns · acc ${session.accuracy} · prec ${session.precision ?? "—"} · cons ${session.consistency ?? "—"} · ${Math.round(session.durationMs / 1000)}s · ${session.completed ? "finished" : "put down"}`}
				</Text>
			))}
		</Surface>
	);
}

/** Enough history to see a trend forming without turning the dialog into a log. */
const HISTORY_SHOWN = 5;

/**
 * Field by field, in the order they are worth reading rather than the order
 * they are declared: what happened, then how well, then how fast.
 */
const DETAIL_ROWS: readonly [string, (stats: SessionStats) => string][] = [
	["game / level", (s) => `${s.gameId} · ${s.difficulty}`],
	["attempts", (s) => String(s.attempts)],
	["correct / total", (s) => `${s.correct} / ${s.total}`],
	["completed", (s) => (s.completed ? "yes" : "no — put down")],
	["accuracy", (s) => s.accuracy.toFixed(3)],
	["precision", (s) => s.precision?.toFixed(3) ?? "—"],
	["completion", (s) => s.completion.toFixed(3)],
	["consistency", (s) => s.consistency?.toFixed(3) ?? "—"],
	["longest streak", (s) => String(s.longestStreak)],
	["duration", (s) => `${s.durationMs} ms`],
	["time on task", (s) => `${s.timeOnTaskMs} ms`],
	["avg response", (s) => `${s.avgResponseMs} ms`],
	["median response", (s) => `${s.medianResponseMs} ms`],
];

const styles = StyleSheet.create({
	card: {
		alignSelf: "stretch",
		gap: Spacing.sm,
	},
	row: {
		flexDirection: "row",
		alignItems: "baseline",
		justifyContent: "space-between",
		gap: Spacing.md,
	},
	// The label gives way first: a number is short and must never be the thing
	// that wraps.
	label: {
		flexShrink: 1,
	},
});
