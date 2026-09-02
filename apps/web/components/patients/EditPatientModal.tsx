"use client";

import { AlertTriangle, Loader2, UserX, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useApi } from "@/hooks/use-api";
import type { PatientProfileHeaderPatient } from "./PatientProfileHeader";

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientProfileHeaderPatient;
  relationship: string;
  onSuccess?: () => void;
}

export function EditPatientModal({
  isOpen,
  onClose,
  patient,
  relationship: initialRelationship,
  onSuccess,
}: EditPatientModalProps) {
  const api = useApi();
  const router = useRouter();
  const { showToast } = useToast();

  const [dob, setDob] = useState(patient.dob || "");
  const [relationship, setRelationship] = useState(initialRelationship || "");
  const [contactNumber, setContactNumber] = useState(
    patient.contact_number || "",
  );
  const [address, setAddress] = useState(patient.address || "");
  const [preferredLanguage, setPreferredLanguage] = useState(
    patient.preferred_language || "en",
  );
  const [loading, setLoading] = useState(false);
  const [deregistering, setDeregistering] = useState(false);
  const [confirmDeregister, setConfirmDeregister] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api(`/dashboard/patients/${patient.id}`, {
        method: "PATCH",
        body: {
          dob: dob ? dob : null,
          relationship: relationship.trim() || null,
          contact_number: contactNumber.trim() || null,
          address: address.trim() || null,
          preferred_language: preferredLanguage || null,
        },
      });

      showToast("Patient details updated successfully");
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update patient details",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeregister = async () => {
    setDeregistering(true);
    setError(null);

    try {
      await api(`/dashboard/patients/${patient.id}/deregister`, {
        method: "POST",
      });

      showToast("Patient deregistered. They have been logged out.");
      onClose();
      router.push("/patients");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to deregister patient",
      );
      setDeregistering(false);
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
              Edit Patient Details
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Update information for {patient.full_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-500 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] hover:text-ink-900"
            disabled={loading || deregistering}
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
            <label
              htmlFor="relationship"
              className="block text-xs font-semibold uppercase tracking-wide text-ink-700"
            >
              Your Relationship
            </label>
            <input
              id="relationship"
              type="text"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="e.g. Daughter, Son, Spouse, Caregiver"
              disabled={loading || deregistering}
              className="mt-1.5 block w-full rounded-xl border border-black/10 dark:border-white/10 bg-surface px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:border-indigo-400 focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="dob"
                className="block text-xs font-semibold uppercase tracking-wide text-ink-700"
              >
                Date of Birth
              </label>
              <input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                disabled={loading || deregistering}
                className="mt-1.5 block w-full rounded-xl border border-black/10 dark:border-white/10 bg-surface px-3.5 py-2.5 text-sm text-ink-900 focus:border-indigo-400 focus:outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="preferred_language"
                className="block text-xs font-semibold uppercase tracking-wide text-ink-700"
              >
                Preferred Language
              </label>
              <select
                id="preferred_language"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                disabled={loading || deregistering}
                className="mt-1.5 block w-full rounded-xl border border-black/10 dark:border-white/10 bg-surface px-3.5 py-2.5 text-sm text-ink-900 focus:border-indigo-400 focus:outline-none disabled:opacity-50"
              >
                <option value="en" className="bg-surface text-ink-900">
                  English
                </option>
                <option value="hi" className="bg-surface text-ink-900">
                  Hindi (हिन्दी)
                </option>
                <option value="bn" className="bg-surface text-ink-900">
                  Bengali (বাংলা)
                </option>
                <option value="as" className="bg-surface text-ink-900">
                  Assamese (অসমীয়া)
                </option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="contact_number"
              className="block text-xs font-semibold uppercase tracking-wide text-ink-700"
            >
              Contact Number
            </label>
            <input
              id="contact_number"
              type="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              disabled={loading || deregistering}
              className="mt-1.5 block w-full rounded-xl border border-black/10 dark:border-white/10 bg-surface px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:border-indigo-400 focus:outline-none disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="address"
              className="block text-xs font-semibold uppercase tracking-wide text-ink-700"
            >
              Address
            </label>
            <textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Guwahati, Assam"
              rows={2}
              disabled={loading || deregistering}
              className="mt-1.5 block w-full rounded-xl border border-black/10 dark:border-white/10 bg-surface px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:border-indigo-400 focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-black/[0.06] dark:border-white/[0.08] pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading || deregistering}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || deregistering}
              className="gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>

        {/* Danger Zone: Deregister */}
        <div className="mt-8 rounded-xl border border-coral-200 dark:border-coral-400/30 bg-coral-50/20 p-4.5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-coral-100 text-coral-600 dark:bg-coral-950/60 dark:text-coral-400">
              <UserX size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-sm font-semibold text-coral-600 dark:text-coral-400">
                Deregister Patient
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">
                Deregistering will immediately force log out {patient.full_name}{" "}
                from the mobile app and permanently prevent them from
                re-connecting with your Smaran caregiver code.
              </p>

              {!confirmDeregister ? (
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setConfirmDeregister(true)}
                    disabled={loading || deregistering}
                  >
                    <UserX size={14} /> Deregister Patient
                  </Button>
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-coral-300 dark:border-coral-400/40 bg-surface p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-coral-600">
                    <AlertTriangle size={14} /> Are you absolutely sure?
                  </div>
                  <p className="text-xs text-ink-500">
                    This action is permanent and cannot be undone.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="gap-1.5"
                      onClick={handleDeregister}
                      disabled={deregistering}
                    >
                      {deregistering && (
                        <Loader2 size={13} className="animate-spin" />
                      )}
                      Confirm Deregister
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDeregister(false)}
                      disabled={deregistering}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
