"use client";

import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Clock,
  CloudSun,
  HeartHandshake,
  Lightbulb,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useApi } from "@/hooks/use-api";
import type { PatientAiInsightsApi } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PatientAiInsightsProps {
  patientId: string;
  patientName?: string;
}

export function PatientAiInsights({
  patientId,
  patientName,
}: PatientAiInsightsProps) {
  const api = useApi();
  const [insights, setInsights] = useState<PatientAiInsightsApi | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = await api<PatientAiInsightsApi>(
          `/dashboard/patients/${patientId}/ai-insights`,
          { method: "POST" },
        );
        setInsights(data);
      } catch (err: unknown) {
        console.error("Failed to generate AI insights:", err);
        const detail =
          typeof err === "object" && err !== null && "detail" in err
            ? String((err as { detail: unknown }).detail)
            : err instanceof Error
              ? err.message
              : "Failed to reach Gemini AI.";
        setError(detail);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [api, patientId],
  );

  useEffect(() => {
    // Automatically fetch or generate on initial load
    fetchInsights(false);
  }, [fetchInsights]);

  const firstName = patientName ? patientName.split(" ")[0] : "the patient";

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-surface p-6 shadow-sm">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                <Sparkles size={18} className="animate-pulse" />
              </div>
              <h3 className="font-display text-lg font-bold text-ink-900">
                AI Clinical & Routine Insights
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 dark:border-indigo-800/60 bg-indigo-100/70 dark:bg-indigo-950/40 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                Personal Baseline
              </span>
              {insights?.model_used && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  ⚡ {insights.model_used}
                </span>
              )}
            </div>
            <p className="text-sm text-ink-600 dark:text-ink-400">
              Analyzes cognitive session metrics, reminder adherence, and daily
              patterns for {firstName} against their own historical telemetry.
            </p>
          </div>

          <Button
            onClick={() => fetchInsights(false)}
            disabled={loading}
            variant="primary"
            className="gap-2 shrink-0 shadow-sm"
          >
            <RefreshCw size={15} className={cn(loading && "animate-spin")} />
            {loading ? "Calling Gemini AI..." : "Refresh Insights"}
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-coral-200 bg-coral-50/70 p-4.5 text-sm text-coral-800 dark:border-coral-900/40 dark:bg-coral-950/20 dark:text-coral-300">
          <AlertCircle size={20} className="shrink-0 text-coral-500 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-coral-900 dark:text-coral-200">
              AI Insights Error
            </p>
            <p className="text-xs leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton State */}
      {loading && !insights && (
        <div className="space-y-4 animate-pulse">
          <div className="h-24 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="h-40 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />
            <div className="h-40 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />
            <div className="h-40 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />
          </div>
          <div className="h-32 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />
        </div>
      )}

      {/* Insights Content */}
      {insights && (
        <div className="space-y-6">
          {/* Status & Headline Banner */}
          <div
            className={cn(
              "rounded-2xl border p-5 transition-colors",
              insights.status_level === "thriving" &&
                "border-mint-200 bg-mint-50/60 dark:border-mint-900/30 dark:bg-mint-950/20",
              insights.status_level === "steady" &&
                "border-indigo-200 bg-indigo-50/60 dark:border-indigo-900/30 dark:bg-indigo-950/20",
              insights.status_level === "attention" &&
                "border-amber-200 bg-amber-50/60 dark:border-amber-900/30 dark:bg-amber-950/20",
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    tone={
                      insights.status_level === "thriving"
                        ? "mint"
                        : insights.status_level === "steady"
                          ? "indigo"
                          : "amber"
                    }
                    className="capitalize font-semibold text-xs"
                  >
                    {insights.status_level === "thriving" && (
                      <CheckCircle2 size={12} className="inline mr-1" />
                    )}
                    Status: {insights.status_level}
                  </Badge>
                  <span className="text-xs text-ink-400">
                    Generated{" "}
                    {new Date(insights.generated_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="font-display text-base font-semibold text-ink-900">
                  "{insights.headline}"
                </p>
              </div>

              {/* Telemetry Window Quick Stats */}
              <div className="flex flex-wrap items-center gap-2 border-t sm:border-t-0 sm:border-l border-black/10 dark:border-white/10 pt-3 sm:pt-0 sm:pl-4 text-xs text-ink-600 dark:text-ink-400">
                <div className="rounded-lg bg-surface/80 px-2.5 py-1.5 border border-black/5 dark:border-white/5">
                  <span className="font-semibold text-ink-900">
                    {insights.data_summary.sessions_analyzed}
                  </span>{" "}
                  sessions ({insights.data_summary.overall_accuracy}% acc)
                </div>
                <div className="rounded-lg bg-surface/80 px-2.5 py-1.5 border border-black/5 dark:border-white/5">
                  <span className="font-semibold text-ink-900">
                    {insights.data_summary.overall_adherence}%
                  </span>{" "}
                  routine adherence
                </div>
              </div>
            </div>
          </div>

          {/* Key Observations Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Brain
                size={16}
                className="text-indigo-600 dark:text-indigo-400"
              />
              <h4 className="font-display text-sm font-semibold text-ink-800">
                Key Behavioral & Cognitive Observations
              </h4>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {insights.observations?.map((obs) => (
                <Card
                  key={obs.title}
                  className="flex flex-col justify-between p-4.5 transition-all hover:shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                        {obs.category}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                          obs.trend === "improving" &&
                            "bg-mint-50 text-mint-700 dark:bg-mint-950/40 dark:text-mint-400",
                          obs.trend === "steady" &&
                            "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
                          obs.trend === "attention" &&
                            "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
                        )}
                      >
                        {obs.trend === "improving" && <TrendingUp size={12} />}
                        {obs.trend === "attention" && (
                          <TrendingDown size={12} />
                        )}
                        <span className="capitalize">{obs.trend}</span>
                      </span>
                    </div>

                    <h5 className="font-display text-sm font-semibold text-ink-900">
                      {obs.title}
                    </h5>
                    <p className="text-xs leading-relaxed text-ink-600 dark:text-ink-400">
                      {obs.description}
                    </p>
                  </div>

                  {obs.highlight_metric && (
                    <div className="mt-3 border-t border-black/5 dark:border-white/5 pt-2">
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {obs.highlight_metric}
                      </span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Routine Breakdown by Time of Day */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock
                size={16}
                className="text-indigo-600 dark:text-indigo-400"
              />
              <h4 className="font-display text-sm font-semibold text-ink-800">
                Circadian & Daily Routine Patterns
              </h4>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {insights.routine_insights.map((routine) => {
                const isMorning = routine.time_of_day === "morning";
                const isAfternoon = routine.time_of_day === "afternoon";
                const isEvening = routine.time_of_day === "evening";

                return (
                  <div
                    key={routine.time_of_day}
                    className="rounded-xl border border-black/6 dark:border-white/[0.08] bg-surface p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isMorning && (
                          <Sun size={16} className="text-amber-500" />
                        )}
                        {isAfternoon && (
                          <CloudSun size={16} className="text-orange-500" />
                        )}
                        {isEvening && (
                          <Moon size={16} className="text-indigo-500" />
                        )}
                        <span className="font-display text-sm font-semibold capitalize text-ink-900">
                          {routine.time_of_day}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-ink-700">
                        {routine.adherence_rate}% adherence
                      </span>
                    </div>

                    {/* Visual progress bar */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          routine.adherence_rate >= 80
                            ? "bg-mint-500"
                            : routine.adherence_rate >= 60
                              ? "bg-indigo-500"
                              : "bg-amber-500",
                        )}
                        style={{ width: `${routine.adherence_rate}%` }}
                      />
                    </div>

                    <p className="text-xs text-ink-500 dark:text-ink-400 leading-relaxed">
                      {routine.observation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actionable Caregiver Tips */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb size={16} className="text-amber-500" />
              <h4 className="font-display text-sm font-semibold text-ink-800">
                Actionable Caregiver Suggestions
              </h4>
            </div>

            <div className="space-y-2.5">
              {insights.actionable_tips.map((tip) => (
                <div
                  key={tip.title}
                  className="flex items-start gap-3 rounded-xl border border-black/6 dark:border-white/[0.08] bg-surface p-4 transition-all hover:border-indigo-200 dark:hover:border-indigo-900/40"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 mt-0.5">
                    <HeartHandshake size={15} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink-900">
                        {tip.title}
                      </p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          tip.priority === "recommended" &&
                            "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
                          tip.priority === "suggestion" &&
                            "bg-mint-100 text-mint-700 dark:bg-mint-950 dark:text-mint-300",
                          tip.priority === "note" &&
                            "bg-black/[0.05] text-ink-600 dark:bg-white/[0.08] dark:text-ink-400",
                        )}
                      >
                        {tip.priority}
                      </span>
                    </div>
                    <p className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed">
                      {tip.advice}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer Banner */}
          <div className="flex items-center gap-2.5 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] px-4 py-3 text-xs text-ink-500">
            <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
            <span>{insights.disclaimer}</span>
          </div>
        </div>
      )}
    </div>
  );
}
