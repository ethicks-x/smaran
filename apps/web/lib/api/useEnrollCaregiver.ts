"use client";

import { useEffect, useRef } from "react";
import { useApi } from "./client";

export function useEnrollCaregiver() {
  const { apiFetch, isLoaded } = useApi();
  const called = useRef(false);

  useEffect(() => {
    if (!isLoaded || called.current) return;
    called.current = true;
    apiFetch("/auth/caregiver-role", { method: "POST" }).catch(() => {
      // Silent — safe to fail quietly here, retried on next page load.
    });
  }, [apiFetch, isLoaded]);
}
