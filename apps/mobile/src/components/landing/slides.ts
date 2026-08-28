import type { ImageSourcePropType } from "react-native";

export type LandingSlide = {
  /** Stable key — also the art file's name in `assets/images/landing`. */
  key: string;
  /** Kicker over the headline — names the tab this page is about, so the word
   * is already familiar when they meet it inside. */
  kicker: string;
  /** The promise, in a handful of words. Two short lines is the target. */
  title: string;
  /** One sentence saying what the reader gets. Plain language, no jargon. */
  body: string;
  /** Full-bleed art, WebP. Dark enough to carry white type — see PROMPTS.md. */
  art: ImageSourcePropType;
};

/**
 * The landing story: four pages, one per thing the app does, in the order the
 * tabs sit in. The last page is where signing in happens.
 *
 * The art is placeholder work — dark colour fields with light pooling low in
 * the frame, where a photograph’s subject would be. The
 * prompt for each final illustration is in `assets/images/landing/PROMPTS.md`;
 * dropping a new file in beside the old one is the whole swap.
 */
export const LandingSlides: readonly LandingSlide[] = [
  {
    key: "today",
    kicker: "Today",
    title: "Your day, one thing at a time",
    body: "Reminders and medicines arrive in order, with a single large button to mark each one done.",
    art: require("@/assets/images/landing/today.webp"),
  },
  {
    key: "people",
    kicker: "People",
    title: "The people who matter, always close",
    body: "Faces and names you can tap to call, so no one is ever more than one touch away.",
    art: require("@/assets/images/landing/people.webp"),
  },
  {
    key: "memories",
    kicker: "Memories",
    title: "Memories, kept where you can find them",
    body: "Photos and moments your family shares land here, ready to look back on any time.",
    art: require("@/assets/images/landing/memories.webp"),
  },
  {
    key: "help",
    kicker: "Help",
    title: "Help, the moment you need it",
    body: "One tap reaches the person you trust most — day or night, wherever you are.",
    art: require("@/assets/images/landing/help.webp"),
  },
];
