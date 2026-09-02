import { useAuth } from "@clerk/expo";
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
import { AppState } from "react-native";

import {
  type Caregiver,
  type CareLink,
  type CareLinkFailure,
  type CareLinkStatus,
  failureOf,
  fetchLink,
  isLinked,
  readCachedLink,
  requestLink,
  UnknownLink,
  writeCachedLink,
} from "@/lib/care-link";

/**
 * How often the waiting screen asks whether the request has been answered.
 *
 * Only while a request is pending, and only while the app is open in front of
 * somebody watching a spinner — this is not background work and nothing depends
 * on it having run (§2.2). Once a link is accepted the polling stops with it.
 */
const POLL_INTERVAL_MS = 15 * 1000;

export type CareLinkValue = {
  /** False until the cached answer has been read back off the device. */
  isLoaded: boolean;
  status: CareLinkStatus;
  /** The caregiver the status belongs to, for the screen to show back. */
  caregiverSmaranId: number | null;
  /** Who looks after this reader, once they have accepted. Null until then. */
  caregiver: Caregiver | null;
  /** True once a caregiver has accepted: the app proper may open. */
  isLinked: boolean;
  /** A request or a refresh is in flight. */
  isBusy: boolean;
  /** Why the last attempt did not land, or null. */
  failure: CareLinkFailure | null;
  /** Ask the caregiver holding this number to look after the reader. */
  request: (smaranId: number) => void;
  /** Ask the server where the link stands now. */
  refresh: () => void;
};

const CareLinkContext = createContext<CareLinkValue | null>(null);

/**
 * Holds who looks after this reader, and remembers it on the device.
 *
 * The gate in `_layout.tsx` reads this, so the rule it has to keep is that the
 * **cache** decides and the network only corrects it. Opening the app waits on
 * a key/value read that works with the radio off; a phone that was set up once
 * never sees the setup screen again, whatever the signal is doing (§2.1).
 *
 * Setting up is the one flow that genuinely needs a network, and that is not a
 * violation so much as the shape of the problem: there is no way to learn that
 * a caregiver said yes without asking them. It sits beside the sign-in that also
 * needs a signal, happens once, and everything downstream of it is local.
 */
export function CareLinkProvider({ children }: { children: ReactNode }) {
  const {
    isLoaded: isAuthLoaded,
    isSignedIn,
    userId,
    getToken,
    signOut,
  } = useAuth();
  const [link, setLink] = useState<CareLink>(UnknownLink);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [failure, setFailure] = useState<CareLinkFailure | null>(null);

  const account = useRef<string | null>(null);
  const token = useRef(getToken);
  const authSignOut = useRef(signOut);

  useEffect(() => {
    account.current = userId ?? null;
    token.current = getToken;
    authSignOut.current = signOut;
  });

  // The cached answer, then — separately, and never awaited by the gate — the
  // server's. A phone with no signal stops after the first half and opens on
  // what it already knew.
  useEffect(() => {
    if (!isAuthLoaded) {
      return;
    }

    if (!isSignedIn || !userId) {
      // Signed out: there is nothing to gate and nothing to ask about. The
      // cached row stays on the device for the next launch of this account.
      setLink(UnknownLink);
      setIsLoaded(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      const cached = await readCachedLink(userId);

      if (cancelled) {
        return;
      }

      setLink(cached ?? UnknownLink);
      setIsLoaded(true);

      try {
        const fresh = await fetchLink(token.current);

        if (!cancelled) {
          setLink((current) => merge(current, fresh));
          await writeCachedLink(userId, fresh);

          if (fresh.status === "revoked") {
            await authSignOut.current?.();
          }
        }
      } catch {
        // Offline, or an API that could not answer. The cached status stands and
        // the reader is told nothing — there is nothing here they could act on.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthLoaded, isSignedIn, userId]);

  const refresh = useCallback(() => {
    const forUser = account.current;

    if (!forUser) {
      return;
    }

    setIsBusy(true);

    void (async () => {
      try {
        const fresh = await fetchLink(token.current);
        setLink((current) => merge(current, fresh));
        await writeCachedLink(forUser, fresh);
        setFailure(null);

        if (fresh.status === "revoked") {
          await authSignOut.current?.();
        }
      } catch (error) {
        setFailure(failureOf(error));
      } finally {
        setIsBusy(false);
      }
    })();
  }, []);

  const request = useCallback((smaranId: number) => {
    const forUser = account.current;

    if (!forUser) {
      return;
    }

    setIsBusy(true);
    setFailure(null);

    void (async () => {
      try {
        const created = await requestLink(token.current, smaranId);
        setLink((current) => merge(current, created));
        await writeCachedLink(forUser, created);
      } catch (error) {
        // The only failure in this file the reader is shown, because it is the
        // only one they asked for and the only one they can answer.
        setFailure(failureOf(error));
      } finally {
        setIsBusy(false);
      }
    })();
  }, []);

  // Check link status when app returns to foreground to catch caregiver changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refresh();
      }
    });

    return () => subscription.remove();
  }, [refresh]);

  // While somebody is watching the spinner, keep asking. Nothing else in the app
  // polls, and this stops the moment the request is answered.
  useEffect(() => {
    if (link.status !== "pending") {
      return;
    }

    const timer = setInterval(refresh, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [link.status, refresh]);

  const value = useMemo<CareLinkValue>(
    () => ({
      isLoaded,
      status: link.status,
      caregiverSmaranId: link.caregiverSmaranId,
      caregiver: link.caregiver,
      isLinked: isLinked(link),
      isBusy,
      failure,
      request,
      refresh,
    }),
    [isLoaded, link, isBusy, failure, request, refresh],
  );

  return (
    <CareLinkContext.Provider value={value}>
      {children}
    </CareLinkContext.Provider>
  );
}

/**
 * The same link, or the object already in state when nothing about it has
 * changed.
 *
 * Every refresh and every poll builds a fresh object out of the response, and a
 * new object is a new render for everything reading this context — fifteen
 * seconds apart while waiting, but a render that redraws the whole app to say
 * nothing new. A handful of fields decide it, and none is worth a render on its
 * own.
 */
function merge(current: CareLink, next: CareLink): CareLink {
  return current.status === next.status &&
    current.caregiverSmaranId === next.caregiverSmaranId &&
    current.caregiver?.name === next.caregiver?.name &&
    current.caregiver?.phone === next.caregiver?.phone
    ? current
    : next;
}

/** Where this reader's care link stands, and how to ask for one. */
export function useCareLink(): CareLinkValue {
  return useContext(CareLinkContext) ?? FALLBACK;
}

/**
 * Outside the provider nothing is gated, the same way `useRecall` reports the
 * recall as passed: a screen rendered on its own — a preview, a test — must not
 * be held behind a setup it has no way of completing.
 */
const FALLBACK: CareLinkValue = {
  isLoaded: true,
  status: "active",
  caregiverSmaranId: null,
  caregiver: null,
  isLinked: true,
  isBusy: false,
  failure: null,
  request: () => {},
  refresh: () => {},
};
