"use client";

import { ArrowRight, Brain, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

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

        <form className="mt-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-ink-700"
              htmlFor="email"
            >
              Email
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300"
              />
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-ink-700"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300"
              />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          <Link href="/dashboard">
            <Button type="button" className="w-full gap-2" size="lg">
              Log In <ArrowRight size={16} />
            </Button>
          </Link>
        </form>

        <p className="mt-8 text-center text-sm text-ink-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-indigo-600 hover:text-indigo-700"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
