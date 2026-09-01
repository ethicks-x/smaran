import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PatientMemoriesTab } from "@/components/patients/PatientMemoriesTab";
import { PatientProfileHeader } from "@/components/patients/PatientProfileHeader";
import { PatientRemindersTab } from "@/components/patients/PatientRemindersTab";
import { PatientTabs } from "@/components/patients/PatientTabs";
import { ActivityBreakdown } from "@/components/progress/ActivityBreakdown";
import { SessionAccuracyChart } from "@/components/progress/SessionAccuracyChart";
import { api } from "@/lib/api-server";

interface PatientDetailOut {
	id: string;
	user_id?: string;
	full_name: string;
	avatar_url?: string;
	dob?: string;
	address?: string;
	contact_number?: string;
	preferred_language?: string;
	relationship?: string;
	sessions_count: number;
	overall_accuracy: number;
	memory_subjects_count: number;
	last_active_at?: string;
}

interface MemorySubjectOut {
	id: string;
	patient_id: string;
	kind: "person" | "place" | "object";
	name?: string;
	relation?: string;
	photo_url?: string;
	is_active: boolean;
	created_by?: string;
	created_at: string;
}

interface PatientProgressOut {
	patient_id: string;
	total_sessions: number;
	overall_accuracy: number;
	sessions: SessionSummaryOut[];
	activity_breakdown: ActivityBreakdownItem[];
}

interface SessionSummaryOut {
	id: string;
	date: string;
	questions_planned?: number;
	questions_answered?: number;
	accuracy: number;
	avg_time_ms: number;
	started_at: string;
	ended_at?: string;
}

interface ActivityBreakdownItem {
	activity: string;
	label: string;
	accuracy: number;
	count: number;
}

interface CasualPlayOut {
	id: string;
	patient_id: string;
	game_key: string;
	played_at: string;
	duration_sec?: number;
}

export default async function PatientProfilePage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ tab?: string }>;
}) {
	const { id } = await params;
	const { tab: tabParam } = await searchParams;

	let patient: PatientDetailOut | null = null;
	let memories: MemorySubjectOut[] = [];
	let progress: PatientProgressOut | null = null;
	let casualPlay: CasualPlayOut[] = [];
	let error: string | null = null;

	try {
		// Fetch patient details
		patient = await api<PatientDetailOut>(`/dashboard/patients/${id}`);

		// Fetch memories
		memories = await api<MemorySubjectOut[]>(
			`/dashboard/patients/${id}/memories`,
		);

		// Fetch progress data
		progress = await api<PatientProgressOut>(
			`/dashboard/patients/${id}/progress`,
		);

		// Fetch casual play logs
		casualPlay = await api<CasualPlayOut[]>(
			`/dashboard/patients/${id}/casual-play`,
		);
	} catch (err) {
		console.error("Failed to fetch patient data:", err);
		error = "Failed to load patient data. Please try again.";
	}

	if (!patient) {
		notFound();
	}

	const tab = tabParam ?? "overview";
	const sessionSummaries = progress?.sessions ?? [];
	const activityBreakdown = progress?.activity_breakdown ?? [];
	const accuracy = progress?.overall_accuracy ?? 0;
	const sessions = sessionSummaries;

	return (
		<DashboardShell>
			{error && (
				<div className="mb-6 rounded-2xl border border-coral-200 bg-coral-50/40 p-4">
					<p className="text-sm font-semibold text-coral-600">{error}</p>
				</div>
			)}
			<div className="space-y-6">
				<PatientProfileHeader
					patient={patient}
					relationship={patient.relationship ?? "caregiver"}
				/>

				<div className="rounded-2xl border border-black/6 dark:border-white/[0.08] bg-surface shadow-[0_2px_8px_rgba(44,31,88,0.06)] dark:shadow-none">
					<PatientTabs patientId={patient.id} />

					<div className="p-6">
						{tab === "overview" && (
							<div className="grid gap-4 sm:grid-cols-3">
								<div className="rounded-xl bg-indigo-50 p-4">
									<p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
										Sessions
									</p>
									<p className="mt-2 font-display text-2xl font-bold text-ink-900">
										{sessions.length}
									</p>
								</div>
								<div className="rounded-xl bg-mint-50 p-4">
									<p className="text-xs font-semibold uppercase tracking-wide text-mint-600">
										Accuracy
									</p>
									<p className="mt-2 font-display text-2xl font-bold text-ink-900">
										{accuracy}%
									</p>
								</div>
								<div className="rounded-xl bg-amber-50 p-4">
									<p className="text-xs font-semibold uppercase tracking-wide text-amber-500">
										Memory Subjects
									</p>
									<p className="mt-2 font-display text-2xl font-bold text-ink-900">
										{memories.length}
									</p>
								</div>
							</div>
						)}

						{tab === "memories" && (
							<PatientMemoriesTab
								patientId={patient.id}
								patientFirstName={patient.full_name.split(" ")[0]}
							/>
						)}

						{tab === "reminders" && (
							<PatientRemindersTab patientId={patient.id} />
						)}

						{tab === "progress" && (
							<div className="space-y-8">
								<div>
									<h4 className="mb-4 font-display text-sm font-semibold text-ink-700">
										Accuracy per Session
									</h4>
									<SessionAccuracyChart data={sessionSummaries} />
								</div>

								<div>
									<h4 className="mb-4 font-display text-sm font-semibold text-ink-700">
										Accuracy by Activity Type
									</h4>
									<ActivityBreakdown data={activityBreakdown} />
								</div>

								<div>
									<h4 className="mb-3 font-display text-sm font-semibold text-ink-700">
										Sessions
									</h4>
									<div className="space-y-2.5">
										{sessionSummaries.map((s) => (
											<div
												key={s.id}
												className="flex items-center justify-between rounded-xl border border-black/6 dark:border-white/[0.08] px-4 py-3"
											>
												<div>
													<p className="text-sm font-medium text-ink-900">
														{s.date}
													</p>
													<p className="text-xs text-ink-500">
														{s.questions_answered ?? "—"}/
														{s.questions_planned ?? "—"} answered · avg{" "}
														{Math.round(s.avg_time_ms / 1000)}s per question
													</p>
												</div>
												<span className="rounded-full bg-mint-50 px-2.5 py-1 text-xs font-semibold text-mint-600">
													{s.accuracy}% accuracy
												</span>
											</div>
										))}
									</div>
								</div>
							</div>
						)}

						{tab === "casual" && (
							<div className="space-y-2.5">
								<p className="mb-3 text-sm text-ink-500">
									Games played for enjoyment — no scoring, just time spent
									engaged.
								</p>
								{casualPlay.map((c) => (
									<div
										key={c.id}
										className="flex items-center justify-between rounded-xl border border-black/6 dark:border-white/[0.08] px-4 py-3"
									>
										<div>
											<p className="text-sm font-medium capitalize text-ink-900">
												{c.game_key}
											</p>
											<p className="text-xs text-ink-500">
												{new Date(c.played_at).toLocaleString()}
											</p>
										</div>
										<span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
											{c.duration_sec ? Math.round(c.duration_sec / 60) : 0} min
										</span>
									</div>
								))}
								{casualPlay.length === 0 && (
									<p className="text-sm text-ink-500">
										No casual play logged yet.
									</p>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</DashboardShell>
	);
}
