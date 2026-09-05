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
import { AppState, type AppStateStatus } from "react-native";

import {
  type AvailableUpdate,
  checkForUpdate,
  type FetchStage,
  fetchAndInstall,
  type UpdateCheck,
} from "@/lib/updates";
import { simulateFetchAndInstall, updatePreview } from "@/lib/updates-preview";

/**
 * How long after a check before another one is worth making.
 *
 * Coming back to the app is not news. A release happens every few weeks at
 * best, and the reader switching between Smaran and a phone call generates a
 * handful of `active` events a minute — asking GitHub about each of them would
 * spend somebody's data to be told the same thing over and over. A fresh launch
 * always checks, because the ref below starts empty with the process.
 */
const MIN_INTERVAL_MS = 4 * 60 * 60 * 1000;

/** What the reader is being shown, if anything. */
export type UpdateStage =
  /** Nothing to say. Either there is no update or it has been put off. */
  | "idle"
  /** There is one, and the reader has not answered yet. */
  | "offered"
  | FetchStage
  /** It did not work. What went wrong is in `failure`. */
  | "failed";

/** Why the last attempt stopped, in the only terms the app can act on. */
export type UpdateFailure = "unavailable" | "corrupt" | "refused";

/**
 * How a check ended, for a caller that asked for one by hand.
 *
 * The same four answers `checkForUpdate` gives, plus `busy` — a check asked for
 * while a download is already running, which is not a failure and not an answer
 * either. The automatic checks discard all of this; only a reader who pressed a
 * button is owed a sentence about it.
 */
export type UpdateCheckOutcome = UpdateCheck["status"] | "busy";

export type UpdateValue = {
  update: AvailableUpdate | null;
  stage: UpdateStage;
  /** True while the reader has no way to put this one off. */
  isRequired: boolean;
  /** How far the download has come, 0–1. Meaningless outside `downloading`. */
  progress: number;
  failure: UpdateFailure | null;
  /** Say yes. Downloading, checking and installing follow on their own. */
  install: () => void;
  /** Not now — until the next launch. */
  dismiss: () => void;
  /**
   * Ask GitHub now, ignoring the four-hour interval, and say what came back.
   *
   * For the row on Settings and nothing else. An update it finds opens the card
   * over the screen the same way an automatic check's would, so the caller
   * usually has nothing to do with the answer beyond telling a reader who found
   * nothing that there was nothing to find.
   */
  check: () => Promise<UpdateCheckOutcome>;
};

const UpdateContext = createContext<UpdateValue | null>(null);

/**
 * A card asked for by `EXPO_PUBLIC_UPDATE_PREVIEW`, for looking at this screen
 * without publishing a release. Null in every release build and in any
 * development one that has not asked — see `lib/updates-preview.ts`.
 *
 * Read once, at module scope, because it cannot change while the app is
 * running: the variable is inlined into the bundle at build time.
 */
const PREVIEW = updatePreview();

/**
 * Finds out whether this phone is running the newest Smaran, and sees the new
 * one onto it.
 *
 * **Awaited by nothing, and it has to stay that way.** It sits at the root
 * beside `useSync`, next to a splash screen that lifts on Clerk and the stored
 * preferences and on nothing else (§2.1). A phone with no signal never learns
 * there is an update and opens exactly as fast as one that does.
 *
 * A major release, or falling five minor releases behind, is decided in
 * `lib/version.ts` to be the app's business rather than the reader's — that
 * one is announced instead of offered, and the download starts by itself.
 * Everything else is a question with a "Not now" on it, and putting it off
 * lasts for this launch only.
 *
 * A reader with dementia will not be reasoning about version numbers, so beyond
 * the first yes there is nothing further to shepherd: downloading, checking the
 * bytes and opening the installer all happen without asking again.
 */
