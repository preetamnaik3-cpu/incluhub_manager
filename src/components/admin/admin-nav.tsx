"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users } from "lucide-react";

const TABS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users & Invites", icon: Users },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-neutral-200 bg-white px-8 pt-6">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Super Admin</p>
        <h1 className="text-xl font-bold text-neutral-900">Control Center</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Create projects (Elvix, Kosara), assign managers & clients, invite users.
        </p>
      </div>
      <nav className="-mb-px flex gap-1">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition",
                active ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-700"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
