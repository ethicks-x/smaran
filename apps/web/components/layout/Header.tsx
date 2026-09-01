"use client";

import { useUser } from "@clerk/nextjs";
import { Bell, Menu, Search } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useUnreadCount } from "@/lib/useUnreadCount";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
	const { user } = useUser();
	const unreadCount = useUnreadCount();

	// `user` is null for the first paint while Clerk loads. The row keeps its
	// shape and fills in rather than popping into existence, so the header does
	// not reflow under the pointer.
	const name = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "";

	return (
		<header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.08] bg-background/80 px-5 py-4 backdrop-blur-xl lg:px-8">
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={onMenuClick}
					className="rounded-lg p-2 text-ink-700 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] lg:hidden"
					aria-label="Open menu"
				>
					<Menu size={20} />
				</button>
				<div className="relative hidden sm:block">
					<Search
						size={16}
						className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300"
					/>
					<input
						placeholder="Search patients, memories..."
						className="w-64 rounded-xl border border-black/[0.07] dark:border-white/[0.1] bg-surface py-2.5 pl-10 pr-4 text-sm text-ink-700 placeholder:text-ink-300 focus:border-indigo-400 focus:outline-none lg:w-80"
					/>
				</div>
			</div>

			<div className="flex items-center gap-3">
				<ThemeToggle />
				<Link
					href="/notifications"
					className="relative rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-surface p-2.5 text-ink-700 hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
				>
					<Bell size={18} />
					{unreadCount > 0 && (
						<span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-coral-500 text-[10px] font-semibold text-white">
							{unreadCount}
						</span>
					)}
				</Link>
				<Link
					href="/settings"
					className="flex items-center gap-2.5 rounded-xl pl-1 pr-3 py-1 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
				>
					{/** biome-ignore lint/performance/noImgElement: Image is used for visual purposes only */}
					<img
						src={user?.imageUrl}
						alt=""
						className="h-9 w-9 rounded-full border-2 border-white/80 dark:border-white/20 object-cover"
					/>
					<div className="hidden text-left sm:block">
						<p className="text-sm font-semibold leading-none text-ink-900">
							{name}
						</p>
						<p className="mt-1 text-xs leading-none text-ink-500">Caregiver</p>
					</div>
				</Link>
			</div>
		</header>
	);
}
