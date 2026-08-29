import * as SecureStore from "expo-secure-store";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import i18n, { changeLanguage } from "@/i18n";
import {
  DefaultLanguage,
  isLanguage,
  type Language,
  localeOf,
} from "@/i18n/languages";

const STORAGE_KEY = "smaran.language";

export type LanguageValue = {
  /** The language Smaran is speaking right now. */
  language: Language;
  /** The tag to hand `Intl` for dates and numbers in that language. */
  locale: string;
  /** False until the stored choice has been read back and applied. */
  isLoaded: boolean;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageValue | null>(null);

/**
 * Holds the language Smaran speaks, and writes each change back to the device.
 *
 * The stored choice beats the phone's own locale on purpose. These phones are
 * often set up by a grandchild and then handed over, so the system language is
 * a guess about the wrong person; it is only ever the opening offer, made once
 * in `deviceLanguage()` and overruled here the moment a real choice exists.
 *
 * Nothing here touches the network. Every catalogue is already in the bundle,
 * so changing language is a lookup — which is what makes it safe to offer to
 * someone sitting in a house with no signal.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() =>
    isLanguage(i18n.language) ? i18n.language : DefaultLanguage,
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    read().then(async (stored) => {
      // Applied before the flag lifts, so no screen ever paints a frame in the
      // phone's language and then corrects itself to the reader's.
      if (stored && stored !== i18n.language) {
        await changeLanguage(stored);
      }

      if (!cancelled) {
        if (stored) {
          setLanguageState(stored);
        }
        setIsLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    changeLanguage(next);
    write(next);
  }, []);

  const value = useMemo<LanguageValue>(
    () => ({
      language,
      locale: localeOf(language),
      isLoaded,
      setLanguage,
    }),
    [language, isLoaded, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/** The current language, and the setter that changes it. */
export function useLanguage(): LanguageValue {
  return useContext(LanguageContext) ?? FALLBACK;
}

/**
 * The tag for `Intl` — dates, times, numbers. Anything formatting one of those
 * must go through here rather than passing `undefined` and inheriting the
 * phone's locale, which is not necessarily the language on screen.
 */
export function useLocale(): string {
  return useLanguage().locale;
}

/**
 * Outside the provider the app still speaks whatever `i18n` was initialised
 * with, so a screen rendered on its own reads correctly — it just cannot store
 * a change.
 */
const FALLBACK: LanguageValue = {
  language: DefaultLanguage,
  locale: localeOf(DefaultLanguage),
  isLoaded: true,
  setLanguage: () => {},
};

/**
 * A language preference is not a secret, but `expo-secure-store` is the only
 * key/value store the app already ships, and it is where the appearance choices
 * live. Every call may fail quietly: falling back to the phone's language is a
 * far smaller harm than refusing to start.
 */
async function read(): Promise<Language | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);

    return isLanguage(raw) ? raw : null;
  } catch {
    return null;
  }
}

function write(language: Language) {
  SecureStore.setItemAsync(STORAGE_KEY, language).catch(() => {});
}
