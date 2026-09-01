import { SignUp } from "@clerk/nextjs";
import { Brain } from "lucide-react";
import Link from "next/link";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md">
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
          Create your account
        </h1>
        <p className="mt-1.5 text-center text-sm text-ink-500">
          Start supporting the people you care for.
        </p>

        <div className="mt-8 flex justify-center">
          {/* Every new account lands on /welcome, never straight on the
              dashboard: Clerk creates the user, but the caregiver role that
              opens every dashboard route is granted by our own API and has to
              be asked for once. `forceRedirectUrl` rather than a fallback so
              the env var pointing sign-up at /dashboard cannot skip it. */}
          <SignUp
            appearance={clerkAppearance}
            signInUrl="/login"
            forceRedirectUrl="/welcome"
          />
        </div>
      </div>
    </div>
  );
}
