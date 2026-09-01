import { SignIn } from "@clerk/nextjs";
import { Brain } from "lucide-react";
import Link from "next/link";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function LoginPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
			<div className="w-full max-w-sm">
				<Link
					href="/"
					className="mb-8 flex items-center justify-center gap-2.5"
				>
					<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-lavender-500 text-white">
						<Brain size={18} />
					</div>
					<span className="font-display text-xl font-bold text-ink-900">
						Smaran
					</span>
				</Link>

				<h1 className="text-center font-display text-2xl font-bold text-ink-900">
					Welcome back
				</h1>
				<p className="mt-1.5 text-center text-sm text-ink-500">
					Log in to continue supporting your loved ones.
				</p>

				<div className="mt-8 flex justify-center">
					<SignIn appearance={clerkAppearance} signUpUrl="/signup" />
				</div>
			</div>
		</div>
	);
}
