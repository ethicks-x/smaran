"use client";

import { useUser } from "@clerk/nextjs";
import {
  AlertTriangle,
  Brain,
  ChevronRight,
  Clock,
  Gamepad2,
  Heart,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CareRequestsCard } from "@/components/care/CareRequestsCard";
import { SmaranIdCard } from "@/components/care/SmaranIdCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/Badge";
import { useDashboardSummary } from "@/lib/api/useDashboardSummary";
import { calculateAge } from "@/lib/utils";

const PatientSkeletons = [
  "patient-skeleton-1",
  "patient-skeleton-2",
  "patient-skeleton-3",
];

export default function DashboardPage() {
  const { user } = useUser();
  const { data, loading, error, refetch } = useDashboardSummary();

  return (
    <DashboardShell>
      <div className="mb-7">
        <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
          Good morning, {user?.firstName ?? "there"} 👋
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Here&apos;s an overview of your loved ones today.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-dashed border-amber-400/40 bg-amber-50 p-4 text-sm text-amber-500">
          Couldn&apos;t reach the backend: {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Patients"
          value={loading ? "—" : String(data?.total_patients ?? 0)}
          icon={Users}
          tone="indigo"
        />
        <StatCard
          label="Activities Today"
          value={loading ? "—" : String(data?.activities_today ?? 0)}
          subtext="questions answered"
          icon={Brain}
          tone="mint"
        />
        <StatCard
          label="Memory Subjects"
          value={loading ? "—" : String(data?.total_memory_subjects ?? 0)}
          icon={Heart}
          tone="amber"
        />
        <StatCard
          label="Needs Attention"
          value={loading ? "—" : String(data?.needs_attention ?? 0)}
          icon={AlertTriangle}
          tone="coral"
        />
      </div>

      <div className="mt-8">
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <SmaranIdCard />
          <CareRequestsCard onDecision={refetch} />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-ink-900">
            Your Patients
          </h3>
        </div>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {PatientSkeletons.map((key) => (
              <div
                key={key}
                className="h-52 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]"
              />
            ))}
          </div>
        )}

        {!loading && data && data.patients.length === 0 && (
          <div className="rounded-2xl border border-dashed border-black/15 dark:border-white/15 bg-surface py-16 text-center">
            <p className="font-display text-lg font-semibold text-ink-900">
              No Patients Yet
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">
              Share your Smaran ID with the patient. After they send a request
              and you accept it, they will appear here.
            </p>
          </div>
        )}

        {!loading && data && data.patients.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.patients.map((p) => (
              <Link
                key={p.id}
                href={`/patients/${p.id}`}
                className="group block rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-surface p-5 shadow-[0_2px_8px_rgba(44,31,88,0.06)] dark:shadow-none transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(44,31,88,0.12)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    {p.avatar_url ? (
                      <Image
                        src={p.avatar_url}
                        alt={p.full_name}
                        width={56}
                        height={56}
                        className="h-14 w-14 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 font-display text-lg font-semibold text-indigo-700">
                        {p.full_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-display text-base font-semibold text-ink-900">
                        {p.full_name}
                      </p>
                      <p className="text-sm text-ink-500">
                        {p.dob ? `${calculateAge(p.dob)} yrs` : "Age unknown"} ·{" "}
                        {p.relationship ?? "caregiver"}
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
                      {p.sessions_count} played
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-ink-500">
                      <Clock size={13} />
                      <span className="text-[11px] font-medium uppercase tracking-wide">
                        Accuracy
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-ink-900">
                      {p.overall_accuracy}%
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end border-t border-black/[0.06] dark:border-white/[0.08] pt-3.5">
                  <span className="flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 transition-transform group-hover:translate-x-0.5">
                    View Patient <ChevronRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
