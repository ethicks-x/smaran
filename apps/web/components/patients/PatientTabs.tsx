"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function PatientTabs({ patientId }: { patientId: string }) {
  const searchParams = useSearchParams();
  const active = searchParams.get("tab") ?? "overview";

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "insights", label: "AI Insights ✨" },
    { key: "memories", label: "Memory Subjects" },
    { key: "reminders", label: "Reminders" },
    { key: "progress", label: "Progress" },
    { key: "casual", label: "Casual Play" },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-black/[0.07] dark:border-white/[0.08]">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={
            t.key === "overview"
              ? `/patients/${patientId}`
              : `/patients/${patientId}?tab=${t.key}`
          }
          className={cn(
            "whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
            active === t.key
              ? "border-indigo-600 dark:border-indigo-400 text-indigo-700"
              : "border-transparent text-ink-500 hover:text-ink-900",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
