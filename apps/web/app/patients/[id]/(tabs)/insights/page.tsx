import { PatientAiInsights } from "@/components/patients/PatientAiInsights";
import { api } from "@/lib/api-server";
import type { PatientDetailApi } from "@/lib/types";

export default async function PatientInsightsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Deduped against the layout's identical call by Next's request memoization —
  // this is just to get the patient's name into the insights copy, not a second
  // round trip.
  let patientName: string | undefined;
  try {
    const patient = await api<PatientDetailApi>(`/dashboard/patients/${id}`);
    patientName = patient.full_name;
  } catch (err) {
    console.error("Failed to fetch patient name for insights:", err);
  }

  return <PatientAiInsights patientId={id} patientName={patientName} />;
}
