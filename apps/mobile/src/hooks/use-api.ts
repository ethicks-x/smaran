import { useAuth } from "@clerk/expo";
import { useCallback } from "react";

import { apiFetch } from "@/lib/api";

/** One authenticated call to the API, with the reader's session attached. */
export type ApiCall = <T>(path: string, init?: RequestInit) => Promise<T>;

/**
 * The API, already carrying the reader's Clerk session.
 *
 * Every call this returns is **optional** by `AGENTS.md` §2.1: a screen may use
 * what comes back, but must render the same with the radio off. Nothing a
 * reader can see may wait on one of these.
 *
 * A 401 here is not a reason to sign anyone out. The patient signs in once and
 * stays signed in (§5, `apps/mobile`); a refused call is dropped and retried on
 * the next sync.
 */
export function useApi(): ApiCall {
	const { getToken } = useAuth();

	return useCallback<ApiCall>(
		(path, init) => apiFetch(path, getToken, init),
		[getToken],
	);
}
