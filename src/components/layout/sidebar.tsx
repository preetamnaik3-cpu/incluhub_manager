"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RoleBadge } from "@/components/ui/role-badge";
import type { Board, Profile } from "@/lib/types";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Kanban, Building2, Shield, LogOut } from "lucide-react";

export function Sidebar({ profile, boards }: { profile: Profile; boards: Board[] }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const nav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: Building2 },
    ...(can(profile, "manage_users")
      ? [{ href: "/admin", label: "Admin", icon: Shield }]
      : []),
  ];

  return (
    <aside className="flex h-full w-64 flex-col border-r border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 p-5">
        <h1 className="text-lg font-bold text-neutral-900">inclu_manager</h1>
        <p className="text-xs text-neutral-400">by Incluhub</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-700">
            {(profile.full_name || profile.email)[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-neutral-900">
              {profile.full_name || profile.email}
            </p>
            <RoleBadge role={profile.role} />
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition",
              pathname === item.href || pathname.startsWith(`${item.href}/`)
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}

        {boards.length > 0 && (
          <div className="pt-4">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Boards
            </p>
            {boards.map((board) => (
              <Link
                key={board.id}
                href={`/board/${board.id}`}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition",
                  pathname === `/board/${board.id}`
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                )}
              >
                <Kanban className="h-4 w-4" />
                <span className="truncate">{board.name}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div className="border-t border-neutral-200 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
