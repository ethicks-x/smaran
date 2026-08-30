import * as SecureStore from "expo-secure-store";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import type { Choice } from "@/components/ui";
import type { HighlightColor, TextSize, ThemeMode } from "@/theme";
import { HighlightColors, TextSizes, ThemeModes } from "@/theme";

const STORAGE_KEY = "smaran.appearance";

export type AppearancePreferences = {
  /** What the reader chose, which is not always what is on screen. */
  themeMode: ThemeMode;
  textSize: TextSize;
  /** Recolours the `primary` triple only — never a warning or an SOS. */
  highlight: HighlightColor;
  /** Sets every weight in the type scale one step heavier. */
  boldText: boolean;
};

export type AppearanceValue = AppearancePreferences & {
  /** False until the stored choice has been read back from the device. */
  isLoaded: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setTextSize: (size: TextSize) => void;
  setHighlight: (highlight: HighlightColor) => void;
  setBoldText: (boldText: boolean) => void;
};

const DEFAULTS: AppearancePreferences = {
  themeMode: "system",
  textSize: "normal",
  highlight: "blue",
  boldText: false,
};

/**
 * Null outside the provider. Every consumer falls back to {@link DEFAULTS} so a
 * component rendered on its own — a test, a preview — still draws correctly.
 */
const AppearanceContext = createContext<AppearanceValue | null>(null);

/**
 * Holds the reader's appearance choices and writes each change back to the
 * device.
 *
 * The choices are the first thing seen on every launch, so they are read before
 * the splash screen lifts: a first frame in the wrong theme, corrected a moment
 * later, reads as a fault rather than a preference being applied.
 */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] =
    useState<AppearancePreferences>(DEFAULTS);
  const [isLoaded, setIsLoaded] = useState(false);

  /** The last value written to the device, so a restore is not echoed back. */
  const persisted = useRef(preferences);

  useEffect(() => {
    let cancelled = false;

    read().then((stored) => {
      if (!cancelled) {
        if (stored) {
          // Recorded as already-persisted, so restoring does not write back.
          persisted.current = stored;
          setPreferences(stored);
        }
        setIsLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<AppearancePreferences>) => {
    setPreferences((current) => ({ ...current, ...patch }));
  }, []);

  // Storing the choice is not what the reader is waiting for — seeing it is.
  // Writing from an effect keeps the native call out of the render that repaints
  // the app, and out of the double-invoked state updater it used to sit in.
  useEffect(() => {
    if (!isLoaded || preferences === persisted.current) {
      return;
    }

    persisted.current = preferences;
    write(preferences);
  }, [preferences, isLoaded]);

  const value = useMemo<AppearanceValue>(
    () => ({
      ...preferences,
      isLoaded,
      setThemeMode: (themeMode) => update({ themeMode }),
      setTextSize: (textSize) => update({ textSize }),
      setHighlight: (highlight) => update({ highlight }),
      setBoldText: (boldText) => update({ boldText }),
    }),
    [preferences, isLoaded, update],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

/** The reader's appearance choices, and the setters that change them. */
export function useAppearance(): AppearanceValue {
  const value = useContext(AppearanceContext);

  return (
    value ?? {
      ...DEFAULTS,
      isLoaded: true,
      setThemeMode: noop,
      setTextSize: noop,
      setHighlight: noop,
      setBoldText: noop,
    }
  );
}

/**
 * The stored choices only, without the setters. Kept separate so the low-level
 * primitives that read a preference on every render — `Text`, `useColorScheme`
 * — do not have to reach for a context that may not be mounted.
 */
export function useAppearancePreferences(): AppearancePreferences {
  const value = useContext(AppearanceContext);

  return value ?? DEFAULTS;
}

/**
 * The appearance choices, labelled in the reader's own language.
 *
 * Built here rather than in the token table so there is exactly one place that
 * knows a `ThemeMode` is named by `appearance.mode.<value>` — the Appearance
 * screen offers these rows and the Account screen summarises them, and the two
 * must never drift apart.
 */
export function useAppearanceOptions() {
  const { t } = useTranslation();

  return useMemo(
    () => ({
      themeModes: ThemeModes.map<Choice<ThemeMode>>((value) => ({
        value,
        label: t(`appearance.mode.${value}.label`),
        description: t(`appearance.mode.${value}.description`),
      })),
      textSizes: TextSizes.map<Choice<TextSize>>((value) => ({
        value,
        label: t(`appearance.size.${value}.label`),
        description: t(`appearance.size.${value}.description`),
      })),
      highlights: HighlightColors.map<Choice<HighlightColor>>((value) => ({
        value,
        label: t(`appearance.highlight.${value}`),
      })),
    }),
    [t],
  );
}

/**
 * Four settings and no secrets, but `expo-secure-store` is the only key/value
 * store the app already ships. It is unavailable on the web build, so every
 * call is allowed to fail quietly — losing a preference is a smaller harm than
 * refusing to start.
 */
async function read(): Promise<AppearancePreferences | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);

    return raw ? parse(raw) : null;
  } catch {
    return null;
  }
}

function write(preferences: AppearancePreferences) {
  SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(preferences)).catch(
    () => {},
  );
}

/** Anything unrecognised — an older build, a hand-edited value — falls back. */
function parse(raw: string): AppearancePreferences | null {
  try {
    const stored = JSON.parse(raw) as Partial<AppearancePreferences>;

    return {
      themeMode: isThemeMode(stored.themeMode)
        ? stored.themeMode
        : DEFAULTS.themeMode,
      textSize: isTextSize(stored.textSize)
        ? stored.textSize
        : DEFAULTS.textSize,
      highlight: isHighlight(stored.highlight)
        ? stored.highlight
        : DEFAULTS.highlight,
      boldText:
        typeof stored.boldText === "boolean"
          ? stored.boldText
          : DEFAULTS.boldText,
    };
  } catch {
    return null;
  }
}

const isThemeMode = (value: unknown): value is ThemeMode =>
  ThemeModes.some((mode) => mode === value);

const isTextSize = (value: unknown): value is TextSize =>
  TextSizes.some((size) => size === value);

const isHighlight = (value: unknown): value is HighlightColor =>
  HighlightColors.some((highlight) => highlight === value);

/** No-op for the no-provider case: nothing to change, nothing to store. */
function noop() {}
