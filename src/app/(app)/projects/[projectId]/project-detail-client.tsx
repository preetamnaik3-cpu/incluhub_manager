"use client";

import {
  addTeamMember,
  assignProjectClient,
  assignProjectManager,
  createTeamUnderProject,
  removeProjectManager,
  removeTeamMember,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RoleBadge } from "@/components/ui/role-badge";
import type { Board, Profile, Project, Team, TeamMember } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Kanban, UserPlus, Users } from "lucide-react";

export function ProjectDetailClient({
  project,
  profile,
  managers,
  teamsWithBoards,
  allProfiles,
  canManage,
}: {
  project: Project;
  profile: Profile;
  managers: Profile[];
  teamsWithBoards: {
    team: Team;
    board: Board | null;
    members: TeamMember[];
  }[];
  allProfiles: Profile[];
  canManage: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleCreateTeam(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("projectId", project.id);
      await createTeamUnderProject(fd);
      toast.success("Team and board created!");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignManager(profileId: string) {
    try {
      await assignProjectManager(project.id, profileId);
      toast.success("Manager assigned");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleAssignClient(profileId: string) {
    try {
      await assignProjectClient(project.id, profileId);
      toast.success("Client assigned to project");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleAddMember(teamId: string, profileId: string, role: "editor" | "viewer") {
    try {
      await addTeamMember(teamId, profileId, role);
      toast.success("Member added to team");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  const managerCandidates = allProfiles.filter((p) =>
    ["manager", "editor", "viewer", "super_admin"].includes(p.role)
  );
  const clientCandidates = allProfiles.filter((p) => p.role !== "super_admin");
  const memberCandidates = allProfiles.filter((p) =>
    ["editor", "viewer", "manager"].includes(p.role)
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Project</p>
        <h1 className="text-2xl font-bold text-neutral-900">{project.name}</h1>
        {project.description && (
          <p className="mt-1 text-sm text-neutral-500">{project.description}</p>
        )}
      </div>

      {profile.role === "super_admin" && (
        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Managers</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {managers.map((m) => (
                <div key={m.id} className="flex items-center justify-between">
                  <span className="text-sm">{m.full_name || m.email}</span>
                  <Button size="sm" variant="ghost" onClick={() => removeProjectManager(project.id, m.id).then(() => window.location.reload())}>
                    Remove
                  </Button>
                </div>
              ))}
              <select
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                defaultValue=""
                onChange={(e) => e.target.value && handleAssignManager(e.target.value)}
              >
                <option value="">Add manager…</option>
                {managerCandidates.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                ))}
              </select>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Client (view + comment)</h2>
            </CardHeader>
            <CardContent>
              {project.client && (
                <p className="mb-3 text-sm">{project.client.full_name || project.client.email}</p>
              )}
              <select
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                defaultValue=""
                onChange={(e) => e.target.value && handleAssignClient(e.target.value)}
              >
                <option value="">Assign client…</option>
                {clientCandidates.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                ))}
              </select>
            </CardContent>
          </Card>
        </div>
      )}

      {canManage && (
        <Card className="mb-8">
          <CardContent className="pt-5">
            <form onSubmit={handleCreateTeam} className="flex flex-wrap gap-3">
              <Input name="name" placeholder="Team name (e.g. Web Dev, HR)" required className="max-w-xs" />
              <Button type="submit" disabled={loading}>
                <UserPlus className="mr-1 h-4 w-4" />
                Create team + board
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {teamsWithBoards.length === 0 ? (
          <p className="text-sm text-neutral-400">No teams yet — manager can create HR, Web Dev, etc.</p>
        ) : (
          teamsWithBoards.map(({ team, board, members }) => (
            <Card key={team.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <h3 className="font-semibold">{team.name}</h3>
                </div>
                {board && (
                  <Link href={`/board/${board.id}`}>
                    <Button size="sm" variant="secondary">
                      <Kanban className="mr-1 h-4 w-4" />
                      Open board
                    </Button>
                  </Link>
                )}
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-neutral-400">{members.length} members</p>
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.profile_id} className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{m.profile?.full_name || m.profile?.email}</span>
                        <RoleBadge role={m.member_role === "editor" ? "editor" : "viewer"} />
                      </div>
                      {canManage && (
                        <Button size="sm" variant="ghost" onClick={() => removeTeamMember(team.id, m.profile_id).then(() => window.location.reload())}>
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {canManage && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <select
                      id={`add-${team.id}`}
                      className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                      defaultValue=""
                    >
                      <option value="">Select user…</option>
                      {memberCandidates.map((p) => (
                        <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={() => {
                        const sel = document.getElementById(`add-${team.id}`) as HTMLSelectElement;
                        if (sel?.value) handleAddMember(team.id, sel.value, "editor");
                      }}
                    >
                      Add as Editor
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const sel = document.getElementById(`add-${team.id}`) as HTMLSelectElement;
                        if (sel?.value) handleAddMember(team.id, sel.value, "viewer");
                      }}
                    >
                      Add as Viewer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
