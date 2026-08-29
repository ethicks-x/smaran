import type { ImageSourcePropType } from "react-native";

/** Also the art file's name, and the key its copy sits under in the locales. */
export type LandingSlideKey = "today" | "people" | "memories" | "help";

export type LandingSlide = {
  key: LandingSlideKey;
  /** Full-bleed art, WebP. Dark enough to carry white type — see PROMPTS.md. */
  art: ImageSourcePropType;
};

/**
 * The landing story: four pages, one per thing the app does, in the order the
 * tabs sit in. The last page is where signing in happens.
 *
 * Only the art lives here. Each page's kicker, headline and sentence are in the
 * locale catalogues under `landing.slides.<key>` — this is the first screen
 * anyone ever sees, so it is the last place that should still be in English
 * when the phone is not.
 *
 * The art is placeholder work — dark colour fields with light pooling low in
 * the frame, where a photograph's subject would be. The prompt for each final
 * illustration is in `assets/images/landing/PROMPTS.md`; dropping a new file in
 * beside the old one is the whole swap.
 */
export const LandingSlides: readonly LandingSlide[] = [
  { key: "today", art: require("@/assets/images/landing/today.webp") },
  { key: "people", art: require("@/assets/images/landing/people.webp") },
  { key: "memories", art: require("@/assets/images/landing/memories.webp") },
  { key: "help", art: require("@/assets/images/landing/help.webp") },
];
