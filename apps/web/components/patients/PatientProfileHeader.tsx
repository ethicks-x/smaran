"use client";

import { BellPlus, Heart, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AddReminderModal } from "@/components/reminders";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { calculateAge } from "@/lib/utils";
import { EditPatientModal } from "./EditPatientModal";

export interface PatientProfileHeaderPatient {
	id: string;
	user_id?: string | null;
	full_name: string;
	avatar_url?: string | null;
	dob?: string | null;
	address?: string | null;
	contact_number?: string | null;
	preferred_language?: string | null;
}

export function PatientProfileHeader({
	patient,
	relationship,
}: {
	patient: PatientProfileHeaderPatient;
	relationship: string;
}) {
	const router = useRouter();
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isReminderOpen, setIsReminderOpen] = useState(false);

	return (
		<>
			<div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-surface p-6 shadow-[0_2px_8px_rgba(44,31,88,0.06)] dark:shadow-none">
				<div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
					<div className="flex items-center gap-4">
						{/** biome-ignore lint/performance/noImgElement: Image is used for visual purposes only */}
						<img
							src={patient.avatar_url ?? undefined}
							alt={patient.full_name}
							className="h-20 w-20 rounded-2xl object-cover sm:h-24 sm:w-24"
						/>
						<div>
							<div className="flex flex-wrap items-center gap-2.5">
								<h1 className="font-display text-2xl font-bold text-ink-900">
									{patient.full_name}
								</h1>
								<Badge tone="mint">Active</Badge>
							</div>
							<p className="mt-1 text-sm text-ink-500">
								{patient.dob ? calculateAge(patient.dob) : "—"} yrs · Cared for
								by you ({relationship}) · {patient.address ?? "No address"}
							</p>
						</div>
					</div>
					<div className="flex flex-wrap gap-2.5">
						<Button
							type="button"
							variant="outline"
							className="gap-2"
							onClick={() => setIsEditOpen(true)}
						>
							<Pencil size={15} /> Edit Patient
						</Button>
						<Link href={`/patients/${patient.id}/memories/add`}>
							<Button type="button" variant="outline" className="gap-2">
								<Heart size={15} /> Add Memory
							</Button>
						</Link>
						<Button
							type="button"
							className="gap-2"
							onClick={() => setIsReminderOpen(true)}
						>
							<BellPlus size={15} /> Add Reminder
						</Button>
					</div>
				</div>
			</div>

			<EditPatientModal
				isOpen={isEditOpen}
				onClose={() => setIsEditOpen(false)}
				patient={patient}
				relationship={relationship}
				onSuccess={() => router.refresh()}
			/>

			<AddReminderModal
				isOpen={isReminderOpen}
				onClose={() => setIsReminderOpen(false)}
				patientId={patient.id}
				onSuccess={() => router.refresh()}
			/>
		</>
	);
}
