"use client";

import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useCareRequests } from "@/lib/api/useCareRequests";

interface CareRequestsCardProps {
	onDecision?: () => void | Promise<void>;
}

export function CareRequestsCard({ onDecision }: CareRequestsCardProps) {
	const { requests, loading, error, updatingId, decide, refresh } =
		useCareRequests();

	const answer = async (requestId: string, status: "active" | "revoked") => {
		try {
			await decide(requestId, status);
			await onDecision?.();
		} catch {
			// The hook owns the visible error state for this card.
		}
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between gap-3">
				<CardTitle>Patient Requests</CardTitle>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="gap-1.5"
					onClick={() => refresh()}
					disabled={loading}
				>
					<RefreshCw size={14} /> Refresh
				</Button>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-sm text-ink-500">
					When a patient enters your Smaran ID, their request appears here.
					Accept it to add them to your care list.
				</p>

				{error && <p className="text-sm text-coral-600">{error}</p>}

				{loading ? (
					<div className="flex items-center gap-2 text-sm text-ink-500">
						<Loader2 className="animate-spin" size={16} /> Checking requests
					</div>
				) : requests.length === 0 ? (
					<div className="rounded-xl border border-dashed border-black/15 p-4 text-sm text-ink-500">
						No patient requests are waiting right now.
					</div>
				) : (
					<div className="space-y-3">
						{requests.map((request) => (
							<div
								key={request.id}
								className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4"
							>
								<p className="text-sm font-medium text-ink-900">
									Request from patient record
								</p>
								<p className="mt-1 break-all text-xs text-ink-500">
									{request.patient_id}
								</p>
								<div className="mt-3 flex flex-wrap gap-2">
									<Button
										type="button"
										size="sm"
										className="gap-1.5"
										disabled={updatingId === request.id}
										onClick={() => answer(request.id, "active")}
									>
										<Check size={14} /> Accept
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="gap-1.5"
										disabled={updatingId === request.id}
										onClick={() => answer(request.id, "revoked")}
									>
										<X size={14} /> Decline
									</Button>
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
