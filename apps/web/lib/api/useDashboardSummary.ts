"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardSummaryApi } from "@/lib/types";
import { useApi } from "./client";

export function useDashboardSummary() {
	const { apiFetch } = useApi();
	const [data, setData] = useState<DashboardSummaryApi | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refetch = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await apiFetch<DashboardSummaryApi>("/dashboard/summary");
			setData(res);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load");
		} finally {
			setLoading(false);
		}
	}, [apiFetch]);

	useEffect(() => {
		let cancelled = false;
		apiFetch<DashboardSummaryApi>("/dashboard/summary")
			.then((res) => !cancelled && setData(res))
			.catch(
				(err) =>
					!cancelled &&
					setError(err instanceof Error ? err.message : "Failed to load"),
			)
			.finally(() => !cancelled && setLoading(false));
		return () => {
			cancelled = true;
		};
	}, [apiFetch]);

	return { data, loading, error, refetch };
}
