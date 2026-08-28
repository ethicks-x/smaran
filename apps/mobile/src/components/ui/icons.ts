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
} as const;

export type AppIconName = keyof typeof AppIcons;
