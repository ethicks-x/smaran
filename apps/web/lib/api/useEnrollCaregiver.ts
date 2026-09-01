"use client";

import { useEffect, useRef } from "react";
import { useApi } from "./client";

export function useEnrollCaregiver() {
	const { apiFetch } = useApi();
	const called = useRef(false);

	useEffect(() => {
		if (called.current) return;
		called.current = true;
		apiFetch("/auth/caregiver-role", { method: "POST" }).catch(() => {
			// Silent — safe to fail quietly here, retried on next page load.
		});
	}, [apiFetch]);
}
