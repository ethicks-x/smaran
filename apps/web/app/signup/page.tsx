"use client";

import { ArrowRight, Brain } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-black/6 bg-surface p-8 shadow-[0_12px_40px_rgba(44,31,88,0.12)] sm:p-10">
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
          Start preserving memories that matter.
        </p>

        <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label
              htmlFor="full_name"
              className="mb-1.5 block text-sm font-medium text-ink-700"
            >
              Full Name
            </label>
            <input
              required
              name="full_name"
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-ink-700"
            >
              Email
            </label>
            <input
              type="email"
              required
              name="email"
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-ink-700"
            >
              Password
            </label>
            <input
              type="password"
              required
              name="password"
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>

          <Link href="/dashboard">
            <Button type="button" className="mt-2 w-full gap-2" size="lg">
              Create Account <ArrowRight size={16} />
            </Button>
          </Link>
        </form>

        <p className="mt-7 text-center text-sm text-ink-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-indigo-600 hover:text-indigo-700"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
