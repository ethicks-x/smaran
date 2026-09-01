import { ChevronRight, Clock, Gamepad2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { PatientCardApi } from "@/lib/types";
import { calculateAge } from "@/lib/utils";

export function PatientCard({
	patient,
	relationship,
}: {
	patient: PatientCardApi;
	relationship: string;
}) {
	const accuracy =
		patient.overall_accuracy > 1
			? Math.round(patient.overall_accuracy)
			: Math.round((patient.overall_accuracy || 0) * 100);
	const sessionsCount = patient.sessions_count || 0;

	return (
		<Link
			href={`/patients/${patient.id}`}
			className="group block rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-surface p-5 shadow-[0_2px_8px_rgba(44,31,88,0.06)] dark:shadow-none transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(44,31,88,0.12)]"
		>
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-3.5">
					{/** biome-ignore lint/performance/noImgElement: Image is used for visual purposes only */}
					<img
						src={patient.avatar_url ?? undefined}
						alt={patient.full_name}
						className="h-14 w-14 rounded-2xl object-cover"
					/>
					<div>
						<p className="font-display text-base font-semibold text-ink-900">
							{patient.full_name}
						</p>
						<p className="text-sm text-ink-500">
							{patient.dob ? calculateAge(patient.dob) : "—"} yrs ·{" "}
							{relationship}
						</p>
					</div>
				</div>
				<Badge tone="mint">Active</Badge>
			</div>

			<div className="mt-4 grid grid-cols-2 gap-3">
				<div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2.5">
					<div className="flex items-center gap-1.5 text-ink-500">
						<Gamepad2 size={13} />
						<span className="text-[11px] font-medium uppercase tracking-wide">
							Sessions
						</span>
					</div>
					<p className="mt-1 text-sm font-semibold text-ink-900">
						{sessionsCount} played
					</p>
				</div>
				<div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2.5">
					<div className="flex items-center gap-1.5 text-ink-500">
						<Clock size={13} />
						<span className="text-[11px] font-medium uppercase tracking-wide">
							Accuracy
						</span>
					</div>
					<p className="mt-1 text-sm font-semibold text-ink-900">{accuracy}%</p>
				</div>
			</div>

			<div className="mt-4 flex items-center justify-end border-t border-black/[0.06] dark:border-white/[0.08] pt-3.5">
				<span className="flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 transition-transform group-hover:translate-x-0.5">
					View Patient <ChevronRight size={14} />
				</span>
			</div>
		</Link>
	);
}
