"use client";

import { useCallback, useEffect, useState } from "react";
import { useApi } from "@/hooks/use-api";
import type { MemorySubjectApi } from "@/lib/types";

interface UsePatientMemoriesResult {
	memories: MemorySubjectApi[];
	loading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
	deleteMemory: (subjectId: string) => Promise<void>;
	isDeleting: boolean;
}

/**
 * A patient's memory subjects, client-side — mirrors `usePatientReminders`, the pattern the
 * Reminders tab already established for a caregiver-editable list on this page.
 *
 * Only fetch and delete live here: adding and editing a subject go through their own modals
 * (`AddMemorySubjectPage`, `EditMemorySubjectModal`), each of which calls the API directly
 * and notifies the caller via `onSuccess` — the same shape `AddReminderModal` and
 * `EditPatientModal` already use. `refetch` is how this hook picks up what they changed.
 */
export function usePatientMemories(
	patientId: string,
): UsePatientMemoriesResult {
	const api = useApi();
	const [memories, setMemories] = useState<MemorySubjectApi[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const fetchMemories = useCallback(async () => {
		try {
			setLoading(true);
			const res = await api<MemorySubjectApi[]>(
				`/dashboard/patients/${patientId}/memories`,
			);
			setMemories(res);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load memories");
		} finally {
			setLoading(false);
		}
	}, [api, patientId]);

	const refetch = useCallback(async () => {
		await fetchMemories();
	}, [fetchMemories]);

	const deleteMemory = useCallback(
		async (subjectId: string): Promise<void> => {
			try {
				setIsDeleting(true);
				await api(`/dashboard/patients/${patientId}/memories/${subjectId}`, {
					method: "DELETE",
				});
				setMemories((prev) => prev.filter((m) => m.id !== subjectId));
			} finally {
				setIsDeleting(false);
			}
		},
		[api, patientId],
	);

	useEffect(() => {
		if (patientId) {
			fetchMemories();
		}
	}, [patientId, fetchMemories]);

	return { memories, loading, error, refetch, deleteMemory, isDeleting };
}
