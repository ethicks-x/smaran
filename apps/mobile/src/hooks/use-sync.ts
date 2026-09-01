import { useAuth } from "@clerk/expo";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { sync } from "@/lib/sync";

/**
 * How long after a drain before another one is worth trying.
 *
 * Coming back to the app is not news — a reader switching between this and a
 * phone call generates a handful of `active` events a minute, and there is
 * nothing new to send between them. The queue is drained on a schedule of
 * "whenever we happen to be here, but not twice in a moment".
 */
const MIN_INTERVAL_MS = 2 * 60 * 1000;

/**
 * Drains the outbox when the app opens and whenever the reader comes back to it.
 *
 * **Triggered, never assumed** (`AGENTS.md` §2.2). Managed Expo cannot promise
 * unattended background work, so nothing here pretends a sync has happened: the
 * queue is the record of what is owed, and it is correct whether this hook has
 * ever fired or not. Every one of these calls is a chance to catch up, not a
 * step in a flow that has to complete.
 *
 * Awaited by nobody, and it must stay that way. It is mounted at the root
 * alongside `useRoleEnrolment`, next to a splash screen that lifts on Clerk and
 * the stored preferences and on nothing else. A failure is not shown to the
 * reader, because there is nothing they could do about it and nothing they have
 * lost — the rows are on the phone either way.
 *
 * **What is missing is a connectivity trigger.** The natural third moment is the
 * radio coming back, and detecting that needs a dependency the app does not
 * have (`decisions.md` D-33). Until it does, a phone that regains signal while
 * the app is open in front of someone waits for the next time they leave and
 * return.
 */
export function useSync(): void {
	const { isLoaded, isSignedIn, getToken } = useAuth();
	const lastRunAt = useRef(0);

	useEffect(() => {
		if (!isLoaded || !isSignedIn) {
			return;
		}

		const run = () => {
			const now = Date.now();

			if (now - lastRunAt.current < MIN_INTERVAL_MS) {
				return;
			}

			// Set before the call, not after: the point is to stop a second trigger
			// starting a second run, and a run takes as long as the network does.
			lastRunAt.current = now;

			// `sync` never rejects — every outcome it has is a returned value — so
			// there is nothing here to catch and nothing to tell anyone.
			void sync(getToken);
		};

		run();

		const subscription = AppState.addEventListener(
			"change",
			(state: AppStateStatus) => {
				if (state === "active") {
					run();
				}
			},
		);

		return () => subscription.remove();
	}, [isLoaded, isSignedIn, getToken]);
}
