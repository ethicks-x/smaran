import { Icon } from "@expo/ui";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type AppIconName, AppIcons, NativeHost, Text } from "@/components/ui";
import { useScrollBackdrop } from "@/hooks/use-scroll-backdrop";
import { useThemeColors } from "@/hooks/use-theme";
import {
	HitSlop,
	MaxContentWidth,
	Radius,
	Spacing,
	scale,
	TouchTarget,
} from "@/theme";

const CONTROL_ICON = scale(28);

/**
 * The frame a game is played in, rather than the frame a page is read in.
 *
 * `Screen` is the page: a large title, a sentence under it saying what the page
 * is for, and a labelled Back control above both. All three are right for
 * something you read and wrong for something you are in the middle of doing —
 * a board wants the screen, and the words explaining it have already been read
 * on the way in.
 *
 * So a game gets one short bar instead: the way out on the left, which board
 * this is in the middle, and the settings on the right. Both controls are icons
 * without a word beside them, which is the one place in the app that is true
 * (§2.3) — a cross and a gear in the corners of something being played are
 * about as recognised as a picture gets, they are the same two corners on every
 * game, and both are announced in full to a screen reader. Anything else on
 * this row would be competing with the board for the reader's attention.
 *
 * The bar is the top of the board's page and travels with it, so a game that
 * fits on one screen — which is most of them — spends none of that screen on
 * chrome. Only the strip behind the status bar is painted, and only once the
 * board has scrolled up under it.
 */
export type GameFrameProps = {
	/** Which board this is. The one piece of text on the bar. */
	title: string;
	/** Leaves the game. */
	onClose: () => void;
	/** Opens the reader's settings — type size and colours, mid-game. */
	onSettings: () => void;
	closeLabel: string;
	settingsLabel: string;
	children?: ReactNode;
};

export function GameFrame({
	title,
	onClose,
	onSettings,
	closeLabel,
	settingsLabel,
	children,
}: GameFrameProps) {
	const colors = useThemeColors();
	const insets = useSafeAreaInsets();
	const { onScroll, backdropStyle } = useScrollBackdrop();

	return (
		<View style={[styles.root, { backgroundColor: colors.background }]}>
			<Animated.ScrollView
				style={styles.scroller}
				contentContainerStyle={[
					styles.centerer,
					{ paddingTop: insets.top + Spacing.lg },
				]}
				onScroll={onScroll}
				scrollEventThrottle={16}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.content}>
					<View style={styles.bar}>
						<ControlButton
							icon="close"
							label={closeLabel}
							onPress={onClose}
							tone="danger"
						/>

						<Text
							variant="heading"
							center
							accessibilityRole="header"
							style={styles.title}
						>
							{title}
						</Text>

						<ControlButton
							icon="settings"
							label={settingsLabel}
							onPress={onSettings}
							tone="muted"
						/>
					</View>

					{children}
				</View>
			</Animated.ScrollView>

			<Animated.View
				style={[
					styles.backdrop,
					{
						height: insets.top,
						backgroundColor: colors.surface,
						borderBottomColor: colors.border,
					},
					backdropStyle,
				]}
				pointerEvents="none"
			/>

			<View
				style={{ height: insets.bottom, backgroundColor: colors.surface }}
			/>
		</View>
	);
}

function ControlButton({
	icon,
	label,
	onPress,
	tone,
}: {
	icon: AppIconName;
	label: string;
	onPress: () => void;
	tone: "danger" | "muted";
}) {
	const colors = useThemeColors();

	return (
		<Pressable
			onPress={onPress}
			hitSlop={HitSlop}
			accessibilityRole="button"
			accessibilityLabel={label}
			style={({ pressed }) => [
				styles.control,
				{
					backgroundColor:
						tone === "danger" ? colors.dangerMuted : colors.surfaceMuted,
				},
				pressed && styles.pressed,
			]}
		>
			<NativeHost>
				<Icon
					name={AppIcons[icon]}
					size={CONTROL_ICON}
					color={tone === "danger" ? colors.danger : colors.text}
				/>
			</NativeHost>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
	scroller: {
		flex: 1,
	},
	centerer: {
		flexGrow: 1,
		alignItems: "center",
		paddingHorizontal: Spacing.xl,
		paddingBottom: Spacing["2xl"],
	},
	content: {
		width: "100%",
		maxWidth: MaxContentWidth,
		flexGrow: 1,
		gap: Spacing.xl,
	},
	title: {
		flex: 1,
	},
	backdrop: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	bar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: Spacing.lg,
	},
	control: {
		width: TouchTarget.min,
		height: TouchTarget.min,
		borderRadius: Radius.pill,
		alignItems: "center",
		justifyContent: "center",
	},
	pressed: {
		opacity: 0.6,
	},
});
