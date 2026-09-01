"use client";

import { Clipboard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useCurrentUser } from "@/lib/api/useCurrentUser";

export function formatSmaranId(id: number | null | undefined) {
	if (id === null || id === undefined) {
		return "Not ready";
	}

	const digits = String(id).padStart(9, "0");
	return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export function SmaranIdCard() {
	const { user, loading, error } = useCurrentUser();
	const { showToast } = useToast();
	const smaranId = formatSmaranId(user?.smaran_id);
	const canCopy = Boolean(user?.smaran_id);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Smaran ID</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-sm text-ink-500">
					Share this number with the patient. They will enter it in the Smaran
					app to send you a care request.
				</p>

				<div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.03] p-4">
					<div className="flex items-center justify-between gap-3">
						<div>
							<p className="text-xs font-medium uppercase tracking-wide text-ink-500">
								Your read-only ID
							</p>
							<p className="mt-1 font-display text-3xl font-bold text-ink-900">
								{loading ? (
									<span className="inline-flex items-center gap-2 text-base font-medium text-ink-500">
										<Loader2 className="animate-spin" size={17} /> Loading
									</span>
								) : (
									smaranId
								)}
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="gap-1.5"
							disabled={!canCopy}
							onClick={async () => {
								if (!user?.smaran_id) {
									return;
								}

								try {
									await navigator.clipboard.writeText(String(user.smaran_id));
									showToast("Smaran ID copied");
								} catch {
									showToast("Could not copy Smaran ID");
								}
							}}
						>
							<Clipboard size={14} /> Copy
						</Button>
					</div>
				</div>

				{error && <p className="text-xs text-coral-600">{error}</p>}
				<p className="text-xs text-ink-500">
					This number comes from the backend and cannot be edited here.
				</p>
			</CardContent>
		</Card>
	);
}
