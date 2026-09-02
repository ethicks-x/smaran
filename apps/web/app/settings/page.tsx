"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { Check, KeyRound, Loader2, LogOut, Phone } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { SmaranIdCard } from "@/components/care/SmaranIdCard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useCurrentUser } from "@/lib/api/useCurrentUser";
import { extract10Digits } from "@/lib/utils";

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const { user: apiUser } = useCurrentUser();
  const { signOut, openUserProfile } = useClerk();
  const { showToast } = useToast();

  const [phone, setPhone] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      const current =
        typeof user.unsafeMetadata?.phone === "string"
          ? user.unsafeMetadata.phone
          : (user.primaryPhoneNumber?.phoneNumber ?? "");
      setPhone(extract10Digits(current));
      setIsDirty(false);
    }
  }, [isLoaded, user]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strictly prohibit any non-digit character and restrict to max 10 digits
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(digitsOnly);
    setIsDirty(true);
  };

  const handleSavePhone = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!user || isSavingPhone) {
      return;
    }

    if (phone.length > 0 && phone.length !== 10) {
      showToast("Phone number must be exactly 10 digits");
      return;
    }

    setIsSavingPhone(true);
    try {
      const formatted = phone ? `+91${phone}` : null;
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          phone: formatted,
        },
      });
      setIsDirty(false);
      showToast("Phone number updated successfully");
    } catch {
      showToast("Failed to update phone number. Please try again.");
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleCancelPhone = () => {
    const current =
      typeof user?.unsafeMetadata?.phone === "string"
        ? user.unsafeMetadata.phone
        : (user?.primaryPhoneNumber?.phoneNumber ?? "");
    setPhone(extract10Digits(current));
    setIsDirty(false);
  };

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Manage your profile and account.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SmaranIdCard />

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              {isLoaded && user?.imageUrl ? (
                <Image
                  src={user.imageUrl}
                  alt={user.fullName ?? "Profile"}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-2xl object-cover"
                />
              ) : (
                <div className="h-16 w-16 animate-pulse rounded-2xl bg-black/[0.06] dark:bg-white/[0.06]" />
              )}
              <div>
                <p className="font-display text-base font-semibold text-ink-900">
                  {isLoaded
                    ? user?.fullName || user?.primaryEmailAddress?.emailAddress
                    : "Loading..."}
                </p>
                <p className="text-xs text-ink-500">
                  {apiUser?.is_caregiver ? "Caregiver" : "Role not set"}
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="caregiver-phone"
                  className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-500"
                >
                  <Phone size={13} />
                  Phone Number
                </label>
                {typeof user?.unsafeMetadata?.phone === "string" &&
                  Boolean(user.unsafeMetadata.phone) &&
                  !isDirty && (
                    <span className="text-[11px] font-medium text-mint-600 dark:text-mint-400">
                      Saved in metadata
                    </span>
                  )}
              </div>

              <form onSubmit={handleSavePhone} className="space-y-3">
                <div className="flex rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-surface focus-within:border-indigo-400">
                  <span className="flex items-center justify-center border-r border-black/[0.08] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-3.5 py-2.5 text-sm font-semibold text-ink-500 select-none rounded-l-xl">
                    +91
                  </span>
                  <input
                    id="caregiver-phone"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="9876543210"
                    disabled={!isLoaded || isSavingPhone}
                    className="w-full bg-transparent px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none disabled:opacity-60"
                  />
                </div>

                <p className="text-xs text-ink-500">
                  Used for patient emergency contact and care coordination.
                  Saved directly to your account metadata.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      !isDirty ||
                      isSavingPhone ||
                      !isLoaded ||
                      (phone.length > 0 && phone.length !== 10)
                    }
                    className="gap-1.5"
                  >
                    {isSavingPhone ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Check size={14} /> Save Phone
                      </>
                    )}
                  </Button>

                  {isDirty && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isSavingPhone}
                      onClick={handleCancelPhone}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </div>

            <div className="pt-1">
              <p className="mb-3 text-xs text-ink-500">
                Your name, email, and photo are managed through your account
                provider.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openUserProfile()}
              >
                Manage Account Details
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.05] dark:bg-white/[0.08] text-ink-500">
                <KeyRound size={17} />
              </span>
              <div>
                <p className="text-sm font-medium text-ink-900">
                  Change Password
                </p>
                <p className="text-xs text-ink-500">
                  Update your account password
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openUserProfile()}
              >
                Change Password
              </Button>

              <Button
                variant="danger"
                size="sm"
                className="gap-1.5"
                onClick={() => signOut({ redirectUrl: "/" })}
              >
                <LogOut size={14} /> Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
