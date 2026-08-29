/**
 * The languages Smaran speaks.
 *
 * Scoped to what can be translated and checked by a human before the deadline
 * rather than to every language of the North East: English, Hindi, and the two
 * that between them cover most of the Brahmaputra valley. Adding a fifth is a
 * locale file and a row in this table — see `artifacts/decisions.md` D-12 for
 * what else a new script may drag in with it.
 *
 * Each entry names itself in its own script. A reader looking for their
 * language is looking for the word they would write, not the English name for
 * it, and that is true even on a day when reading English is hard.
 */
export type Language = "en" | "hi" | "bn" | "as";

export type LanguageEntry = {
  code: Language;
  /** The language's name in the language itself. */
  endonym: string;
  /**
   * The tag handed to `Intl` for dates and numbers. Regional on purpose: an
   * Indian English date reads `29 August 2026`, an American one `August 29`.
   *
   * Every tag pins Latin digits. Left alone, `bn-IN` and `as-IN` number a date
   * in Bengali digits while a count interpolated into a sentence stays Latin,
   * and one screen ends up carrying both. Latin is the side to land on: it is
   * what the reader's clock, phone keypad and medicine packet already use, and
   * a time or a dose read in the wrong digits is a safety problem rather than a
   * cosmetic one. Worth revisiting per language once a native reader has had a
   * look — it is one field.
   */
  locale: string;
};

export const Languages = [
  { code: "en", endonym: "English", locale: "en-IN-u-nu-latn" },
  { code: "hi", endonym: "हिन्दी", locale: "hi-IN-u-nu-latn" },
  { code: "bn", endonym: "বাংলা", locale: "bn-IN-u-nu-latn" },
  { code: "as", endonym: "অসমীয়া", locale: "as-IN-u-nu-latn" },
] as const satisfies readonly LanguageEntry[];

export const DefaultLanguage: Language = "en";

/** Every code Smaran ships, in the order they are offered. */
export const LanguageCodes = Languages.map((entry) => entry.code);

export const isLanguage = (value: unknown): value is Language =>
  Languages.some((entry) => entry.code === value);

export const localeOf = (language: Language) =>
  Languages.find((entry) => entry.code === language)?.locale ??
  "en-IN-u-nu-latn";
