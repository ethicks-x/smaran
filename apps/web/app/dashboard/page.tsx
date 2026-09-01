import { AlertTriangle, Brain, Heart, Users } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PatientCard } from "@/components/patients/PatientCard";
import {
  caregiver,
  getPatientsForCaregiver,
  memorySubjects,
  questionEvents,
} from "@/lib/mock-data";

export default function DashboardPage() {
  const myPatients = getPatientsForCaregiver(caregiver.id);

  const today = new Date().toISOString().slice(0, 10);
  const activitiesToday = questionEvents.filter((q) =>
    q.asked_at.startsWith(today),
  ).length;

  return (
    <DashboardShell>
      <div className="mb-7">
        <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
          Good morning, {caregiver.full_name.split(" ")[0]} 👋
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Here&apos;s an overview of your loved ones today.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Patients"
          value={String(myPatients.length)}
          icon={Users}
          tone="indigo"
        />
        <StatCard
          label="Activities Today"
          value={String(activitiesToday)}
          subtext="questions answered"
          icon={Brain}
          tone="mint"
        />
        <StatCard
          label="Memory Subjects"
          value={String(memorySubjects.length)}
          icon={Heart}
          tone="amber"
        />
        <StatCard
          label="Needs Attention"
          value="0"
          icon={AlertTriangle}
          tone="coral"
        />
      </div>

      <div className="mt-8">
        <h3 className="mb-4 font-display text-lg font-semibold text-ink-900">
          Your Patients
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {myPatients.map((p) => (
            <PatientCard key={p.id} patient={p} relationship={p.relationship} />
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
