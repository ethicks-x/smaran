"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { KeyRound, LogOut } from "lucide-react";
import { SmaranIdCard } from "@/components/care/SmaranIdCard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useCurrentUser } from "@/lib/api/useCurrentUser";

export default function SettingsPage() {
	const { user, isLoaded } = useUser();
	const { user: apiUser } = useCurrentUser();
	const { signOut, openUserProfile } = useClerk();

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
								<img
									src={user.imageUrl}
									alt={user.fullName ?? "Profile"}
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

						<p className="text-xs text-ink-500">
							Your name, email, and photo are managed through your account
							provider. Click below to edit them.
						</p>

						<Button size="sm" onClick={() => openUserProfile()}>
							Manage Profile
						</Button>
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
					</CardContent>
				</Card>
			</div>
		</DashboardShell>
	);
}
