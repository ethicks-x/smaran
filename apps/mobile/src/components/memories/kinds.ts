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
