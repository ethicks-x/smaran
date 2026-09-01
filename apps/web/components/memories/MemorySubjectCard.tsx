import { MapPin, Package, Pencil, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { MemorySubject } from "@/lib/types";

export interface MemorySubjectCardItem {
  id: string;
  patient_id?: string;
  kind: string;
  name?: string | null;
  relation?: string | null;
  relationship?: string | null;
  photo_url?: string | null;
  is_active?: boolean;
}

const kindIcon: Record<string, typeof User> = {
  person: User,
  place: MapPin,
  object: Package,
};

export function MemorySubjectCard({ subject }: { subject: MemorySubjectCardItem }) {
  const Icon = kindIcon[subject.kind] || Package;

  return (
    <div className="group overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-surface shadow-[0_2px_8px_rgba(44,31,88,0.06)] dark:shadow-none transition-shadow hover:shadow-[0_12px_40px_rgba(44,31,88,0.12)]">
      {subject.photo_url ? (
        <div className="relative h-40 w-full overflow-hidden">
          {/** biome-ignore lint/performance/noImgElement: Dynamic Images */}
          <img
            src={subject.photo_url}
            alt={subject.name ?? "Memory"}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-indigo-50 to-lavender-50 dark:from-indigo-100 dark:to-lavender-100">
          <Icon size={28} className="text-indigo-400 dark:text-indigo-300" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-display text-base font-semibold text-ink-900">
            {subject.name}
          </p>
          <Badge tone="indigo" className="capitalize">
            {subject.kind}
          </Badge>
        </div>
        {subject.relationship && (
          <p className="mt-0.5 text-xs text-ink-500 capitalize">
            {subject.relationship}
          </p>
        )}

        <div className="mt-3.5 flex items-center gap-2 border-t border-black/[0.06] dark:border-white/[0.08] pt-3">
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-ink-500 hover:text-ink-900 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          >
            <Pencil size={13} /> Edit
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-coral-500 hover:bg-coral-50"
          >
            <Trash2 size={13} /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}
