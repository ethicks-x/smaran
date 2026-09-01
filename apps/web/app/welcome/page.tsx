"use client";

import { useAuth } from "@clerk/nextjs";
import { Brain } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useApi } from "@/hooks/use-api";

/** What `POST /auth/caregiver-role` answers with. */
interface RoleGrant {
	user_id: string;
	role: string;
	granted: boolean;
}

/**
 * The step between creating an account and having one that can do anything.
 *
 * Clerk owns identity; it does not own roles. A brand-new caregiver has a Clerk
 * user and no row in the API's `roles` table, and every dashboard route is
 * guarded by that table (`features/auth/service.py`, decisions.md D-20) — so
 * without this call the first thing a new caregiver would meet is a 403 on
 * their own dashboard.
 *
 * Nothing here is a form. The page exists only so the grant happens somewhere
 * the reader can see it fail: the API is a separate origin and can be down or
 * unreachable when the account is minutes old, and silently landing on an empty
 * dashboard would look like the account itself was broken.
 *
 * The call is idempotent server-side, so arriving here twice — a refresh, a
 * retry — costs nothing.
 */
export default function WelcomePage() {
	const router = useRouter();
	const api = useApi();
	const { isLoaded, isSignedIn } = useAuth();

	const [hasFailed, setHasFailed] = useState(false);
	// The effect below must run once per real attempt, not once per render. In
	// development React mounts an effect twice on purpose, and without this the
	// second mount fires a second POST while the first is still in flight.
	const isEnrolling = useRef(false);

	const enroll = useCallback(async () => {
		if (isEnrolling.current) {
			return;
		}

		isEnrolling.current = true;
		setHasFailed(false);

		try {
			await api<RoleGrant>("/auth/caregiver-role", { method: "POST" });
			router.replace("/dashboard");
		} catch {
			// Whether the API refused or could not be reached, the caregiver's next
			// move is the same one, so both land here.
			setHasFailed(true);
			isEnrolling.current = false;
		}
	}, [api, router]);

	useEffect(() => {
		if (isLoaded && isSignedIn) {
			void enroll();
		}
	}, [isLoaded, isSignedIn, enroll]);

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
			<div className="w-full max-w-sm text-center">
				<div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-lavender-500 text-white">
					<Brain size={22} />
				</div>

				{hasFailed ? (
					<>
						<h1 className="mt-6 font-display text-xl font-bold text-ink-900">
							We could not finish setting up your account
						</h1>
						<p className="mt-1.5 text-sm text-ink-500">
							Your account was created. We just could not reach Smaran to finish
							it off — check your connection and try again.
						</p>
						<Button className="mt-6" onClick={() => void enroll()}>
							Try again
						</Button>
					</>
				) : (
					<>
						<h1 className="mt-6 font-display text-xl font-bold text-ink-900">
							Setting up your account
						</h1>
						<p className="mt-1.5 text-sm text-ink-500">
							This only takes a moment.
						</p>
					</>
				)}
			</div>
		</div>
	);
}
