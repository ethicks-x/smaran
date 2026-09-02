"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

import { type ApiRequestInit, apiFetch } from "@/lib/api";

/** One authenticated call to the API, with the reader's session attached. */
export type ApiCall = <T>(path: string, init?: ApiRequestInit) => Promise<T>;

/**
 * The API, already carrying the reader's Clerk session.
 *
 * The browser talks to `apps/api` directly rather than through a Next route, so
 * the API must list this app's origin in `CLERK_AUTHORIZED_PARTIES` and allow it
 * through CORS — otherwise every call fails as `ApiUnreachableError`, which is
 * what a blocked preflight looks like from here.
 *
 * The returned function is stable for as long as the session is, so it is safe
 * as a dependency of an effect or a query key.
 */
export function useApi(): ApiCall {
  const { getToken } = useAuth();

  return useCallback<ApiCall>(
    (path, init) => apiFetch(path, getToken, init),
    [getToken],
  );
}
