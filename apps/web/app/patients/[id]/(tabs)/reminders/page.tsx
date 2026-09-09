import { PatientRemindersTab } from "@/components/patients/PatientRemindersTab";

export default async function PatientRemindersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <PatientRemindersTab patientId={id} />;
}
