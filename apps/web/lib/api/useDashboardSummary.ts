"use client";

import { useEffect, useState } from "react";
import { useApi } from "./client";
import { DashboardSummaryApi } from "@/lib/types";

export function useDashboardSummary() {
  const { apiFetch } = useApi();
  const [data, setData] = useState<DashboardSummaryApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<DashboardSummaryApi>("/dashboard/summary")
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  return { data, loading, error };
}