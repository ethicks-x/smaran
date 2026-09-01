import { MapPin, Package, Pencil, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { MemorySubject } from "@/lib/types";

const kindIcon = { person: User, place: MapPin, object: Package };

export function MemorySubjectCard({ subject }: { subject: MemorySubject }) {
  const Icon = kindIcon[subject.kind];

  return (
    <div className="group overflow-hidden rounded-2xl border border-black/[0.06] bg-surface shadow-[0_2px_8px_rgba(44,31,88,0.06)] transition-shadow hover:shadow-[0_12px_40px_rgba(44,31,88,0.12)]">
      {subject.photo_url ? (
        <div className="relative h-40 w-full overflow-hidden">
          {/** biome-ignore lint/performance/noImgElement: Dynamic Images */}
          <img
            src={subject.photo_url}
            alt={subject.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-indigo-50 to-lavender-50">
          <Icon size={28} className="text-indigo-300" />
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

        <div className="mt-3.5 flex items-center gap-2 border-t border-black/[0.06] pt-3">
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-ink-600 hover:bg-black/[0.04]"
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
