"use client";

import {
  ArrowLeft,
  Check,
  type LucideIcon,
  MapPin,
  Package,
  UploadCloud,
  User,
  AlertCircle,
  Loader,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useApi } from "@/hooks/use-api";
import type { MemoryKind } from "@/lib/types";

const kinds: { key: MemoryKind; label: string; icon: LucideIcon }[] = [
  { key: "person", label: "Person", icon: User },
  { key: "place", label: "Place", icon: MapPin },
  { key: "object", label: "Object", icon: Package },
];

interface MemorySubjectOut {
  id: string;
  patient_id: string;
  kind: MemoryKind;
  name?: string;
  relation?: string;
  photo_url?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
}

export default function AddMemorySubjectPage() {
  const router = useRouter();
  const api = useApi();
  const params = useParams<{ id: string }>();
  const [selected, setSelected] = useState<MemoryKind | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    relation: "",
    photo_url: "",
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For now, create a local preview URL
      // In production, you'd upload to a storage service (S3, etc.)
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPhotoPreview(dataUrl);
        setFormData(prev => ({ ...prev, photo_url: dataUrl }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selected || !formData.name.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        kind: selected,
        name: formData.name.trim(),
        ...(selected === "person" && formData.relation && { relation: formData.relation.trim() }),
        ...(formData.photo_url && { photo_url: formData.photo_url }),
        is_active: true,
      };

      await api<MemorySubjectOut>(`/dashboard/patients/${params.id}/memories`, {
        method: "POST",
        body: payload,
      });

      // Success! Redirect back to memories tab
      router.push(`/patients/${params.id}?tab=memories`);
    } catch (err) {
      console.error("Failed to create memory subject:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save memory subject. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelected(null);
    setPhotoPreview(null);
    setFormData({ name: "", relation: "", photo_url: "" });
    setError(null);
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-xl">
        <Link
          href={`/patients/${params.id}?tab=memories`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft size={15} /> Back to Memory Subjects
        </Link>

        <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
          Add a Memory Subject
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">
          This will be used to personalize cognitive recognition games and synced to the patient's device.
        </p>

        <div className="mt-8">
          {!selected ? (
            <div className="grid grid-cols-3 gap-4">
              {kinds.map((k) => (
                <button
                  type="button"
                  key={k.key}
                  onClick={() => setSelected(k.key)}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-black/6 bg-surface p-6 text-center shadow-[0_2px_8px_rgba(44,31,88,0.06)] hover:border-indigo-300"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <k.icon size={20} />
                  </span>
                  <span className="text-sm font-medium text-ink-900">
                    {k.label}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <Card className="p-6 sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <p className="font-display text-lg font-semibold text-ink-900 capitalize">
                  {selected}
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-medium text-ink-500 hover:text-ink-900"
                  disabled={loading}
                >
                  Change type
                </button>
              </div>

              {error && (
                <div className="mb-4 flex gap-2 rounded-xl border border-coral-200 bg-coral-50/40 p-3">
                  <AlertCircle size={18} className="shrink-0 text-coral-600" />
                  <p className="text-sm text-coral-600">{error}</p>
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSave}>
                <div>
                  <label
                    htmlFor="photo"
                    className="mb-1.5 block text-sm font-medium text-ink-700"
                  >
                    Upload Photo (Optional)
                  </label>
                  <input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    disabled={loading}
                  />
                  <label
                    htmlFor="photo"
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/15 py-10 text-ink-400 hover:border-indigo-300 hover:text-indigo-500"
                  >
                    {photoPreview ? (
                      <>
                        {/* biome-ignore lint: for preview display */}
                        <img
                          src={photoPreview}
                          alt="Subject preview"
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                        <span className="text-xs font-medium">Click to change photo</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={26} />
                        <span className="text-xs font-medium">
                          Click or drag a photo to upload
                        </span>
                      </>
                    )}
                  </label>
                </div>

                <div>
                  <label
                    htmlFor="name"
                    className="mb-1.5 block text-sm font-medium text-ink-700"
                  >
                    Name <span className="text-coral-500">*</span>
                  </label>
                  <input
                    required
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder={
                      selected === "person"
                        ? "e.g. Priya"
                        : selected === "place"
                          ? "e.g. College Street"
                          : "e.g. His old radio"
                    }
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none disabled:bg-black/5"
                    disabled={loading}
                  />
                </div>

                {selected === "person" && (
                  <div>
                    <label
                      htmlFor="relationship"
                      className="mb-1.5 block text-sm font-medium text-ink-700"
                    >
                      Relationship (Optional)
                    </label>
                    <input
                      id="relationship"
                      name="relation"
                      value={formData.relation}
                      onChange={handleInputChange}
                      placeholder="e.g. daughter, grandson"
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none disabled:bg-black/5"
                      disabled={loading}
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 border-t border-black/6 pt-5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleReset}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="gap-2">
                    {loading ? (
                      <>
                        <Loader size={16} className="animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Check size={16} /> Save & Sync
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
