import { router } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import type { PreviewOption } from "@/components/ui";
import {
	ColorChoice,
	PreviewChoice,
	Screen,
	SettingCard,
	SettingField,
	StepSlider,
	Surface,
	Text,
	Toggle,
} from "@/components/ui";
import { useAppearance, useAppearanceOptions } from "@/hooks/use-appearance";
import { useTheme } from "@/hooks/use-theme";
import type { HighlightColor, TextSize, ThemeColors, ThemeMode } from "@/theme";
import {
	Radius,
	Spacing,
	scale,
	TextSizeScales,
	TextStyles,
	themeColors,
} from "@/theme";

/**
 * Appearance — how bright Smaran is, what colour it picks things out in, how
 * large it reads, and how heavy the type is set.
 *
 * Four dials on cards lifted off the page, brightness and highlight sharing
 * one because they are the same question asked twice. The whole screen is one
 * long answer to "can you make this easier to read?", and a raised card with
 * its own tinted icon says where one answer ends and the next begins without a
 * single line of instruction. Every choice takes effect on the
 * tap — no "save" to find, no screen to come back from — and the sample at the
 * bottom is drawn with the very same tokens as the rest of the app, so the
 * answer to "what will this look like?" is already on screen while the choice
 * is being made.
 */
export default function AppearanceScreen() {
	const {
		themeMode,
		textSize,
		highlight,
		boldText,
		setThemeMode,
		setTextSize,
		setHighlight,
		setBoldText,
	} = useAppearance();
	const { themeModes, textSizes, highlights } = useAppearanceOptions();
	const { scheme } = useTheme();
	const { t } = useTranslation();

	const brightnessOptions = useMemo(
		() =>
			themeModes.map<PreviewOption<ThemeMode>>((option) => ({
				...option,
				preview: <ThemePreview mode={option.value} highlight={highlight} />,
			})),
		[themeModes, highlight],
	);

	return (
		<Screen
			title={t("appearance.title")}
			subtitle={t("appearance.subtitle")}
			onBack={() => router.back()}
			withTabBar={false}
			stickyHeader
		>
			{/* Brightness and highlight share a card: they are one question asked
          twice — what colour is this app — and answering the first almost
          always leads straight to the second. */}
			<SettingCard
				icon="appearance"
				title={t("appearance.themeTitle")}
				description={
					themeMode === "system"
						? t("appearance.brightnessFollowing", {
								scheme: t(
									scheme === "dark"
										? "appearance.schemeDark"
										: "appearance.schemeLight",
								),
							})
						: t("appearance.brightnessFixed")
				}
			>
				<SettingField label={t("appearance.brightness")}>
					<PreviewChoice
						label={t("appearance.brightness")}
						options={brightnessOptions}
						value={themeMode}
						onChange={setThemeMode}
					/>
				</SettingField>

				<View style={{ height: Spacing.md }} />

				<SettingField
					label={t("appearance.highlightTitle")}
					description={t("appearance.highlightDescription")}
				>
					<ColorChoice
						label={t("appearance.highlightTitle")}
						options={highlights}
						value={highlight}
						onChange={setHighlight}
					/>
				</SettingField>
			</SettingCard>

			<SettingCard
				icon="textSize"
				title={t("appearance.textSize")}
				description={t("appearance.textSizeDescription")}
			>
				<StepSlider
					label={t("appearance.textSize")}
					options={textSizes}
					value={textSize}
					onChange={setTextSize}
					minLabel={<SizeMark size="normal" />}
					maxLabel={<SizeMark size="largest" />}
				/>
			</SettingCard>

			<SettingCard
				icon="boldText"
				title={t("appearance.boldTitle")}
				description={t("appearance.boldDescription")}
			>
				<Toggle
					label={t("appearance.boldToggle")}
					description={t("appearance.boldToggleDescription")}
					value={boldText}
					onChange={setBoldText}
				/>
			</SettingCard>

			<SettingCard
				icon="info"
				title={t("appearance.sample")}
				description={t("appearance.sampleDescription")}
			>
				<Preview />
			</SettingCard>
		</Screen>
	);
}

