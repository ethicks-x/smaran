import { Plus } from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PatientCard } from "@/components/patients/PatientCard";
import { Button } from "@/components/ui/Button";
import { caregiver, getPatientsForCaregiver } from "@/lib/mock-data";

export default function PatientsPage() {
  const myPatients = getPatientsForCaregiver(caregiver.id);

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
            My Patients
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Manage profiles for everyone in your care.
          </p>
        </div>
        <Link href="/patients/add">
          <Button className="gap-2">
            <Plus size={16} /> Add Patient
          </Button>
        </Link>
      </div>

      {myPatients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-surface py-16 text-center">
          <p className="font-display text-lg font-semibold text-ink-900">
            No Patients Yet
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">
            Start your Smaran journey by adding someone you care for.
          </p>
          <Link href="/patients/add" className="mt-5 inline-block">
            <Button className="gap-2">
              <Plus size={16} /> Add Your First Patient
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {myPatients.map((p) => (
            <PatientCard key={p.id} patient={p} relationship={p.relationship} />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
