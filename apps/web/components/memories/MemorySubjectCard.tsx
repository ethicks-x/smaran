import { MapPin, Package, Pencil, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { MemorySubjectApi } from "@/lib/types";

const kindIcon: Record<string, typeof User> = {
  person: User,
  place: MapPin,
  object: Package,
};

interface MemorySubjectCardProps {
  subject: MemorySubjectApi;
  onEdit?: (subject: MemorySubjectApi) => void;
  onDelete?: (subject: MemorySubjectApi) => void;
  disabled?: boolean;
}

export function MemorySubjectCard({
  subject,
  onEdit,
  onDelete,
  disabled = false,
}: MemorySubjectCardProps) {
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
        {subject.relation && (
          <p className="mt-0.5 text-xs text-ink-500 capitalize">
            {subject.relation}
          </p>
        )}

        {(onEdit || onDelete) && (
          <div className="mt-3.5 flex items-center gap-2 border-t border-black/[0.06] dark:border-white/[0.08] pt-3">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(subject)}
                disabled={disabled}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-ink-500 hover:text-ink-900 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-50"
              >
                <Pencil size={13} /> Edit
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(subject)}
                disabled={disabled}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-coral-500 hover:bg-coral-50 disabled:opacity-50"
              >
                <Trash2 size={13} /> Remove
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