/**
 * A miniature Smaran in the palette being offered. "Match my phone" is the one
 * option with nothing of its own to show, so it shows both halves at once.
 */
function ThemePreview({
	mode,
	highlight,
}: {
	mode: ThemeMode;
	highlight: HighlightColor;
}) {
	if (mode !== "system") {
		return <PhoneFace palette={themeColors(mode, highlight)} />;
	}

	return (
		<View style={styles.split}>
			<PhoneFace palette={themeColors("light", highlight)} />
			{/* The dark half is the same drawing, clipped to the right of the frame:
          the inner view is twice the width of its window, so both faces line up
          and the split falls down the middle of the phone. */}
			<View style={styles.splitWindow}>
				<View style={styles.splitInner}>
					<PhoneFace palette={themeColors("dark", highlight)} />
				</View>
			</View>
		</View>
	);
}

/**
 * A sketch of Smaran itself, at about a thumbnail's size: the greeting and the
 * reader's portrait along the top, a row of shortcut tiles under it, two
 * reminder rows, and the five-tab bar along the bottom.
 *
 * It is drawn from the same palette the real screens read, so it is a genuine
 * answer to "what will this look like?" rather than an illustration of one —
 * the highlight the reader picked lands on the filled tile and the open tab
 * here too. The shapes are traced rather than lettered because at this size
 * type would be a grey smudge, and a smudge is not a thing anyone can judge.
 */
function PhoneFace({ palette }: { palette: ThemeColors }) {
	const card = {
		backgroundColor: palette.surface,
		borderColor: palette.border,
	};
	const ink = { backgroundColor: palette.textSecondary };
	const quiet = { backgroundColor: palette.surfaceMuted };
	const accent = { backgroundColor: palette.primary };
	const onAccent = { backgroundColor: palette.onPrimary };

	return (
		<View style={[styles.face, { backgroundColor: palette.background }]}>
			<View style={styles.faceHeader}>
				<View style={styles.faceHeaderText}>
					<View style={[styles.faceTitle, ink]} />
					<View style={[styles.faceSubtitle, quiet]} />
				</View>
				<View style={[styles.faceAvatar, quiet]} />
			</View>

			{/* The first tile is filled, as the one primary action on a screen is. */}
			<View style={styles.faceGrid}>
				{[0, 1, 2].map((tile) => (
					<View
						key={tile}
						style={[styles.faceTile, tile === 0 ? accent : card]}
					>
						<View
							style={[
								styles.faceTileMark,
								tile === 0 ? onAccent : { backgroundColor: palette.primary },
							]}
						/>
						<View
							style={[styles.faceTileLine, tile === 0 ? onAccent : quiet]}
						/>
					</View>
				))}
			</View>

			{[0, 1, 2, 3].map((row) => (
				<View key={row} style={[styles.faceRow, card]}>
					<View
						style={[
							styles.faceRowIcon,
							// The first row is the next thing due, and carries the tint the
							// real Today screen gives it.
							row === 0
								? { backgroundColor: palette.primaryMuted }
								: { backgroundColor: palette.surfaceMuted },
						]}
					/>
					<View style={styles.faceLines}>
						<View style={[styles.faceLine, ink]} />
						<View style={[styles.faceLineShort, quiet]} />
					</View>
				</View>
			))}

			<View style={[styles.faceButton, accent]} />

			<View style={[styles.faceTabs, card]}>
				<View style={[styles.faceTabActive, accent]} />
				{[0, 1, 2, 3].map((tab) => (
					<View key={tab} style={[styles.faceTab, quiet]} />
				))}
			</View>
		</View>
	);
}

