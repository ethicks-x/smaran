"use client";

import { LogOut, KeyRound } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { caregiver } from "@/lib/mock-data";

export default function SettingsPage() {
  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">Settings</h1>
        <p className="mt-1.5 text-sm text-ink-500">Manage your profile and account.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <img
                src={caregiver.avatar_url ?? undefined}
                alt={caregiver.full_name}
                className="h-16 w-16 rounded-2xl object-cover"
              />
              <div>
                <p className="font-display text-base font-semibold text-ink-900">{caregiver.full_name}</p>
                <p className="text-xs text-ink-500">Caregiver</p>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Name</label>
              <input
                defaultValue={caregiver.full_name}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <Button size="sm">Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.05] text-ink-500">
                <KeyRound size={17} />
              </span>
              <div>
                <p className="text-sm font-medium text-ink-900">Change Password</p>
                <p className="text-xs text-ink-500">Update your account password</p>
              </div>
            </div>
            <Button variant="danger" size="sm" className="gap-1.5">
              <LogOut size={14} /> Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}