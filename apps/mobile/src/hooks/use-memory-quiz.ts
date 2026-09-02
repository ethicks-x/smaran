import { useAuth } from "@clerk/expo";
import { useEffect, useRef, useState } from "react";

import { useLanguage } from "@/hooks/use-language";
import {
  type FetchOutcome,
  fetchQuestions,
  needsQuestions,
  questionCount,
} from "@/lib/memory-quiz";

/** How long the preparing screen stays up at the very least.
 *
 * Not a delay for its own sake: reading questions off local flash takes no time at all, and
 * a screen that appeared and vanished inside one frame would read as a flicker — something
 * gone wrong — rather than as the game getting ready. It is also the whole of the wait on
 * every launch after the first, because there is usually nothing to fetch. */
const MINIMUM_MS = 1400;

/** And the longest the reader waits on the network before the game starts anyway. The call
 * is not abandoned when this passes — whatever it writes is there for next time — the game
 * simply stops waiting on it and plays on what it already has (`AGENTS.md` §2.1). */
export const PREPARE_MS = 9000;

export type QuestionSupply = {
  status: "preparing" | "ready" | "empty";
  /** True when this preparation actually went to the network. Only the copy differs. */
  asked: boolean;
};

/**
 * Get the recognition game's questions ready, then say whether there are any.
 *
 * This is the one place in the patient app that waits on the network on purpose, and the
 * wait is bounded, skippable by timeout, and never load-bearing: a phone that has been
 * offline for a month arrives at `ready` on the questions it already holds, in the same
 * second and a half as one that has just written a fresh set. `empty` means something
 * different and honest — the family has not shared any photographs yet, so there is
 * genuinely nothing to ask about.
 *
 * **Every run of the effect must leave a live timer behind it.** The first version of this
 * hook latched on a ref so that a re-run could not ask twice — and a re-run's *cleanup*
 * fires before its body, so the cleanup cleared both timers and the latched body then
 * returned without arming new ones. That stranded the reader on the preparing screen for
 * ever, with the very ceiling that was meant to rescue them already cancelled. Dependencies
 * do move here after mount: `useLanguage` corrects `language` once it has read the stored
 * choice back off the device. So nothing may latch, and the timers are re-armed on every
 * run.
 *
 * The **request** is what is held across runs instead, keyed to the language it was made
 * for. Asking twice would spend a second model call to reach the same answer, and a second
 * run that simply skipped the call would settle on what was on disk *before* the first
 * call's rows landed. `getToken` is read through a ref for the same reason — it is stable
 * today, and a dependency that only has to move once to break something should not be one.
 *
 * Guarded throughout, like `useMemorySubjects`: `src/db` is a native module, and a
 * development build made before it was installed cannot open the file at all
 * (`decisions.md` D-24). A store that will not open costs this game and nothing else.
 */
export function useQuestionSupply(): QuestionSupply {
  const { getToken } = useAuth();
  const { language, isLoaded } = useLanguage();

  const [supply, setSupply] = useState<QuestionSupply>({
    status: "preparing",
    asked: false,
  });

  // Kept in step through an effect rather than assigned while rendering, the same way
  // `useGameSession` holds its options. The call below only ever runs from another effect.
  const token = useRef(getToken);

  useEffect(() => {
    token.current = getToken;
  });

  /** The generation this screen has already started, and for which language. Held so a
   * re-run joins the call in flight instead of starting a second one or ignoring it. */
  const request = useRef<{
    language: string;
    call: Promise<FetchOutcome>;
  } | null>(null);

  /** When the reader first arrived. The floor is measured from here rather than from this
   * run, so a re-run cannot restart the wait under them. */
  const arrived = useRef(Date.now());

  useEffect(() => {
    let live = true;
    let floor: ReturnType<typeof setTimeout> | undefined;

    // Nothing is asked for until the reader's own language is known. Generating against the
    // opening guess would spend a call writing questions in a language they do not read,
    // and then need a second one the moment the stored choice arrived.
    if (!isLoaded) {
      return;
    }

    const settle = (asked: boolean) => {
      if (!live) {
        return;
      }

      const count = attempt(() => questionCount(language)) ?? 0;

      setSupply({ status: count > 0 ? "ready" : "empty", asked });
    };

    const held =
      request.current?.language === language ? request.current.call : null;

    const worthAsking =
      held !== null || (attempt(() => needsQuestions(language)) ?? false);

    // Said now rather than at the end, because it is what the screen is telling the reader
    // *while* they wait: a line about writing new questions is only honest during the wait
    // it is explaining.
    setSupply({ status: "preparing", asked: worthAsking });

    // The ceiling. Re-armed on every run, which is the whole point — a run whose cleanup
    // cleared the last one must leave a live timer behind it.
    const ceiling = setTimeout(
      () => settle(worthAsking),
      worthAsking ? PREPARE_MS : MINIMUM_MS,
    );

    const call =
      held ??
      (worthAsking ? fetchQuestions(language, () => token.current()) : null);

    if (call !== null && held === null) {
      request.current = { language, call };
    }

    if (call !== null) {
      call
        .then(() => {
          // Whatever arrived is on disk now, so there is nothing left to wait for — the
          // reader gets the floor rather than the whole budget.
          clearTimeout(ceiling);

          floor = setTimeout(
            () => settle(true),
            Math.max(0, MINIMUM_MS - (Date.now() - arrived.current)),
          );
        })
        .catch((error: unknown) => {
          // `fetchQuestions` reports every network failure as an outcome rather than
          // throwing, so reaching here means the store refused the write. The ceiling above
          // still settles, so this costs the reader a longer wait and nothing else — but it
          // is invisible without a word, and it is the one failure here worth debugging.
          if (__DEV__) {
            console.warn(
              `Questions arrived but could not be stored: ${error instanceof Error ? error.message : "unknown"}`,
            );
          }
        });
    }

    return () => {
      live = false;
      clearTimeout(ceiling);
      clearTimeout(floor);
    };
  }, [language, isLoaded]);

  return supply;
}

/**
 * Run a store call, or give up quietly.
 *
 * The message is logged and never the rows: who this reader's family is, and what they are
 * being asked about them, is exactly the kind of thing that does not belong in a log
 * (`AGENTS.md` §2.5).
 */
function attempt<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch (error) {
    console.warn(
      `The questions are unavailable: ${error instanceof Error ? error.message : "the local database could not be read"}`,
    );

    return undefined;
  }
}