/**
 * The letter that marks each end of the text size slider, drawn at the size
 * that end produces.
 *
 * The size is worked out from the type scale rather than from `Text`, which
 * would draw both marks at whatever is currently chosen and leave the slider
 * with two identical ends.
 */
function SizeMark({ size }: { size: TextSize }) {
	const { t } = useTranslation();
	const step = TextSizeScales[size];

	return (
		<Text
			// Not announced: the stops themselves are named, and a screen reader
			// meeting "Aa" twice on the way to them learns nothing.
			accessibilityElementsHidden
			importantForAccessibility="no"
			style={{
				fontSize: Math.round(TextStyles.body.fontSize * step),
				lineHeight: Math.round(TextStyles.body.lineHeight * step),
			}}
		>
			{t("appearance.sampleLetter")}
		</Text>
	);
}

/**
 * A real reminder rather than a line of dummy text. Judging a text size is
 * easier against something you already know how to read.
 */
function Preview() {
	const { t } = useTranslation();

	return (
		<Surface tone="muted">
			<View style={styles.preview}>
				<Text variant="caption" color="textSecondary">
					{t("appearance.sampleTime")}
				</Text>
				<Text variant="heading">{t("appearance.sampleTitle")}</Text>
				<Text variant="body" color="textSecondary">
					{t("appearance.sampleBody")}
				</Text>
			</View>
		</Surface>
	);
}

const styles = StyleSheet.create({
	preview: {
		gap: Spacing.xs,
	},
	split: {
		flex: 1,
	},
	splitWindow: {
		position: "absolute",
		top: 0,
		bottom: 0,
		right: 0,
		width: "50%",
		overflow: "hidden",
	},
	splitInner: {
		position: "absolute",
		top: 0,
		bottom: 0,
		right: 0,
		width: "200%",
	},
	face: {
		flex: 1,
		padding: scale(8),
		gap: scale(5),
	},
	faceHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: scale(4),
	},
	faceHeaderText: {
		flex: 1,
		gap: scale(3),
	},
	faceTitle: {
		height: scale(7),
		width: "70%",
		borderRadius: Radius.pill,
	},
	faceSubtitle: {
		height: scale(4),
		width: "45%",
		borderRadius: Radius.pill,
	},
	faceAvatar: {
		width: scale(13),
		height: scale(13),
		borderRadius: Radius.pill,
	},
	faceGrid: {
		flexDirection: "row",
		gap: scale(4),
	},
	faceTile: {
		flex: 1,
		height: scale(22),
		borderRadius: scale(5),
		borderWidth: StyleSheet.hairlineWidth * 2,
		padding: scale(4),
		justifyContent: "space-between",
	},
	faceTileMark: {
		width: scale(7),
		height: scale(7),
		borderRadius: Radius.pill,
	},
	faceTileLine: {
		height: scale(4),
		width: "80%",
		borderRadius: Radius.pill,
	},
	faceRow: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: scale(4),
		borderRadius: scale(5),
		borderWidth: StyleSheet.hairlineWidth * 2,
		padding: scale(4),
	},
	faceRowIcon: {
		width: scale(12),
		height: scale(12),
		borderRadius: scale(4),
	},
	faceLines: {
		flex: 1,
		gap: scale(3),
	},
	faceLine: {
		height: scale(4),
		width: "100%",
		borderRadius: Radius.pill,
	},
	faceLineShort: {
		height: scale(4),
		width: "60%",
		borderRadius: Radius.pill,
	},
	faceButton: {
		height: scale(10),
		borderRadius: Radius.pill,
	},
	faceTabs: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-around",
		height: scale(14),
		borderRadius: Radius.pill,
		borderWidth: StyleSheet.hairlineWidth * 2,
		paddingHorizontal: scale(4),
	},
	faceTab: {
		width: scale(4),
		height: scale(4),
		borderRadius: Radius.pill,
	},
	faceTabActive: {
		width: scale(10),
		height: scale(4),
		borderRadius: Radius.pill,
	},
});
