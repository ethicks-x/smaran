import type { ParseKeys } from "i18next";

import type { AppIconName } from "@/components/ui";

/**
 * Every game that can actually be played, in the order a reader meets them.
 *
 * The list is here rather than in either screen because two screens offer the
 * games now — the four tiles on Today and the full list under Games — and a
 * game that appeared on one and not the other would be a game the reader can
 * only find by luck. Adding a game is one entry here plus its route file.
 *
 * Order matters: Today shows the first three, so the gentlest board comes
 * first.
 */
export type GameEntry = {
	id: string;
	icon: AppIconName;
	/** Where the game lives. Typed routes check this against the file tree. */
	route: "/games/matching" | "/games/missing";
	/** Catalogue key for the game's name, in the reader's language. */
	nameKey: ParseKeys;
	/** Catalogue key for the one line saying what playing it is like. */
	descriptionKey: ParseKeys;
};

export const GameCatalogue: readonly GameEntry[] = [
	{
		id: "matching",
		icon: "matching",
		route: "/games/matching",
		nameKey: "games.matching.name",
		descriptionKey: "games.matching.shortDescription",
	},
	{
		id: "missing",
		icon: "missing",
		route: "/games/missing",
		nameKey: "games.missing.name",
		descriptionKey: "games.missing.shortDescription",
	},
];

/** How many games Today has room for beside the way into the full list. */
export const HomeGameCount = 3;
