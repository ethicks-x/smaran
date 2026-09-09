"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function PatientTabs({ patientId }: { patientId: string }) {
  const pathname = usePathname();
  const base = `/patients/${patientId}`;

  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/insights`, label: "AI Insights ✨" },
    { href: `${base}/memories`, label: "Memory Subjects" },
    { href: `${base}/reminders`, label: "Reminders" },
    { href: `${base}/progress`, label: "Progress" },
    { href: `${base}/casual`, label: "Casual Play" },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-black/[0.07] dark:border-white/[0.08]">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
            pathname === t.href
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
