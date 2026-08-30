import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type RecallValue = {
  /** True once the reader has recalled their own name this launch. */
  isRecalled: boolean;
  confirmRecall: () => void;
};

const RecallContext = createContext<RecallValue | null>(null);

/**
 * Holds whether the daily recall has been passed.
 *
 * Deliberately in memory only: the point of the exercise is that it happens
 * once each time the app is opened, so nothing about it is written to the
 * device or carried across launches.
 */
export function RecallProvider({ children }: { children: ReactNode }) {
  const [isRecalled, setIsRecalled] = useState(true);

  const confirmRecall = useCallback(() => setIsRecalled(true), []);

  const value = useMemo<RecallValue>(
    () => ({ isRecalled, confirmRecall }),
    [isRecalled, confirmRecall],
  );

  return (
    <RecallContext.Provider value={value}>{children}</RecallContext.Provider>
  );
}

/** Outside the provider nothing is gated — a screen on its own still renders. */
export function useRecall(): RecallValue {
  return useContext(RecallContext) ?? FALLBACK;
}

const FALLBACK: RecallValue = { isRecalled: true, confirmRecall: () => {} };
