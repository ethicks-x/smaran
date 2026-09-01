import { Fragment, useState } from "react";
import {
	type KeyboardTypeOptions,
	type LayoutChangeEvent,
	StyleSheet,
	TextInput,
	useWindowDimensions,
	View,
} from "react-native";

import { Text } from "@/components/ui/text";
import { useThemeColors } from "@/hooks/use-theme";
import { Radius, Spacing, scale, TouchTarget } from "@/theme";

/**
 * How a single box should read: untyped, plain, right, right-letter-wrong-box,
 * or not in the answer at all.
 */
export type CodeBoxStatus =
	| "empty"
	| "filled"
	| "correct"
	| "present"
	| "absent";

export type CodeInputProps = {
	/** How many boxes to draw. Clamped to {@link MaxCodeLength}. */
	length: number;
	value: string;
	onChangeText: (value: string) => void;
	keyboardType?: KeyboardTypeOptions;
	/** Status per box, index-aligned. Defaults to plain filled/empty. */
	statuses?: CodeBoxStatus[];
	/** Drawn dimmed in an empty box — one per index, e.g. a space or a hint letter. */
	placeholders?: (string | undefined)[];
	/**
	 * Boxes per group. Set it to break a long code into chunks — `3` on nine
	 * boxes reads as 000-000-000. Unset draws one unbroken run.
	 */
	groupSize?: number;
	/** What sits between groups. Only drawn when `groupSize` is set. */
	separator?: string;
	autoFocus?: boolean;
	editable?: boolean;
	accessibilityLabel?: string;
};

/**
 * The longest code the row can draw and still keep every box tappable and
 * every glyph above the type floor on a phone. Longer values are truncated
 * rather than shrunk past what an older reader can see.
 */
export const MaxCodeLength = 10;

/**
 * The box never grows past this — a code on a tablet should read as a row of
 * boxes, not a row of billboards — and never shrinks past the floor, which is
 * where a glyph stops being legible at arm's length. Between the two the row
 * takes whatever the screen gives it.
 */
const MaxBoxWidth = scale(64);
const MinBoxWidth = scale(36);
/** Fixed so the width arithmetic below does not depend on measuring a glyph. */
const SeparatorWidth = Spacing.md;

/**
 * Divides the width the row was actually given between the boxes, the gaps and
 * the separators. Sizing from the viewport rather than from a table means ten
 * boxes fit a small phone and four still look right on a tablet.
 */
const boxSizeFor = (
	available: number,
	count: number,
	gap: number,
	separators: number,
) => {
	const spacing =
		gap * Math.max(count - 1, 0) + separators * (SeparatorWidth + gap);
	const fitted = Math.floor((available - spacing) / Math.max(count, 1));
	const width = Math.min(Math.max(fitted, MinBoxWidth), MaxBoxWidth);

	return {
		width,
		/** Taller than wide, the proportion a single character sits best in. */
		height: Math.max(Math.round(width * 1.25), TouchTarget.min),
		/** Type steps down with the box, but never below the body size. */
		variant: width >= scale(52) ? ("title" as const) : ("bodyLarge" as const),
	};
};

/**
 * One box per character, with a single invisible field laid over them
 * collecting the keystrokes. Splitting the answer into boxes shows how much is
 * left to type without asking anyone to count, and because the real field is
 * the thing being tapped, the keyboard opens the way it does anywhere else.
 */
