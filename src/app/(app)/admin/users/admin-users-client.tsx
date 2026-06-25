"use client";

import {
  createInvite,
  revokeInvite,
  updateUserAccess,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RoleBadge } from "@/components/ui/role-badge";
import {
  ASSIGNABLE_ROLES,
  getRoleLabel,
  ROLE_DESCRIPTIONS,
} from "@/lib/roles";
import type { Invite, Profile, Project, Team, UserRole } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Copy, Search, Trash2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function AdminUsersClient({
  profiles,
  projects,
  teams,
  invites,
  currentUserId,
}: {
  profiles: Profile[];
  projects: Project[];
  teams: Team[];
  invites: Invite[];
  currentUserId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [search, setSearch] = useState("");

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      const token = await createInvite(fd);
      setInviteLink(`${window.location.origin}/login?invite=${token}`);
      toast.success("Invite created!");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return profiles.filter(
      (p) =>
        !q ||
        p.email.toLowerCase().includes(q) ||
        (p.full_name?.toLowerCase().includes(q) ?? false)
    );
  }, [profiles, search]);

  return (
    <div className="space-y-8 p-8">
      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <UserPlus className="h-5 w-5" />
            Invite user
          </h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="grid gap-3 lg:grid-cols-5">
            <Input name="email" type="email" placeholder="Email" required />
            <select name="role" required className="rounded-xl border border-neutral-200 px-3 py-2 text-sm">
              {ASSIGNABLE_ROLES.filter((r) => r !== "super_admin").map((r) => (
                <option key={r} value={r}>{getRoleLabel(r)}</option>
              ))}
            </select>
            <select name="projectId" className="rounded-xl border border-neutral-200 px-3 py-2 text-sm">
              <option value="">Project (optional)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select name="teamId" className="rounded-xl border border-neutral-200 px-3 py-2 text-sm">
              <option value="">Team (editor/viewer)</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <Button type="submit" disabled={loading}>Create invite</Button>
          </form>
          {inviteLink && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-neutral-50 p-3">
              <code className="flex-1 truncate text-xs">{inviteLink}</code>
              <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success("Copied"); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">All users</h2>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="mt-3 max-w-sm" />
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-neutral-100 px-4 py-3">
              <div>
                <p className="font-medium">{p.full_name || p.email}</p>
                <p className="text-xs text-neutral-400">{p.email}</p>
              </div>
              <RoleBadge role={p.role} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-lg font-semibold">Role reference</h2></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {ASSIGNABLE_ROLES.map((role) => (
            <div key={role} className="rounded-xl border border-neutral-100 px-4 py-3">
              <RoleBadge role={role} />
              <p className="mt-2 text-sm text-neutral-600">{ROLE_DESCRIPTIONS[role]}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
