"use client";

import { RoleBadge } from "@/components/ui/role-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ROLE_CONFIG, ROLE_DESCRIPTIONS } from "@/lib/roles";
import type { Invite, Profile, Team, UserRole } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight, Mail, Shield, Users, UsersRound, FolderKanban } from "lucide-react";

export function AdminOverviewClient({
  stats,
  recentUsers,
  teams,
  invites,
}: {
  stats: {
    totalUsers: number;
    totalTeams: number;
    totalProjects: number;
    pendingInvites: number;
    byRole: Record<string, number>;
  };
  recentUsers: Profile[];
  teams: Team[];
  invites: Invite[];
}) {
  const roleKeys = Object.keys(ROLE_CONFIG) as UserRole[];

  return (
    <div className="space-y-8 p-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={stats.totalUsers} />
        <StatCard icon={UsersRound} label="Teams" value={stats.totalTeams} />
        <StatCard icon={FolderKanban} label="Projects" value={stats.totalProjects} />
        <StatCard icon={Mail} label="Pending invites" value={stats.pendingInvites} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">Users by role</h2>
            <Link
              href="/admin/users"
              className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900"
            >
              Manage all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {roleKeys.map((role) => (
              <div
                key={role}
                className="flex items-center justify-between rounded-xl border border-neutral-100 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <RoleBadge role={role} />
                  <p className="text-xs text-neutral-500">{ROLE_DESCRIPTIONS[role]}</p>
                </div>
                <span className="text-lg font-bold text-neutral-900">
                  {stats.byRole[role] ?? 0}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">Recent users</h2>
            <Link
              href="/admin/users"
              className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-neutral-400">No users yet.</p>
            ) : (
              recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-xl border border-neutral-100 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {user.full_name || user.email}
                    </p>
                    <p className="text-xs text-neutral-400">{user.email}</p>
                  </div>
                  <RoleBadge role={user.role} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
              <Shield className="h-5 w-5 text-violet-600" />
              Bootstrap note
            </h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-600">
              The first super admin is assigned manually in Supabase SQL. After that,
              use <strong>Users &amp; Roles</strong> to manage everyone else — change roles,
              assign teams, and send invites.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-neutral-900">Pending invites</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            {invites.length === 0 ? (
              <p className="text-sm text-neutral-400">No pending invites.</p>
            ) : (
              invites.slice(0, 5).map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-xl border border-neutral-100 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{invite.email}</p>
                    <p className="text-xs text-neutral-400">
                      Expires {formatDate(invite.expires_at)}
                    </p>
                  </div>
                  <RoleBadge role={invite.role} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-neutral-900">Teams snapshot</h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="rounded-xl border border-neutral-100 px-4 py-3"
              >
                <p className="font-medium text-neutral-900">{team.name}</p>
                <p className="text-xs text-neutral-400">
                  {recentUsers.filter((u) => u.team_id === team.id).length} members in snapshot
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-5">
        <div className="rounded-xl bg-neutral-100 p-3">
          <Icon className="h-5 w-5 text-neutral-700" />
        </div>
        <div>
          <p className="text-2xl font-bold text-neutral-900">{value}</p>
          <p className="text-sm text-neutral-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
