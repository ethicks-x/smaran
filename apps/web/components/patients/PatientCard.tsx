import { ChevronRight, Clock, Gamepad2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import {
  getMemorySubjects,
  getPatientAccuracy,
  getSessionsForPatient,
} from "@/lib/mock-data";
import type { Patient } from "@/lib/types";
import { calculateAge } from "@/lib/utils";

export function PatientCard({
  patient,
  relationship,
}: {
  patient: Patient;
  relationship: string;
}) {
  const sessions = getSessionsForPatient(patient.id);
  const accuracy = getPatientAccuracy(patient.id);
  const memoryCount = getMemorySubjects(patient.id).length;

  return (
    <Link
      href={`/patients/${patient.id}`}
      className="group block rounded-2xl border border-black/[0.06] bg-surface p-5 shadow-[0_2px_8px_rgba(44,31,88,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(44,31,88,0.12)]"
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
              {calculateAge(patient.dob)} yrs · {relationship}
            </p>
          </div>
        </div>
        <Badge tone="mint">Active</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-black/[0.03] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-ink-500">
            <Gamepad2 size={13} />
            <span className="text-[11px] font-medium uppercase tracking-wide">
              Sessions
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-ink-900">
            {sessions.length} played
          </p>
        </div>
        <div className="rounded-xl bg-black/[0.03] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-ink-500">
            <Clock size={13} />
            <span className="text-[11px] font-medium uppercase tracking-wide">
              Accuracy
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-ink-900">{accuracy}%</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-black/[0.06] pt-3.5">
        <span className="text-xs text-ink-500">
          {memoryCount} memory subjects
        </span>
        <span className="flex items-center gap-1 text-sm font-medium text-indigo-600 transition-transform group-hover:translate-x-0.5">
          View Patient <ChevronRight size={14} />
        </span>
      </div>
    </Link>
  );
}
