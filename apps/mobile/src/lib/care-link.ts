import * as SecureStore from "expo-secure-store";

import { ApiError, ApiUnreachableError, apiFetch, type GetToken } from "./api";

/**
 * Who looks after this reader — the one thing the app has to know before it can
 * be anybody's app.
 *
 * A phone signed in to an account nobody has connected to a family is a phone
 * with no reminders to show, no people to call and nowhere for its rounds to
 * go. So setup asks for one thing: the nine-digit Smaran number the person who
 * helps them already has. That number creates a **request**, not a link — the
 * caregiver has to accept it before anything is shared (`AGENTS.md` §2.5).
 *
 * **The cache is what the app reads, and the network only ever refreshes it.**
 * Asking to be looked after needs a signal, once, next to the sign-in that also
 * needs one. Everything after that is a local read: a phone that was linked in
 * March opens in a house with no signal in June exactly as it did the day it
 * was set up (§2.1).
 */

/** Where a reader's link stands. `none` is a phone nobody has set up yet. */
export type CareLinkStatus = "none" | "pending" | "active" | "revoked";

export type CareLink = {
	status: CareLinkStatus;
	/** The caregiver this status belongs to. Null when the status is `none`. */
	caregiverSmaranId: number | null;
};

/**
 * Why an attempt did not land. Three cases and not one, because the screen says
 * something different about each: a number nobody holds is worth checking, a
 * missing signal is worth waiting out, and anything else is worth trying again.
 */
export type CareLinkFailure = "unknown-number" | "offline" | "failed";

export const UnknownLink: CareLink = {
	status: "none",
	caregiverSmaranId: null,
};

/** How many digits a Smaran number has. Never fewer, never more. */
export const SmaranIdLength = 9;

const STORAGE_KEY = "smaran.careLink";

const LINK_PATH = "/care/link";

/** The wire shape. Snake case, like everything else the API sends. */
type CareLinkWire = {
	status: CareLinkStatus;
	caregiver_smaran_id: number | null;
};

/**
 * The cached link, and who it belongs to.
 *
 * Keyed by Clerk user id for the same reason the role-enrolment marker is: one
 * phone can be handed on, and the second reader must not walk into the first
 * reader's setup already done.
 */
type CachedCareLink = CareLink & { userId: string };

/** True once the reader may use the app: somebody has accepted them. */
export const isLinked = (link: CareLink): boolean => link.status === "active";

/**
 * The last thing we knew about this account's link, read from the device.
 *
 * This is the read the setup gate waits on, so it has to be quick and it has to
 * work with the radio off — both of which are why it is a key/value read and
 * not a request. A store that will not open is `null`, which sends the reader to
 * setup: asking again is a small cost, and opening an app with no caregiver
 * behind it is not.
 */
export async function readCachedLink(userId: string): Promise<CareLink | null> {
	try {
		const raw = await SecureStore.getItemAsync(STORAGE_KEY);

		if (!raw) {
			return null;
		}

		const cached = JSON.parse(raw) as CachedCareLink;

		if (cached.userId !== userId || !isStatus(cached.status)) {
			return null;
		}

		return {
			status: cached.status,
			caregiverSmaranId: cached.caregiverSmaranId ?? null,
		};
	} catch {
		// A store that will not read, or a value written by an older build that
		// does not parse. Either way there is nothing here to trust.
		return null;
	}
}

/** Remember what the server said, so the next launch does not have to ask. */
export async function writeCachedLink(
	userId: string,
	link: CareLink,
): Promise<void> {
	const cached: CachedCareLink = { ...link, userId };

	await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(cached)).catch(
		() => {
			// One repeated call on the next launch, and the reader is told nothing.
		},
	);
}

/** Where the server says this reader's link stands. */
export async function fetchLink(getToken: GetToken): Promise<CareLink> {
	return fromWire(await apiFetch<CareLinkWire>(LINK_PATH, getToken));
}

/**
 * Ask the caregiver holding `smaranId` to look after this reader.
 *
 * Idempotent on the server, so a reader who taps twice — or comes back to the
 * same number tomorrow — gets the request that already exists rather than a
 * second one for somebody to answer.
 */
export async function requestLink(
	getToken: GetToken,
	smaranId: number,
): Promise<CareLink> {
	return fromWire(
		await apiFetch<CareLinkWire>(LINK_PATH, getToken, {
			method: "POST",
			body: JSON.stringify({ smaran_id: smaranId }),
		}),
	);
}

/**
 * Which of the three things went wrong.
 *
 * A 404 is the number, and it is the only one the reader can do anything about.
 * A 422 means the digits were not a Smaran number at all, which the screen
 * should have caught — it is reported as the same "check that number" so the
 * reader is not sent to wait for a signal that would not help.
 */
export function failureOf(error: unknown): CareLinkFailure {
	if (error instanceof ApiUnreachableError) {
		return "offline";
	}

	if (
		error instanceof ApiError &&
		(error.status === 404 || error.status === 422)
	) {
		return "unknown-number";
	}

	return "failed";
}

/** Digits as typed, as a number — or null if that is not a Smaran number. */
export function parseSmaranId(digits: string): number | null {
	if (!new RegExp(`^[0-9]{${SmaranIdLength}}$`).test(digits)) {
		return null;
	}

	const value = Number(digits);

	// The sequence starts at 100,000,000, so a nine-digit string always lands
	// above it — this rules out a leading zero rather than a real id.
	return Number.isSafeInteger(value) ? value : null;
}

const STATUSES: CareLinkStatus[] = ["none", "pending", "active", "revoked"];

const isStatus = (value: unknown): value is CareLinkStatus =>
	typeof value === "string" && STATUSES.includes(value as CareLinkStatus);

function fromWire(wire: CareLinkWire): CareLink {
	return {
		status: isStatus(wire.status) ? wire.status : "none",
		caregiverSmaranId: wire.caregiver_smaran_id ?? null,
	};
}
