"use client";

import { CareRequestsCard } from "@/components/care/CareRequestsCard";
import { SmaranIdCard } from "@/components/care/SmaranIdCard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PatientCard } from "@/components/patients/PatientCard";
import { useMyPatients } from "@/lib/api/useMyPatients";

export default function PatientsPage() {
	const { patients: myPatients, loading, error, refetch } = useMyPatients();

	return (
		<DashboardShell>
			<div className="mb-6">
				<div>
					<h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
						My Patients
					</h1>
					<p className="mt-1.5 text-sm text-ink-500">
						Patients join your care list by entering your Smaran ID in their
						app.
					</p>
				</div>
			</div>

			<div className="mb-6 grid gap-4 lg:grid-cols-2">
				<SmaranIdCard />
				<CareRequestsCard onDecision={refetch} />
			</div>

			{error && (
				<div className="mb-6 rounded-xl border border-coral-200 bg-coral-50/40 p-3 text-sm text-coral-600 dark:border-coral-400/30">
					{error}
				</div>
			)}

			{loading ? (
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="h-64 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]"
						/>
					))}
				</div>
			) : myPatients.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-black/15 dark:border-white/15 bg-surface py-16 text-center">
					<p className="font-display text-lg font-semibold text-ink-900">
						No Patients Yet
					</p>
					<p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">
						Share your Smaran ID with the patient. After they send a request and
						you accept it, they will appear here.
					</p>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{myPatients.map((p) => (
						<PatientCard
							key={p.id}
							patient={p}
							relationship={p.relationship || "Caregiver"}
						/>
					))}
				</div>
			)}
		</DashboardShell>
	);
}
