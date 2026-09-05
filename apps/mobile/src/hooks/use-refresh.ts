import { useAuth } from "@clerk/expo";
import { useCallback } from "react";

import { useCareLink } from "@/hooks/use-care-link";
import { sync } from "@/lib/sync";

/**
 * The shortest a pull can take before the spinner is allowed to leave.
 *
 * With the radio off a drain gives up in milliseconds, and a spinner that
 * appears and vanishes inside one frame reads as a gesture that did not work —
 * so it is pulled again, and again. Holding it for a beat says the app heard
 * the pull, which is the whole of what the gesture has to communicate.
 */
const MIN_SPINNER_MS = 700;

/**
 * What "pull down to check for anything new" actually does.
 *
 * It is the same drain the app runs on open and on coming back to the
 * foreground (`useSync`) — up first, then down — asked for by hand. That is the
 * point of it: the reader is looking at the screen when a caregiver adds a
 * reminder or a photograph, and until there is a connectivity trigger
 * (`decisions.md` D-33) the only way to catch that without leaving the app was
 * to leave the app.
 *
 * Nothing on a screen waits on this and nothing breaks when it fails. The pulled
 * rows land in the local store, which is what every screen was already reading,
 * so the page updates through the store's own listeners rather than through
 * anything returned here — the same path a background drain takes. A phone with
 * no signal spins for a moment and shows exactly what it showed before, which is
 * the honest answer: everything it has is already on it (`AGENTS.md` §2.1).
 *
 * The care link is refreshed alongside, not awaited — it corrects who the Help
 * button calls, and it reports its own progress through `isBusy`.
 */
export function useRefresh(): () => Promise<void> {
  const { getToken } = useAuth();
  const { refresh: refreshCareLink } = useCareLink();

  return useCallback(async () => {
    refreshCareLink();

    // `sync` never rejects — every outcome it has is a returned value — so
    // there is nothing here to catch and nothing to tell anyone.
    await Promise.all([
      sync(getToken),
      new Promise((resolve) => setTimeout(resolve, MIN_SPINNER_MS)),
    ]);
  }, [getToken, refreshCareLink]);
}
