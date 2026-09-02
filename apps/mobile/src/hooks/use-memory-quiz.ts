import { useAuth } from "@clerk/expo";
import { useEffect, useRef, useState } from "react";

import { useLanguage } from "@/hooks/use-language";
import {
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
 * Guarded throughout, like `useMemorySubjects`: `src/db` is a native module, and a
 * development build made before it was installed cannot open the file at all
 * (`decisions.md` D-24). A store that will not open costs this game and nothing else.
 */
export function useQuestionSupply(): QuestionSupply {
  const { getToken } = useAuth();
  const { language } = useLanguage();

  const [supply, setSupply] = useState<QuestionSupply>({
    status: "preparing",
    asked: false,
  });

  // Prepares once per visit to the screen. A second pass would spend another model call to
  // reach the same answer, and the effect below is deliberately not re-run when its
  // dependencies settle a moment after mount.
  const prepared = useRef(false);

  useEffect(() => {
    if (prepared.current) {
      return;
    }

    prepared.current = true;

    let live = true;
    const started = Date.now();

    const settle = (asked: boolean) => {
      if (!live) {
        return;
      }

      const count = attempt(() => questionCount(language)) ?? 0;

      setSupply({ status: count > 0 ? "ready" : "empty", asked });
    };

    const worthAsking = attempt(() => needsQuestions(language)) ?? false;

    // Said now rather than at the end, because it is what the screen is telling the reader
    // *while* they wait: a line about writing new questions is only honest during the wait
    // it is explaining.
    setSupply({ status: "preparing", asked: worthAsking });

    // The floor and the ceiling of the wait. The first keeps the screen from flickering
    // past; the second keeps a reader on a 2G connection in a valley from sitting here.
    const rest = setTimeout(
      () => settle(worthAsking),
      worthAsking ? PREPARE_MS : MINIMUM_MS,
    );

    if (worthAsking) {
      fetchQuestions(language, getToken)
        .then(() => {
          // Whatever arrived is on disk now, so there is nothing left to wait for — the
          // reader gets the shorter wait rather than the budgeted one.
          clearTimeout(rest);

          const spent = Date.now() - started;

          setTimeout(() => settle(true), Math.max(0, MINIMUM_MS - spent));
        })
        .catch(() => {
          // `fetchQuestions` reports its failures as outcomes rather than throwing, so this
          // is only ever the store refusing the write. The timeout above still settles.
        });
    }

    return () => {
      live = false;
      clearTimeout(rest);
    };
  }, [language, getToken]);

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
