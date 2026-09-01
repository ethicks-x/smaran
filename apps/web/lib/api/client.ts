"use client";

import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * A hook that returns a fetch-like function pre-configured with the current
 * user's Clerk session token attached as a Bearer header. Use this inside any
 * client component that needs to call the FastAPI backend.
 */
export function useApi() {
  const { getToken } = useAuth();

  async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await getToken();

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ApiError(res.status, body || res.statusText);
    }

    // Handle empty responses (e.g. 204 No Content)
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }

  return { apiFetch };
}