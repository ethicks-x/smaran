import "server-only";

import { auth } from "@clerk/nextjs/server";

import { type ApiRequestInit, apiFetch } from "@/lib/api";

/**
 * One authenticated call to the API, from the server.
 *
 * Use this in server components, route handlers and server actions. It reads
 * the caller's Clerk session out of the request Next.js is already handling and
 * forwards it as a bearer token, which is what `apps/api` verifies
 * (`features/auth/service.py`).
 *
 * It does not redirect a signed-out visitor: `proxy.ts` has already turned them
 * away before any page that calls this renders. If one somehow gets here the
 * call goes out unauthenticated and the API answers 401, which surfaces as an
 * `ApiError` rather than a silently empty page.
 *
 *     const summary = await api<DashboardSummary>("/dashboard/summary");
 *
 * Throws `ApiError` when the API refused the request and
 * `ApiUnreachableError` when it could not be reached at all.
 */
export async function api<T>(
  path: string,
  init: ApiRequestInit = {},
): Promise<T> {
  const { getToken } = await auth();

  return apiFetch<T>(path, getToken, init);
}
