"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import {
  AlertTriangle,
  Brain,
  Heart,
  Users,
  Plus,
  Gamepad2,
  Clock,
  ChevronRight,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { calculateAge } from "@/lib/utils";
import { useDashboardSummary } from "@/lib/api/useDashboardSummary";

export default function DashboardPage() {
  const { user } = useUser();
  const { data, loading, error } = useDashboardSummary();

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
        <div className="mb-6 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-700">
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
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-ink-900">
            Your Patients
          </h3>
          <Link href="/patients/add">
            <Button size="sm" className="gap-1.5">
              <Plus size={14} /> Add Patient
            </Button>
          </Link>
        </div>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
<div key={i} className="h-52 animate-pulse rounded-2xl bg-black/[0.04]" />
            ))}
          </div>
        )}

        {!loading && data && data.patients.length === 0 && (
          <div className="rounded-2xl border border-dashed border-black/15 bg-surface py-16 text-center">
            <p className="font-display text-lg font-semibold text-ink-900">No Patients Yet</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">
              Start your Smaran journey by adding someone you care for.
            </p>
            <Link href="/patients/add" className="mt-5 inline-block">
              <Button className="gap-2">
                <Plus size={16} /> Add Your First Patient
              </Button>
            </Link>
          </div>
        )}

        {!loading && data && data.patients.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.patients.map((p) => (
              <Link
                key={p.id}
                href={`/patients/${p.id}`}
                className="group block rounded-2xl border border-black/[0.06] bg-surface p-5 shadow-[0_2px_8px_rgba(44,31,88,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(44,31,88,0.12)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt={p.full_name}
                        className="h-14 w-14 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 font-display text-lg font-semibold text-indigo-500">
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
                  <div className="rounded-xl bg-black/[0.03] px-3 py-2.5">
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
                  <div className="rounded-xl bg-black/[0.03] px-3 py-2.5">
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

                <div className="mt-4 flex items-center justify-end border-t border-black/[0.06] pt-3.5">
                  <span className="flex items-center gap-1 text-sm font-medium text-indigo-600 transition-transform group-hover:translate-x-0.5">
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