import Constants from "expo-constants";

/** `task dev:api`. Kept in step with `UVICORN_PORT` in `apps/api/.env`. */
const DEV_API_PORT = 8080;

/**
 * Where the backend lives.
 *
 * A phone cannot reach the dev machine's `localhost`, so in development the
 * host is taken from the packager URI Expo already handed us — the same
 * address the bundle itself came down over, which is by definition reachable
 * from this device. A build sets `EXPO_PUBLIC_API_URL` and skips all of that.
 */
function resolveBaseUrl(): string {
	const configured = process.env.EXPO_PUBLIC_API_URL;

	if (configured) {
		return configured.replace(/\/+$/, "");
	}

	const host = Constants.expoConfig?.hostUri?.split(":")[0];

	if (host) {
		return `http://${host}:${DEV_API_PORT}`;
	}

	return `http://localhost:${DEV_API_PORT}`;
}

export const API_BASE_URL = resolveBaseUrl();

/**
 * A request the API refused.
 *
 * `detail` is the API's own plain-language message, which by `AGENTS.md` §2.5
 * never carries anything patient-identifying. It is still not screen copy —
 * screens read from the locale catalogues — but it is safe to hand to a
 * caregiver-facing surface or a diagnostic.
 */
export class ApiError extends Error {
	constructor(
		readonly status: number,
		readonly detail: string,
	) {
		super(`API request failed with ${status}`);
		this.name = "ApiError";
	}
}

/** A request that never reached the API — radio off, wrong host, timeout. */
export class ApiUnreachableError extends Error {
	constructor(readonly cause: unknown) {
		super("Could not reach the API.");
		this.name = "ApiUnreachableError";
	}
}

/** Clerk's `getToken`, narrowed to what this module needs. */
export type GetToken = () => Promise<string | null>;

/**
 * One authenticated call to the API.
 *
 * The token is asked for on every call rather than held anywhere: a Clerk
 * session token lives about a minute, and this call is what refreshes it.
 * Nothing is cached here and nothing is written to disk — Clerk's own token
 * cache is the only place a credential belongs.
 *
 * Prefer `useApi` from `@/hooks/use-api` inside a component; this is the form
 * for code that has a `getToken` but no hooks available.
 */
export async function apiFetch<T>(
	path: string,
	getToken: GetToken,
	init: RequestInit = {},
): Promise<T> {
	let token: string | null;

	try {
		token = await getToken();
	} catch (cause) {
		// Refreshing an expired session token is itself a call to Clerk, so with
		// the radio off this throws before we ever reach our own API. It is the
		// same "we could not ask" case as a failed fetch and is reported as one.
		throw new ApiUnreachableError(cause);
	}

	let response: Response;

	try {
		response = await fetch(`${API_BASE_URL}${path}`, {
			...init,
			headers: {
				Accept: "application/json",
				...(init.body ? { "Content-Type": "application/json" } : {}),
				...(token ? { Authorization: `Bearer ${token}` } : {}),
				...init.headers,
			},
		});
	} catch (cause) {
		// Offline is the expected case, not an exceptional one (§2.1). It gets its
		// own type so a caller can tell "we could not ask" from "we asked and were
		// refused" — the first is retried later, the second never is.
		throw new ApiUnreachableError(cause);
	}

	if (!response.ok) {
		throw new ApiError(response.status, await readDetail(response));
	}

	// 204, and anything else with no body: there is nothing to parse and the
	// caller's `T` is `void`.
	if (response.status === 204) {
		return undefined as T;
	}

	return (await response.json()) as T;
}

/**
 * FastAPI's `HTTPException` body is `{"detail": "…"}`. A proxy or a crash can
 * return something else entirely, so a body that does not parse is not itself
 * an error — the status code is what the caller acts on.
 */
async function readDetail(response: Response): Promise<string> {
	try {
		const body: unknown = await response.json();

		if (
			typeof body === "object" &&
			body !== null &&
			"detail" in body &&
			typeof body.detail === "string"
		) {
			return body.detail;
		}
	} catch {
		// Falls through to the empty string below.
	}

	return "";
}
