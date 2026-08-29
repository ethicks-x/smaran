import * as Localization from "expo-localization";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { DefaultLanguage, isLanguage, type Language } from "@/i18n/languages";
import as from "@/i18n/locales/as.json";
import bn from "@/i18n/locales/bn.json";
import en from "@/i18n/locales/en.json";
import hi from "@/i18n/locales/hi.json";

/**
 * Every language ships inside the bundle.
 *
 * This is the whole reason localisation here does not need a network: the four
 * catalogues are a few tens of kilobytes of text, so carrying all of them costs
 * less than the code that would be needed to fetch one. Switching language is
 * an in-memory lookup that works on a phone that has never seen a signal, which
 * matters because the moment someone most wants their own language is not a
 * moment we get to choose.
 */
const resources = {
  en: { translation: en },
  hi: { translation: hi },
  bn: { translation: bn },
  as: { translation: as },
} as const;

/**
 * English is the source catalogue, so its shape is the contract every key is
 * checked against. A key that is not in `en.json` is a compile error, and a
 * translation that drops one falls back to the English string rather than
 * showing the reader a raw key.
 */
declare module "i18next" {
  interface CustomTypeOptions {
    resources: { translation: typeof en };
    returnNull: false;
  }
}

/**
 * What the phone is set to, if Smaran speaks it.
 *
 * Only ever a starting point. The reader's own choice is stored on the device
 * and applied before the first frame — see `use-language.tsx` — because a phone
 * handed over by a grandchild is often still set to whatever they left it on.
 */
export function deviceLanguage(): Language {
  for (const locale of Localization.getLocales()) {
    if (isLanguage(locale.languageCode)) {
      return locale.languageCode;
    }
  }

  return DefaultLanguage;
}

i18next.use(initReactI18next).init({
  resources,
  lng: deviceLanguage(),
  fallbackLng: DefaultLanguage,
  // React escapes everything it renders already; escaping here would turn an
  // apostrophe in a patient's own name into `&#39;` on screen.
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function changeLanguage(language: Language) {
  return i18next.changeLanguage(language);
}

export {
  DefaultLanguage,
  type Language,
  Languages,
  localeOf,
} from "./languages";

export default i18next;
