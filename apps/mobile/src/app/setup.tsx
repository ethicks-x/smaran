import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	ActionButton,
	CodeInput,
	Surface,
	Text,
	TextField,
} from "@/components/ui";
import { useCareLink } from "@/hooks/use-care-link";
import { useThemeColors } from "@/hooks/use-theme";
import { parseSmaranId, SmaranIdLength } from "@/lib/care-link";
import { MaxContentWidth, Spacing } from "@/theme";

/**
 * Setup — the one screen between signing in and the app itself.
 *
 * A phone nobody has connected to a family has no reminders to show and nowhere
 * for anything it records to go, so this asks for the one thing that connects
 * it: the nine-digit Smaran number the person who helps the reader already has.
 * Typing it in asks that person for their help; it does not hand them anything
 * until they say yes.
 *
 * Two states and no others. Before the request there is one field and one
 * button; after it there is a spinner and a sentence saying who is being waited
 * on. Nothing here scolds, nothing here is timed, and a number that belongs to
 * nobody is a thing to check rather than a mistake somebody made.
 */
export default function SetupScreen() {
	const { t } = useTranslation();
	const colors = useThemeColors();
	const insets = useSafeAreaInsets();
	const { status, caregiverSmaranId, isBusy, failure, request, refresh } =
		useCareLink();

	const [digits, setDigits] = useState("");
	const smaranId = parseSmaranId(digits);

	const isWaiting = status === "pending";

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			style={[styles.root, { backgroundColor: colors.background }]}
		>
			<ScrollView
				contentContainerStyle={[
					styles.frame,
					{
						paddingTop: insets.top + Spacing.xl,
						paddingBottom: insets.bottom + Spacing.xl,
					},
				]}
				keyboardShouldPersistTaps="handled"
			>
				<View style={styles.content}>
					{isWaiting ? (
						<Waiting
							smaranId={caregiverSmaranId}
							isBusy={isBusy}
							onCheck={refresh}
						/>
					) : (
						<View style={styles.block}>
							<View style={styles.prompt}>
								<Text variant="title" accessibilityRole="header">
									{t("setup.title")}
								</Text>
								<Text variant="bodyLarge" color="textSecondary">
									{t("setup.body")}
								</Text>
							</View>

							<Surface style={styles.block}>
								{/* <TextField
									label={t("setup.numberLabel")}
									hint={t("setup.numberHint")}
									value={digits}
									onChangeText={(value) =>
										setDigits(value.replace(/\D/g, "").slice(0, SmaranIdLength))
									}
									keyboardType="number-pad"
									autoFocus
									autoComplete="off"
									returnKeyType="done"
								/> */}
								<CodeInput
									length={SmaranIdLength}
									keyboardType="number-pad"
									groupSize={3}
									value={digits}
									onChangeText={(value) =>
										setDigits(value.replace(/\D/g, "").slice(0, SmaranIdLength))
									}
									placeholders={Array.from(
										{ length: SmaranIdLength },
										() => "0",
									)}
									accessibilityLabel={t("setup.numberLabel")}
								/>

								{/* `warning` rather than `danger`: danger is the colour of
                    calling for help, and a number that needs checking is not an
                    emergency and must not look like one. */}
								{failure ? (
									<Text
										variant="bodyLarge"
										color="warning"
										accessibilityLiveRegion="polite"
									>
										{t(`setup.failure.${failure}` as const)}
									</Text>
								) : null}
							</Surface>

							<ActionButton
								label={t("setup.submit")}
								size="large"
								disabled={smaranId === null || isBusy}
								onPress={() => {
									if (smaranId !== null) {
										request(smaranId);
									}
								}}
							/>

							<Text variant="caption" color="textSecondary">
								{t("setup.reassurance")}
							</Text>
						</View>
					)}
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

/**
 * The wait. A spinner, who is being waited on, and a way to ask again — the
 * screen answers itself the moment the caregiver accepts, so the button is a
 * comfort rather than a step anybody has to take.
 */
function Waiting({
	smaranId,
	isBusy,
	onCheck,
}: {
	smaranId: number | null;
	isBusy: boolean;
	onCheck: () => void;
}) {
	const { t } = useTranslation();
	const colors = useThemeColors();

	return (
		<View style={styles.block}>
			<View style={styles.spinner}>
				<ActivityIndicator
					size="large"
					color={colors.primary}
					accessibilityLabel={t("setup.waitingLabel")}
				/>
			</View>

			<View style={styles.prompt}>
				<Text variant="title" center accessibilityRole="header">
					{t("setup.waitingTitle")}
				</Text>
				{/* The number is shown back as typed, so the reader can read it out to
            the person they are waiting on and check it together. */}
				<Text variant="bodyLarge" color="textSecondary" center>
					{smaranId === null
						? t("setup.waitingBody")
						: t("setup.waitingBodyNumber", { number: String(smaranId) })}
				</Text>
			</View>

			<ActionButton
				label={t("setup.check")}
				variant="text"
				disabled={isBusy}
				onPress={onCheck}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
	frame: {
		flexGrow: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: Spacing.xl,
	},
	content: {
		width: "100%",
		maxWidth: MaxContentWidth,
	},
	block: {
		gap: Spacing.xl,
	},
	prompt: {
		gap: Spacing.xs,
	},
	spinner: {
		alignItems: "center",
	},
});
