"use client";

import { useEffect, useState } from "react";
import { useApi } from "./client";
import { UserProfileApi } from "@/lib/types";

export function useCurrentUser() {
  const { apiFetch } = useApi();
  const [user, setUser] = useState<UserProfileApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiFetch<UserProfileApi>("/users/me")
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load user");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, loading, error };
}