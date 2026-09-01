import { useAuth } from "@clerk/expo";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef } from "react";

import { apiFetch } from "@/lib/api";

const STORAGE_KEY = "smaran.roleEnrolled";

/** The role this app's account is: the phone is in the patient's hands. */
const ROLE_PATH = "/auth/patient-role";

/**
 * Claims the patient role for a newly signed-up account, once.
 *
 * Clerk knows who someone is; it does not know what they are. A brand-new
 * account has no row in the API's `roles` table, and the whole server side
 * reads that table and only that table when it asks what a caller may do
 * (`decisions.md` D-20). Somebody has to say "this one is a patient", and the
 * only moment we can say it honestly is the first time this app — the patient
 * app — holds a session for that account.
 *
 * Sign-in and sign-up both arrive here the same way. The Account Portal hands
 * back a session either way and does not tell us which it was, so rather than
 * guess, this asks on the first session it sees for a given user and remembers
 * the answer. The endpoint is idempotent and refuses to widen a role that
 * already exists, so asking about an account that has signed in a hundred times
 * before changes nothing.
 *
 * Nothing about this is on the reader's path (§2.1). It is fired from the root
 * and awaited by nobody: the phone opens, plays, reminds and records exactly the
 * same whether the call landed, failed or never went out. A failure is not
 * shown and not retried in the moment — the marker is only written on success,
 * so the next launch simply asks again.
 */
export function useRoleEnrolment(): void {
	const { isLoaded, isSignedIn, userId, getToken } = useAuth();

	// Read through a ref rather than listed as a dependency. Clerk returns a new
	// `getToken` on every render, so an effect that depends on it runs again on
	// every render — and until the marker below is written, every one of those
	// runs is another POST. The three values this effect does depend on are a
	// string and two booleans.
	const token = useRef(getToken);

	useEffect(() => {
		token.current = getToken;
	});

	useEffect(() => {
		if (!isLoaded || !isSignedIn || !userId) {
			return;
		}

		let cancelled = false;

		const enrol = async () => {
			// The marker holds the user id rather than a flag: one phone can be
			// handed on or signed in as somebody else, and a bare "done" would leave
			// the second person without the role the first one got.
			const enrolled = await SecureStore.getItemAsync(STORAGE_KEY).catch(
				() => null,
			);

			if (cancelled || enrolled === userId) {
				return;
			}

			try {
				await apiFetch(ROLE_PATH, token.current, { method: "POST" });
			} catch {
				// Offline, or an API that said no. Either way the reader is not told
				// and nothing is written, so the next launch tries again.
				return;
			}

			if (!cancelled) {
				await SecureStore.setItemAsync(STORAGE_KEY, userId).catch(() => {
					// A store that will not write costs us one repeated call per launch,
					// which the endpoint is built to absorb. It is not worth a failure.
				});
			}
		};

		void enrol();

		return () => {
			cancelled = true;
		};
	}, [isLoaded, isSignedIn, userId]);
}