export function UpdateProvider({ children }: { children: ReactNode }) {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const [stage, setStage] = useState<UpdateStage>("idle");
  const [progress, setProgress] = useState(0);
  const [failure, setFailure] = useState<UpdateFailure | null>(null);

  const lastCheckedAt = useRef(0);
  const busy = useRef(false);

  const install = useCallback((wanted: AvailableUpdate) => {
    // One at a time. The check runs again whenever the reader comes back to the
    // app, and a second run would race the first for the same file on disk.
    if (busy.current) {
      return;
    }

    busy.current = true;
    setFailure(null);
    setProgress(0);

    void (async () => {
      // Neither of these ever rejects — every outcome they have is a returned
      // value — so there is nothing here to catch. The preview stands in for the
      // real thing at exactly this seam, so everything around it is the code
      // that ships rather than a second copy written for the preview.
      const run = PREVIEW ? simulateFetchAndInstall : fetchAndInstall;

      const result = await run(wanted, {
        onStage: setStage,
        onProgress: setProgress,
      });

      busy.current = false;

      if (result === "handed-off") {
        // Android has the file and the reader is looking at the installer. What
        // happens next is theirs, and if they finish it this screen goes away
        // with the process it is running in.
        return;
      }

      setFailure(result);
      setStage("failed");
    })();
  }, []);

  /**
   * Ask GitHub, and put whatever comes back on screen.
   *
   * `force` is what separates the reader pressing a button from the app
   * noticing it is in the foreground again: an automatic check honours the
   * four-hour interval, a hand-run one cannot, or the row on Settings would
   * answer "nothing to do" without having asked anybody anything.
   *
   * The status is returned as well as acted on. Nothing on the automatic path
   * reads it — for that caller a quiet failure is the correct outcome and the
   * reason there is no `catch` anywhere near this — but a reader who pressed a
   * button is owed a sentence, and this is where that sentence comes from.
   */
  const runCheck = useCallback(
    async (force: boolean): Promise<UpdateCheckOutcome> => {
      if (PREVIEW) {
        // No network, and the same card the variable asked for. A hand-run
        // check in preview brings back whichever state is being worked on,
        // which is what makes the Settings row testable without a release.
        setUpdate(PREVIEW.update);
        setFailure(PREVIEW.failure);
        setStage(PREVIEW.stage);

        return "available";
      }

      const now = Date.now();

      if (busy.current) {
        // A download is already running and the card is already up. Asking
        // again would race it for the same file on disk.
        return "busy";
      }

      if (!force && now - lastCheckedAt.current < MIN_INTERVAL_MS) {
        return "current";
      }

      // Set before the call rather than after: the point is to stop a second
      // trigger starting a second check, and a check takes as long as a slow
      // connection does.
      lastCheckedAt.current = now;

      const result = await checkForUpdate();

      if (result.status !== "available") {
        // Nothing to say, and — importantly — nothing taken away either. A
        // check that could not reach GitHub leaves an offer already on screen
        // exactly where it was.
        return result.status;
      }

      setUpdate(result.update);

      if (result.update.urgency === "required") {
        setStage("downloading");
        install(result.update);
      } else {
        setStage("offered");
      }

      return "available";
    },
    [install],
  );

  useEffect(() => {
    if (PREVIEW) {
      // Straight to the state being looked at, and no network at all. A
      // `required` preview starts its simulated download the same way a real
      // one does, so that path is watched rather than described.
      setUpdate(PREVIEW.update);
      setFailure(PREVIEW.failure);
      setStage(PREVIEW.stage);

      if (PREVIEW.update.urgency === "required") {
        install(PREVIEW.update);
      }

      return;
    }

    void runCheck(false);

    const subscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") {
          void runCheck(false);
        }
      },
    );

    return () => subscription.remove();
  }, [install, runCheck]);

  const value = useMemo<UpdateValue>(
    () => ({
      update,
      stage,
      // A required update that has actually failed stops being required.
      // Insisting means the app does not offer a way out of installing; it
      // cannot mean an elderly person is locked out of their reminders because
      // GitHub was down or the phone was full. The next launch asks again, and
      // by then the thing that stopped it may well have passed.
      isRequired: update?.urgency === "required" && stage !== "failed",
      progress,
      failure,
      install: () => {
        if (update) {
          install(update);
        }
      },
      dismiss: () => {
        setStage("idle");
        setFailure(null);
      },
      check: () => runCheck(true),
    }),
    [update, stage, progress, failure, install, runCheck],
  );

  return (
    <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>
  );
}

/** Where this phone stands against the newest release. */
export function useUpdate(): UpdateValue {
  return useContext(UpdateContext) ?? FALLBACK;
}

/**
 * Outside the provider there is no update and no way to start one — the same
 * way `useCareLink` reports an unblocked link. A screen rendered on its own must
 * never be interrupted by a dialog it has no provider to answer.
 */
const FALLBACK: UpdateValue = {
  update: null,
  stage: "idle",
  isRequired: false,
  progress: 0,
  failure: null,
  install: () => {},
  dismiss: () => {},
  // "Not Android", which is the honest answer for anything rendered without the
  // provider: there is nowhere for a check to put its result.
  check: async () => "unsupported",
};
