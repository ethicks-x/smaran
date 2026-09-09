import { PatientMemoriesTab } from "@/components/patients/PatientMemoriesTab";
import { api } from "@/lib/api-server";
import type { PatientDetailApi } from "@/lib/types";

export default async function PatientMemoriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Deduped against the layout's identical call by Next's request memoization.
  let patientFirstName = "the patient";
  try {
    const patient = await api<PatientDetailApi>(`/dashboard/patients/${id}`);
    patientFirstName = patient.full_name.split(" ")[0];
  } catch (err) {
    console.error("Failed to fetch patient name for memories:", err);
  }

  return (
    <PatientMemoriesTab patientId={id} patientFirstName={patientFirstName} />
  );
}
