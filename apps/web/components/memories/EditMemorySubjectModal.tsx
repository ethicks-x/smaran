"use client";

import { Loader2, UploadCloud, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api";
import type { MemoryAssetApi, MemorySubjectApi } from "@/lib/types";

interface EditMemorySubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: MemorySubjectApi;
  onSuccess?: () => void;
}

/**
 * Mirrors `ALLOWED_CONTENT_TYPES` and `S3_MAX_UPLOAD_BYTES` in `apps/api` — see the Add
 * Memory Subject page, where this same allowlist and the reasoning for it first appear.
 */
const ACCEPTED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const MAX_BYTES = 25 * 1024 * 1024;

export function EditMemorySubjectModal({
  isOpen,
  onClose,
  subject,
  onSuccess,
}: EditMemorySubjectModalProps) {
  const api = useApi();
  const { showToast } = useToast();

  const [name, setName] = useState(subject.name ?? "");
  const [relation, setRelation] = useState(subject.relation ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A fresh subject arrives whenever the caregiver opens Edit on a different card, and the
  // form has to reset to match it rather than carry over what the last card's edit left.
  useEffect(() => {
    setName(subject.name ?? "");
    setRelation(subject.relation ?? "");
    setPhoto(null);
    setError(null);
  }, [subject]);

  // An object URL is a document-lifetime handle, not a string. Without the revoke the modal
  // leaks one for every replacement photo tried before settling on one. With no new photo
  // chosen, the preview falls back to the subject's own picture rather than nothing.
  useEffect(() => {
    if (!photo) {
      setPhotoPreview(subject.photo_url ?? null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo, subject.photo_url]);

  if (!isOpen) return null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setError(null);
    if (file && !ACCEPTED.includes(file.type)) {
      setError(
        "That file is not a photo we can use. Try a JPEG, PNG or HEIC picture.",
      );
      return;
    }
    if (file && file.size > MAX_BYTES) {
      setError("That picture is too large. Try a smaller one.");
      return;
    }
    setPhoto(file);
  };

  const clearPhoto = () => {
    setPhoto(null);
    if (photoInput.current) photoInput.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a name.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api<MemorySubjectApi>(
        `/dashboard/patients/${subject.patient_id}/memories/${subject.id}`,
        {
          method: "PATCH",
          body: {
            name: name.trim(),
            ...(subject.kind === "person" && {
              relation: relation.trim() || null,
            }),
          },
        },
      );

      if (photo) {
        // A new asset, linked to this same subject — the newest ready one is what the
        // subject's photo_url resolves to on the next read (`decisions.md` D-42), so this
        // is what "replacing" a picture means; nothing deletes the one it replaces.
        const form = new FormData();
        form.append("file", photo);
        form.append("kind", "photo");
        form.append("subject_id", subject.id);

        await api<MemoryAssetApi>(
          `/dashboard/patients/${subject.patient_id}/memories/assets`,
          { method: "POST", body: form },
        );
      }

      showToast("Memory subject updated");
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.detail || "That did not save. Please try again."
          : err instanceof Error
            ? err.message
            : "Failed to update memory subject",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div
        className="w-full max-w-lg rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-surface p-6 shadow-2xl transition-all sm:p-7 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-ink-900">
              Edit Memory Subject
            </h2>
            <p className="mt-0.5 text-xs text-ink-500 capitalize">
              {subject.kind}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-500 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] hover:text-ink-900"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-coral-200 bg-coral-50/40 p-3 text-sm text-coral-600 dark:border-coral-400/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-ink-700">
              Photo
            </span>
            <input
              id="edit-photo"
              ref={photoInput}
              type="file"
              accept={ACCEPTED.join(",")}
              onChange={handlePhotoChange}
              className="hidden"
              disabled={loading}
            />

            {photoPreview ? (
              <div className="relative mt-1.5 overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                {/** biome-ignore lint/performance/noImgElement: a local preview or a signed URL, not a static asset */}
                <img
                  src={photoPreview}
                  alt={photo?.name ?? subject.name ?? "Current photo"}
                  className="h-40 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={clearPhoto}
                  disabled={loading || !photo}
                  className="absolute top-2 right-2 rounded-lg bg-black/60 p-1.5 text-white hover:bg-black/75 disabled:pointer-events-none disabled:opacity-0"
                  aria-label="Keep the current photo"
                >
                  <X size={14} />
                </button>
                <label
                  htmlFor="edit-photo"
                  className="absolute inset-x-0 bottom-0 cursor-pointer bg-black/60 py-1.5 text-center text-xs font-medium text-white hover:bg-black/75"
                >
                  Change photo
                </label>
              </div>
            ) : (
              <label
                htmlFor="edit-photo"
                className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/15 py-10 text-ink-400 hover:border-indigo-300 hover:text-indigo-500"
              >
                <UploadCloud size={26} />
                <span className="text-xs font-medium">
                  Click or drag a photo to upload
                </span>
              </label>
            )}
          </div>

          <div>
            <label
              htmlFor="edit-name"
              className="block text-xs font-semibold uppercase tracking-wide text-ink-700"
            >
              Name
            </label>
            <input
              required
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="mt-1.5 block w-full rounded-xl border border-black/10 dark:border-white/10 bg-surface px-3.5 py-2.5 text-sm text-ink-900 focus:border-indigo-400 focus:outline-none disabled:opacity-50"
            />
          </div>

          {subject.kind === "person" && (
            <div>
              <label
                htmlFor="edit-relationship"
                className="block text-xs font-semibold uppercase tracking-wide text-ink-700"
              >
                Relationship
              </label>
              <input
                id="edit-relationship"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                placeholder="e.g. daughter, grandson"
                disabled={loading}
                className="mt-1.5 block w-full rounded-xl border border-black/10 dark:border-white/10 bg-surface px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:border-indigo-400 focus:outline-none disabled:opacity-50"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-black/[0.06] dark:border-white/[0.08] pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
