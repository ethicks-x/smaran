"use client";

import {
  BarChart3,
  Bell,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "My Patients", icon: Users },
  { href: "/activity", label: "Activity & Progress", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-black/[0.06] dark:border-white/[0.08] bg-surface/80 backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white">
          <Image
            src="/logo-dark.svg"
            alt="Smaran"
            width={160}
            height={160}
            priority
          />
        </div>
        <div>
          <p className="font-display text-lg font-bold leading-none text-ink-900">
            Smaran
          </p>
          <p className="mt-1 text-[11px] leading-none text-ink-500">
            Cognitive Care
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-ink-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-ink-900",
              )}
            >
              <item.icon
                size={19}
                className={cn(
                  "shrink-0",
                  isActive
                    ? "text-indigo-600"
                    : "text-ink-300 group-hover:text-ink-500",
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
