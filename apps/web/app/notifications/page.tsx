"use client";

import { useEffect, useState } from "react";
import { Brain, Heart, AlertTriangle, CheckCheck, Loader } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

const iconMap = {
  activity: { icon: Brain, tone: "bg-indigo-50 text-indigo-600" },
  memory: { icon: Heart, tone: "bg-mint-50 text-mint-600" },
  alert: { icon: AlertTriangle, tone: "bg-coral-50 text-coral-500" },
};

const STORAGE_KEY = "smaran:read-notifications";

interface Notification {
  id: string;
  type: "activity" | "memory" | "alert";
  title: string;
  description: string;
  time: string;
  timestamp: string;
  read: boolean;
  patient_id?: string;
}

export default function NotificationsPage() {
  const api = useApi();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotifications = async (isBackground = false) => {
      try {
        if (!isBackground) setLoading(true);
        setError(null);
        const data = await api<Notification[]>("/dashboard/notifications");
        const saved = localStorage.getItem(STORAGE_KEY);
        const readIds: string[] = saved ? JSON.parse(saved) : [];
        setItems(data.map((n) => (readIds.includes(n.id) ? { ...n, read: true } : n)));
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
        if (!isBackground) {
          setError("Failed to load notifications. Please try again.");
          setItems([]);
        }
      } finally {
        if (!isBackground) setLoading(false);
      }
    };

    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(true), 60_000);

    return () => clearInterval(interval);
  }, [api]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const readIds: string[] = JSON.parse(saved);
    setItems((prev) => prev.map((n) => (readIds.includes(n.id) ? { ...n, read: true } : n)));
  }, []);

  function persistRead(updated: typeof items) {
    const readIds = updated.filter((n) => n.read).map((n) => n.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readIds));
  }

  function markAllRead() {
    setItems((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      persistRead(updated);
      return updated;
    });
  }

  function markOneRead(id: string) {
    setItems((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      persistRead(updated);
      return updated;
    });
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">Notifications</h1>
          <p className="mt-1.5 text-sm text-ink-500">Activity, memories, and things needing attention.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={markAllRead} disabled={loading || items.length === 0}>
          <CheckCheck size={14} /> Mark all read
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-indigo-600" size={24} />
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-coral-200 bg-coral-50/40 p-4">
          <p className="text-sm font-semibold text-coral-600">{error}</p>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-black/[0.06] bg-surface p-8 text-center">
          <p className="text-sm text-ink-500">No notifications yet.</p>
        </div>
      )}

      <div className="space-y-2.5">
        {items.map((n) => {
          const meta = iconMap[n.type];
          return (
            <div
              key={n.id}
              className={cn(
                "flex items-start gap-3.5 rounded-2xl border p-4 shadow-[0_2px_8px_rgba(44,31,88,0.06)]",
                n.read ? "border-black/[0.06] bg-surface" : "border-indigo-200 bg-indigo-50/40"
              )}
            >
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.tone)}>
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
                  onClick={() => markOneRead(n.id)}
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