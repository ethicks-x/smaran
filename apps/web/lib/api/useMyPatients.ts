"use client";

import { useCallback, useEffect, useState } from "react";
import type { PatientCardApi } from "@/lib/types";
import { useApi } from "./client";

interface UseMyPatientsResult {
  patients: PatientCardApi[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMyPatients(): UseMyPatientsResult {
  const { apiFetch } = useApi();
  const [patients, setPatients] = useState<PatientCardApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ patients: PatientCardApi[] }>(
        "/dashboard/summary",
      );
      setPatients(res.patients);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load patients";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  const refetch = useCallback(async () => {
    await fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return {
    patients,
    loading,
    error,
    refetch,
  };
}
