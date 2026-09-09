import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PatientProfileHeader } from "@/components/patients/PatientProfileHeader";
import { PatientTabs } from "@/components/patients/PatientTabs";
import { api } from "@/lib/api-server";
import type { PatientDetailApi } from "@/lib/types";

/**
 * The chrome every tab shares — header, tabs, card frame — lives here instead of in
 * each `page.tsx`, so switching tabs is a real route change to a sibling segment: Next
 * keeps this layout mounted, re-renders only the target segment, and shows that
 * segment's own `loading.tsx` while it fetches. A `?tab=` query param on a single
 * `page.tsx` could not get that for free — see `artifacts/decisions.md`.
 */
export default async function PatientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let patient: PatientDetailApi | null = null;

  try {
    patient = await api<PatientDetailApi>(`/dashboard/patients/${id}`);
  } catch (err) {
    console.error("Failed to fetch patient data:", err);
  }

  if (!patient) {
    notFound();
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <PatientProfileHeader
          patient={patient}
          relationship={patient.relationship ?? "caregiver"}
        />

        <div className="rounded-2xl border border-black/6 dark:border-white/[0.08] bg-surface shadow-[0_2px_8px_rgba(44,31,88,0.06)] dark:shadow-none">
          <PatientTabs patientId={patient.id} />
          <div className="p-6">{children}</div>
        </div>
      </div>
    </DashboardShell>
  );
}
