import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { GameCard, GameCatalogue } from "@/components/games";
import { EmptyState, Screen, Section } from "@/components/ui";

/**
 * The games list — one card per game, and a plain word about the ones that are
 * not here yet.
 *
 * This is a tab of its own: playing something is a reason to open the app, so
 * the way in is a labelled destination on the bar rather than a card the reader
 * has to find on Today. The games themselves still open on top of the tabs, so
 * a board fills the screen with nothing to swipe away by accident.
 *
 * A game arrives underneath the ones already here rather than rearranging the
 * page a reader has learnt, which is why the list looked like a list back when
 * there was only one thing on it. The order is the catalogue's, so the list
 * and the tiles on Today never disagree about which game comes first.
 */
export default function GamesScreen() {
	const { t } = useTranslation();

	return (
		<Screen title={t("games.title")} subtitle={t("games.subtitle")}>
			<Section title={t("games.ready")}>
				{GameCatalogue.map((game) => (
					<GameCard
						key={game.id}
						icon={game.icon}
						title={t(game.nameKey)}
						description={t(game.descriptionKey)}
						onPress={() => router.push(game.route)}
					/>
				))}
			</Section>

			<Section title={t("games.more")}>
				<EmptyState
					icon="games"
					title={t("games.moreTitle")}
					message={t("games.moreMessage")}
				/>
			</Section>
		</Screen>
	);
}
