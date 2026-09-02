import type { AppIconName } from "@/components/ui";
import type { MemorySubjectKind } from "@/db/schema";

/**
 * The picture each category gets when a subject has no photograph of its own.
 *
 * A landmark rather than a decoration: the categories are always in the same
 * order with the same mark beside the same heading, so a reader who has been
 * here before finds People without reading the word. The word is always there
 * too — an icon is never the only cue (`AGENTS.md` §2.3).
 */
export const KIND_ICON: Record<MemorySubjectKind, AppIconName> = {
  person: "people",
  place: "place",
  object: "object",
};

/**
 * The heading each category is shown under, as a key into the locale catalogue.
 *
 * A whole key per category, never a stem plus the kind glued on: the translation
 * of "People" is not the translation of "person" with something appended, and a
 * sentence built from fragments is a sentence that only works in English
 * (`decisions.md` D-12).
 */
export const KIND_TITLE = {
  person: "memories.people",
  place: "memories.places",
  object: "memories.objects",
  // `as const` and not a `Record<..., string>` annotation: the catalogue's keys
  // are a typed union, and widening these to `string` would put a key that does
  // not exist past the compiler.
} as const satisfies Record<MemorySubjectKind, string>;

/**
 * The one line under each category's own page heading, as a catalogue key.
 *
 * A whole key per category for the same reason {@link KIND_TITLE} is: these are
 * sentences, and a sentence assembled from a stem and a category name only ever
 * comes out right in English (`decisions.md` §D-12).
 */
export const KIND_SUBTITLE = {
  person: "memories.peopleSubtitle",
  place: "memories.placesSubtitle",
  object: "memories.objectsSubtitle",
} as const satisfies Record<MemorySubjectKind, string>;

/**
 * What the "See all" tile says when a screen reader reads it out.
 *
 * The tile itself has room for two words, and "See all" on its own is
 * meaningless once the heading above it has scrolled past or was never read —
 * so the accessible name says the category too.
 */
export const KIND_SEE_ALL = {
  person: "memories.seeAllPeople",
  place: "memories.seeAllPlaces",
  object: "memories.seeAllObjects",
} as const satisfies Record<MemorySubjectKind, string>;
