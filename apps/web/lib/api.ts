/**
 * The transport half of the API client. No Clerk import lives here on purpose:
 * the session is read differently on each side of the app — `auth()` on the
 * server, `useAuth()` in the browser — so both sides hand their own `getToken`
 * to the same function rather than this module guessing which one it is in.
 *
 * Server components and actions use `api` from `@/lib/api-server`; client
 * components use `useApi` from `@/hooks/use-api`. This is the form for code
 * that already holds a `getToken` and needs neither.
 *
 * Kept deliberately in step with `apps/mobile/src/lib/api.ts` — same errors,
 * same header handling, same reading of FastAPI's `detail` body.
 */

/** `task dev:api`. Kept in step with `UVICORN_PORT` in `apps/api/.env`. */
const DEV_API_URL = "http://localhost:8080";

export const API_BASE_URL = (
	process.env.NEXT_PUBLIC_API_URL || DEV_API_URL
).replace(/\/+$/, "");

/**
 * A request the API refused.
 *
 * `detail` is the API's own plain-language message, which by `AGENTS.md` §2.5
 * never carries anything patient-identifying. It is safe to show a caregiver,
 * but it is written for one — do not concatenate it into other copy.
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

/** A request that never reached the API — offline, wrong host, CORS, timeout. */
export class ApiUnreachableError extends Error {
	constructor(readonly cause: unknown) {
		super("Could not reach the API.");
		this.name = "ApiUnreachableError";
	}
}

/** Clerk's `getToken`, narrowed to what this module needs. */
export type GetToken = () => Promise<string | null>;

/** What every caller passes through to `fetch`, minus the parts we own. */
export type ApiRequestInit = Omit<RequestInit, "body"> & {
	/** A plain object is JSON-encoded; a string or `FormData` is sent as given. */
	body?: unknown;
};

/**
 * One authenticated call to the API.
 *
 * The token is asked for on every call rather than held anywhere: a Clerk
 * session token lives about a minute, and this call is what refreshes it.
 * Nothing is cached and nothing is written to disk — Clerk's own token cache is
 * the only place a credential belongs.
 */
export async function apiFetch<T>(
	path: string,
	getToken: GetToken,
	init: ApiRequestInit = {},
): Promise<T> {
	const token = await getToken();
	const { body, headers, ...rest } = init;

	// A caller passing an already-serialised body means it, so only a plain
	// object gets encoded here — FormData carries its own multipart boundary and
	// must reach fetch untouched.
	const isRaw =
		body === undefined ||
		typeof body === "string" ||
		body instanceof FormData ||
		body instanceof URLSearchParams ||
		body instanceof Blob;

	let response: Response;

	try {
		response = await fetch(`${API_BASE_URL}${path}`, {
			...rest,
			body: isRaw ? (body as BodyInit | undefined) : JSON.stringify(body),
			headers: {
				Accept: "application/json",
				...(body !== undefined && !isRaw
					? { "Content-Type": "application/json" }
					: {}),
				...(token ? { Authorization: `Bearer ${token}` } : {}),
				...headers,
			},
		});
	} catch (cause) {
		// Being unable to ask gets its own type so a caller can tell it from having
		// asked and been refused. The first is worth retrying; the second is not.
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
