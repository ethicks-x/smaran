"use client";

import { useCallback, useEffect, useState } from "react";
import type { CareRequestApi } from "@/lib/types";
import { useApi } from "./client";

type RequestDecision = "active" | "revoked";

export function useCareRequests() {
  const { apiFetch } = useApi();
  const [requests, setRequests] = useState<CareRequestApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);

    return apiFetch<CareRequestApi[]>("/care/requests")
      .then((res) =>
        setRequests(res.filter((request) => request.status === "pending")),
      )
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load requests",
        );
      })
      .finally(() => setLoading(false));
  }, [apiFetch]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    apiFetch<CareRequestApi[]>("/care/requests")
      .then((res) => {
        if (!cancelled) {
          setRequests(res.filter((request) => request.status === "pending"));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load requests",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  const decide = useCallback(
    async (requestId: string, status: RequestDecision) => {
      setUpdatingId(requestId);
      setError(null);

      try {
        await apiFetch<CareRequestApi>(`/care/requests/${requestId}`, {
          method: "POST",
          body: JSON.stringify({ status }),
        });
        setRequests((current) =>
          current.filter((request) => request.id !== requestId),
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update request",
        );
        throw err;
      } finally {
        setUpdatingId(null);
      }
    },
    [apiFetch],
  );

  return { requests, loading, error, updatingId, decide, refresh };
}
