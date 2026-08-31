"use client";

import { AlertTriangle, Brain, CheckCheck, Heart } from "lucide-react";
import { useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { notifications as initial } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const iconMap = {
  activity: { icon: Brain, tone: "bg-indigo-50 text-indigo-600" },
  memory: { icon: Heart, tone: "bg-mint-50 text-mint-600" },
  alert: { icon: AlertTriangle, tone: "bg-coral-50 text-coral-500" },
};

export default function NotificationsPage() {
  const [items, setItems] = useState(initial);

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
            Notifications
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Activity, memories, and things needing attention.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            setItems((it) => it.map((n) => ({ ...n, read: true })))
          }
        >
          <CheckCheck size={14} /> Mark all read
        </Button>
      </div>

      <div className="space-y-2.5">
        {items.map((n) => {
          const meta = iconMap[n.type];
          return (
            <div
              key={n.id}
              className={cn(
                "flex items-start gap-3.5 rounded-2xl border p-4 shadow-[0_2px_8px_rgba(44,31,88,0.06)]",
                n.read
                  ? "border-black/6 bg-surface"
                  : "border-indigo-200 bg-indigo-50/40",
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  meta.tone,
                )}
              >
                <meta.icon size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">{n.title}</p>
                <p className="mt-0.5 text-sm text-ink-500">{n.description}</p>
                <p className="mt-1.5 text-xs text-ink-300">{n.time}</p>
              </div>
              {!n.read && (
                <button
                  type="button"
                  onClick={() =>
                    setItems((it) =>
                      it.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
                    )
                  }
                  className="shrink-0 rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white"
                >
                  Mark read
                </button>
              )}
            </div>
          );
        })}
      </div>
    </DashboardShell>
  );
}
