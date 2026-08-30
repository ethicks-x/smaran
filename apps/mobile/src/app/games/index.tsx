import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { GameCard } from "@/components/games";
import { EmptyState, Screen, Section } from "@/components/ui";

/**
 * The games list — one card per game, and a plain word about the ones that are
 * not here yet.
 *
 * There is only one game today and the list still looks like a list, because
 * the shape of this screen is what a reader learns: the second game arrives
 * underneath the first rather than rearranging the page they already know.
 */
export default function GamesScreen() {
	const { t } = useTranslation();

	return (
		<Screen
			title={t("games.title")}
			subtitle={t("games.subtitle")}
			onBack={() => router.back()}
			withTabBar={false}
		>
			<Section title={t("games.ready")}>
				<GameCard
					icon="matching"
					title={t("games.matching.name")}
					description={t("games.matching.shortDescription")}
					onPress={() => router.push("/games/matching")}
				/>
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
