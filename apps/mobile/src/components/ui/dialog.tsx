import { Icon } from "@expo/ui";
import type { ReactNode } from "react";
import { Modal, Platform, ScrollView, StyleSheet, View } from "react-native";

import { type AppIconName, AppIcons } from "@/components/ui/icons";
import { NativeHost } from "@/components/ui/native-host";
import { Surface } from "@/components/ui/surface";
import { Text } from "@/components/ui/text";
import { useThemeColors } from "@/hooks/use-theme";
import { MaxContentWidth, Spacing, scale } from "@/theme";

const DIALOG_ICON = scale(44);

/** A dialog is narrower than a page: it is one thing to read, not a screen. */
const DIALOG_WIDTH = MaxContentWidth * 0.8;

export type DialogProps = {
	visible: boolean;
	/** The whole point of the dialog, in one line. Announced as the heading. */
	title: string;
	/** One warm sentence under the title. */
	message?: string;
	icon?: AppIconName;
	/** Played over the whole dialog — a celebration, usually nothing. */
	celebration?: ReactNode;
	/** Anything that belongs between the message and the buttons — a summary of
	 * what just happened, most often. Kept apart from `children` so the buttons
	 * stay the last thing in the card and the first thing reached. */
	details?: ReactNode;
	/** The way out. Android's back gesture lands here too, so there is always
	 * one, and it must never leave the reader somewhere they cannot act. */
	onRequestClose: () => void;
	/** The buttons, stacked full width. Keep one of them filled. */
	children?: ReactNode;
};

/**
 * A centred card over a dimmed page.
 *
 * It has no close button in the corner and cannot be dismissed by tapping
 * beside it: for this reader a tap that lands slightly wide should do nothing
 * at all rather than quietly take the dialog away. The way out is one of the
 * labelled buttons inside it.
 */
export function Dialog({
	visible,
	title,
	message,
	icon,
	celebration,
	details,
	onRequestClose,
	children,
}: DialogProps) {
	const colors = useThemeColors();

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			statusBarTranslucent
			onRequestClose={onRequestClose}
		>
			<View style={[styles.scrim, { backgroundColor: colors.overlay }]}>
				{/* The width lives on the wrapper: `Surface` hands its own style to the
            card inside the shadow, and a card sized as a share of a wrapper it
            is itself sizing would have nothing to measure against. */}
				<View style={styles.sizer}>
					<Surface elevated style={styles.card}>
						{/* The card scrolls rather than clipping. At the largest text size
                a dialog carrying a summary and three buttons is taller than a
                small phone, and a button pushed off the bottom edge would leave
                the reader with no way out at all. */}
						<ScrollView
							style={styles.scroll}
							contentContainerStyle={styles.content}
							showsVerticalScrollIndicator={false}
							bounces={false}
						>
							{icon ? (
								<NativeHost>
									<Icon
										name={AppIcons[icon]}
										size={DIALOG_ICON}
										color={colors.primary}
									/>
								</NativeHost>
							) : null}

							<Text variant="heading" center accessibilityRole="header">
								{title}
							</Text>

							{message ? (
								<Text variant="bodyLarge" center>
									{message}
								</Text>
							) : null}

							{details}

							{children ? <View style={styles.actions}>{children}</View> : null}
						</ScrollView>
					</Surface>
				</View>

				{/* Over the card rather than behind it. It is laid out last, and raised
						on Android besides, because the card carries an elevation of its own
						and a later sibling without one would still paint underneath it. It
						takes no touches and the paper is sparse, so the words stay both
						reachable and readable through it. */}
				<View style={styles.celebration} pointerEvents="none">
					{celebration}
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	scrim: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: Spacing.xl,
	},
	sizer: {
		width: "100%",
		maxWidth: DIALOG_WIDTH,
		// Bounds the card, which is what gives the scroll view inside it something
		// to scroll within.
		maxHeight: "100%",
	},
	card: {
		paddingVertical: Spacing["2xl"],
	},
	scroll: {
		alignSelf: "stretch",
		// Sizes to its content and only then gives way: without the shrink it would
		// keep its full height against the cap above and push the card off screen,
		// and with a grow it would stretch a two-line dialog to the whole display.
		flexGrow: 0,
		flexShrink: 1,
	},
	content: {
		alignItems: "center",
		gap: Spacing.md,
	},
	celebration: {
		position: "absolute",
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		zIndex: 1,
		...Platform.select({ android: { elevation: 24 }, default: {} }),
	},
	actions: {
		alignSelf: "stretch",
		marginTop: Spacing.md,
		gap: Spacing.md,
	},
});