export function CodeInput({
	length,
	value,
	onChangeText,
	keyboardType = "default",
	statuses,
	placeholders,
	groupSize,
	separator = "-",
	autoFocus = true,
	editable = true,
	accessibilityLabel,
}: CodeInputProps) {
	const colors = useThemeColors();
	const window = useWindowDimensions();

	/* Measured from the row itself, so the boxes answer to the padding of
     whatever card they were dropped into and not just to the screen. The
     window is only the guess for the first frame, before layout has run. */
	const [rowWidth, setRowWidth] = useState<number | null>(null);
	const available = rowWidth ?? window.width - Spacing.xl * 2;

	const count = Math.max(0, Math.min(length, MaxCodeLength));
	const gap = count > 6 ? Spacing.xs : Spacing.sm;

	const boxes = Array.from({ length: count }, (_, index) => index);
	const groups = groupsOf(boxes, groupSize);
	const { width, height, variant } = boxSizeFor(
		available,
		count,
		gap,
		groups.length - 1,
	);

	const onLayout = (event: LayoutChangeEvent) => {
		const measured = Math.round(event.nativeEvent.layout.width);
		setRowWidth((current) => (current === measured ? current : measured));
	};

	/** Where the next letter will land — the box that reads as "type here". */
	const active = Math.min(value.length, count - 1);

	const renderBox = (index: number) => {
		const character = value[index];
		const placeholder = placeholders?.[index];
		const status = statuses?.[index] ?? (character ? "filled" : "empty");
		const isActive = editable && index === active && !character;

		return (
			<View
				key={index}
				style={[
					styles.box,
					{
						width,
						height,
						backgroundColor: backgroundFor(status, colors),
						borderColor: isActive ? colors.primary : borderFor(status, colors),
					},
				]}
			>
				{/* A placeholder is a hint, not an answer, so it reads dimmer than
            anything the person actually typed. */}
				<Text
					variant={variant}
					color={character ? textFor(status) : "textMuted"}
					center
				>
					{character ?? placeholder ?? ""}
				</Text>
			</View>
		);
	};

	return (
		<View style={styles.row} onLayout={onLayout}>
			<View style={[styles.groups, { gap }]}>
				{groups.map((group, groupIndex) => (
					<Fragment key={group[0]}>
						{groupIndex > 0 ? (
							<Text
								variant={variant}
								color="textMuted"
								center
								importantForAccessibility="no"
								style={styles.separator}
							>
								{separator}
							</Text>
						) : null}
						<View style={[styles.group, { gap }]}>{group.map(renderBox)}</View>
					</Fragment>
				))}
			</View>

			{/* Invisible, but on top and full size: opacity does not affect touch
          handling, so every tap on a box lands on the field itself. An
          off-screen field would take the text but never the tap. */}
			<TextInput
				value={value}
				onChangeText={(next) => onChangeText(next.slice(0, count))}
				maxLength={count}
				editable={editable}
				keyboardType={keyboardType}
				autoFocus={autoFocus}
				autoCapitalize="none"
				autoCorrect={false}
				autoComplete="off"
				spellCheck={false}
				caretHidden
				importantForAutofill="no"
				accessibilityLabel={accessibilityLabel}
				style={[StyleSheet.absoluteFill, styles.field]}
			/>
		</View>
	);
}

/**
 * Chunks the indices for `groupSize`. Without a size it is one group, which is
 * the shape this component had before grouping existed.
 */
function groupsOf(indices: number[], size: number | undefined) {
	if (!size || size < 1 || size >= indices.length) {
		return [indices];
	}

	const chunks: number[][] = [];
	for (let start = 0; start < indices.length; start += size) {
		chunks.push(indices.slice(start, start + size));
	}
	return chunks;
}

const backgroundFor = (
	status: CodeBoxStatus,
	colors: ReturnType<typeof useThemeColors>,
) => {
	switch (status) {
		case "correct":
			return colors.successMuted;
		case "present":
			return colors.warningMuted;
		case "absent":
			return colors.dangerMuted;
		case "filled":
			return colors.surface;
		default:
			return colors.surfaceMuted;
	}
};

const borderFor = (
	status: CodeBoxStatus,
	colors: ReturnType<typeof useThemeColors>,
) => {
	switch (status) {
		case "correct":
			return colors.success;
		case "present":
			return colors.warning;
		case "absent":
			return colors.danger;
		default:
			return colors.border;
	}
};

const textFor = (status: CodeBoxStatus) => {
	switch (status) {
		case "correct":
			return "success" as const;
		case "present":
			return "warning" as const;
		case "absent":
			return "danger" as const;
		default:
			return "text" as const;
	}
};

const styles = StyleSheet.create({
	row: {
		width: "100%",
		alignItems: "center",
	},
	groups: {
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
		justifyContent: "center",
	},
	group: {
		flexDirection: "row",
		alignItems: "center",
	},
	separator: {
		width: SeparatorWidth,
	},
	box: {
		borderRadius: Radius.md,
		borderWidth: 2,
		alignItems: "center",
		justifyContent: "center",
	},
	field: {
		opacity: 0,
	},
});
