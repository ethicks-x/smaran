import { Pencil, Heart } from "lucide-react";
import { Patient } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { calculateAge } from "@/lib/utils";

export function PatientProfileHeader({
  patient,
  relationship,
}: {
  patient: Patient;
  relationship: string;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-surface p-6 shadow-[0_2px_8px_rgba(44,31,88,0.06)]">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <img
            src={patient.avatar_url ?? undefined}
            alt={patient.full_name}
            className="h-20 w-20 rounded-2xl object-cover sm:h-24 sm:w-24"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-2xl font-bold text-ink-900">{patient.full_name}</h1>
              <Badge tone="mint">Active</Badge>
            </div>
            <p className="mt-1 text-sm text-ink-500">
              {calculateAge(patient.dob)} yrs · Cared for by you ({relationship}) · {patient.address}
            </p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" className="gap-2">
            <Pencil size={15} /> Edit Patient
          </Button>
          <Button className="gap-2">
            <Heart size={15} /> Add Memory
          </Button>
        </div>
      </div>
    </div>
  );
}