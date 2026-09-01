import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { GameCard } from "@/components/games";
import { EmptyState, Screen, Section } from "@/components/ui";

/**
 * The games list — one card per game, and a plain word about the ones that are
 * not here yet.
 *
 * A game arrives underneath the ones already here rather than rearranging the
 * page a reader has learnt, which is why the list looked like a list back when
 * there was only one thing on it.
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

				<GameCard
					icon="missing"
					title={t("games.missing.name")}
					description={t("games.missing.shortDescription")}
					onPress={() => router.push("/games/missing")}
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
