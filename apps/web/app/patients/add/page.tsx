"use client";

import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Camera, Check } from "lucide-react";

export default function AddPatientPage() {
  const router = useRouter();

  return (
    <DashboardShell>
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">Add a Patient</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          These details map directly to your patient record.
        </p>

        <Card className="mt-8 p-6 sm:p-8">
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              router.push("/patients");
            }}
          >
            <div className="flex justify-center">
              <button
                type="button"
                className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-indigo-200 bg-indigo-50 text-indigo-400 hover:border-indigo-400"
              >
                <Camera size={26} />
                <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white">
                  +
                </span>
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700" htmlFor="full_name">
                Full Name
              </label>
              <input
                id="full_name"
                required
                placeholder="e.g. Ramesh Das"
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700" htmlFor="dob">
                  Date of Birth
                </label>
                <input
                  id="dob"
                  type="date"
                  required
                  className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700" htmlFor="lang">
                  Preferred Language
                </label>
                <select
                  id="lang"
                  className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
                >
                  <option value="as">Assamese</option>
                  <option value="bn">Bengali</option>
                  <option value="ne">Nepali</option>
                  <option value="mni">Manipuri</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700" htmlFor="address">
                Address
              </label>
              <input
                id="address"
                placeholder="e.g. Guwahati, Assam"
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700" htmlFor="contact">
                Contact Number
              </label>
              <input
                id="contact"
                type="tel"
                placeholder="+91 98765 43210"
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700" htmlFor="relationship">
                Your Relationship to the Patient
              </label>
              <input
                id="relationship"
                placeholder="e.g. son, wife, ASHA worker"
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>

            <div className="flex justify-end border-t border-black/[0.06] pt-5">
              <Button type="submit" className="gap-2">
                <Check size={16} /> Save Patient
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardShell>
  );
}