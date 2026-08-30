import { Icon } from "@expo/ui";

/**
 * Every icon the app uses, resolved once per platform: SF Symbols on iOS,
 * Material Symbols vector drawables on Android. `Icon.select` keeps the unused
 * platform's asset out of the bundle.
 *
 * Icons are always paired with a text label — never used as the only cue for
 * an action.
 */
export const AppIcons = {
	today: Icon.select({
		ios: "sun.max.fill",
		android: require("@expo/material-symbols/today.xml"),
	}),
	people: Icon.select({
		ios: "person.2.fill",
		android: require("@expo/material-symbols/group.xml"),
	}),
	memories: Icon.select({
		ios: "photo.on.rectangle.angled",
		android: require("@expo/material-symbols/photo_library.xml"),
	}),
	help: Icon.select({
		ios: "phone.fill",
		android: require("@expo/material-symbols/call.xml"),
	}),
	settings: Icon.select({
		ios: "gearshape.fill",
		android: require("@expo/material-symbols/settings.xml"),
	}),
	medication: Icon.select({
		ios: "pills.fill",
		android: require("@expo/material-symbols/medication.xml"),
	}),
	reminder: Icon.select({
		ios: "bell.fill",
		android: require("@expo/material-symbols/notifications.xml"),
	}),
	check: Icon.select({
		ios: "checkmark.circle.fill",
		android: require("@expo/material-symbols/check_circle.xml"),
	}),
	heart: Icon.select({
		ios: "heart.fill",
		android: require("@expo/material-symbols/favorite.xml"),
	}),
	emergency: Icon.select({
		ios: "exclamationmark.triangle.fill",
		android: require("@expo/material-symbols/emergency.xml"),
	}),
	profile: Icon.select({
		ios: "person.crop.circle.fill",
		android: require("@expo/material-symbols/account_circle.xml"),
	}),
	edit: Icon.select({
		ios: "pencil",
		android: require("@expo/material-symbols/edit.xml"),
	}),
	chevronDown: Icon.select({
		ios: "chevron.down",
		android: require("@expo/material-symbols/keyboard_arrow_down.xml"),
	}),
	textSize: Icon.select({
		ios: "textformat.size",
		android: require("@expo/material-symbols/format_size.xml"),
	}),
	info: Icon.select({
		ios: "info.circle.fill",
		android: require("@expo/material-symbols/info.xml"),
	}),
	privacy: Icon.select({
		ios: "lock.fill",
		android: require("@expo/material-symbols/lock.xml"),
	}),
	signOut: Icon.select({
		ios: "rectangle.portrait.and.arrow.right",
		android: require("@expo/material-symbols/logout.xml"),
	}),
	chevronRight: Icon.select({
		ios: "chevron.right",
		android: require("@expo/material-symbols/chevron_right.xml"),
	}),
	back: Icon.select({
		ios: "chevron.left",
		android: require("@expo/material-symbols/arrow_back.xml"),
	}),
	appearance: Icon.select({
		ios: "paintpalette.fill",
		android: require("@expo/material-symbols/palette.xml"),
	}),
	language: Icon.select({
		ios: "globe",
		android: require("@expo/material-symbols/language.xml"),
	}),
	security: Icon.select({
		ios: "lock.shield.fill",
		android: require("@expo/material-symbols/shield.xml"),
	}),
	sound: Icon.select({
		ios: "speaker.wave.2.fill",
		android: require("@expo/material-symbols/volume_up.xml"),
	}),
	highlight: Icon.select({
		ios: "paintbrush.pointed.fill",
		android: require("@expo/material-symbols/colorize.xml"),
	}),
	boldText: Icon.select({
		ios: "bold",
		android: require("@expo/material-symbols/format_bold.xml"),
	}),
	schedule: Icon.select({
		ios: "clock.fill",
		android: require("@expo/material-symbols/schedule.xml"),
	}),
	games: Icon.select({
		ios: "puzzlepiece.fill",
		android: require("@expo/material-symbols/extension.xml"),
	}),
	matching: Icon.select({
		ios: "square.grid.2x2.fill",
		android: require("@expo/material-symbols/grid_view.xml"),
	}),
	celebrate: Icon.select({
		ios: "sparkles",
		android: require("@expo/material-symbols/celebration.xml"),
	}),
} as const;

export type AppIconName = keyof typeof AppIcons;
