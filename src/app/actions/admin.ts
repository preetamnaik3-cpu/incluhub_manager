"use server";

import { requireRole, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { userManagesProject } from "@/lib/data";
import type { TeamMemberRole, UserRole } from "@/lib/types";
import { revalidatePath } from "next/cache";

async function requireSuperAdmin() {
  return requireRole(["super_admin"]);
}

async function requireManagerOrSuper(projectId?: string) {
  const profile = await requireUser();
  if (profile.role === "super_admin") return profile;
  if (profile.role === "manager" && projectId && (await userManagesProject(profile, projectId))) {
    return profile;
  }
  if (profile.role === "manager" && !projectId) return profile;
  throw new Error("Unauthorized");
}

function revalidateAll() {
  revalidatePath("/admin");
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}

async function ensureTeamBoard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
  teamName: string
) {
  const { data: existing } = await supabase
    .from("boards")
    .select("id")
    .eq("team_id", teamId)
    .maybeSingle();
  if (!existing) {
    await supabase.from("boards").insert({ name: `${teamName} Board`, team_id: teamId });
  }
}

export async function createCompanyProject(formData: FormData) {
  await requireSuperAdmin();
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;

  const { error } = await supabase.from("projects").insert({ name, description });
  if (error) throw new Error(error.message);
  revalidateAll();
}

export async function assignProjectManager(projectId: string, profileId: string) {
  await requireSuperAdmin();
  const supabase = await createClient();

  await supabase.from("profiles").update({ role: "manager" }).eq("id", profileId);
  const { error } = await supabase
    .from("project_managers")
    .upsert({ project_id: projectId, profile_id: profileId });
  if (error) throw new Error(error.message);
  revalidateAll();
}

export async function removeProjectManager(projectId: string, profileId: string) {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_managers")
    .delete()
    .eq("project_id", projectId)
    .eq("profile_id", profileId);
  if (error) throw new Error(error.message);
  revalidateAll();
}

export async function assignProjectClient(projectId: string, profileId: string) {
  await requireSuperAdmin();
  const supabase = await createClient();

  await supabase
    .from("profiles")
    .update({ role: "client", client_project_id: projectId, team_id: null })
    .eq("id", profileId);

  await supabase.from("projects").update({ client_user_id: profileId }).eq("id", projectId);
  revalidateAll();
}

export async function createTeamUnderProject(formData: FormData) {
  const projectId = formData.get("projectId") as string;
  await requireManagerOrSuper(projectId);
  const supabase = await createClient();
  const name = formData.get("name") as string;

  const { data: team, error } = await supabase
    .from("teams")
    .insert({ name, project_id: projectId })
    .select("id, name")
    .single();
  if (error) throw new Error(error.message);

  await ensureTeamBoard(supabase, team.id, team.name);
  revalidatePath(`/projects/${projectId}`);
  revalidateAll();
}

export async function addTeamMember(
  teamId: string,
  profileId: string,
  memberRole: TeamMemberRole
) {
  const supabase = await createClient();
  const { data: team } = await supabase
    .from("teams")
    .select("project_id")
    .eq("id", teamId)
    .single();
  if (!team?.project_id) throw new Error("Team not found");

  await requireManagerOrSuper(team.project_id);

  await supabase
    .from("profiles")
    .update({ role: memberRole, team_id: null, client_project_id: null })
    .eq("id", profileId);

  const { error } = await supabase.from("team_members").upsert({
    team_id: teamId,
    profile_id: profileId,
    member_role: memberRole,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${team.project_id}`);
  revalidateAll();
}

export async function removeTeamMember(teamId: string, profileId: string) {
  const supabase = await createClient();
  const { data: team } = await supabase
    .from("teams")
    .select("project_id")
    .eq("id", teamId)
    .single();
  if (!team?.project_id) throw new Error("Team not found");
  await requireManagerOrSuper(team.project_id);

  await supabase.from("team_members").delete().eq("team_id", teamId).eq("profile_id", profileId);
  revalidatePath(`/projects/${team.project_id}`);
  revalidateAll();
}

export async function createInvite(formData: FormData) {
  await requireSuperAdmin();
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const role = formData.get("role") as UserRole;
  const projectId = (formData.get("projectId") as string) || null;
  const teamId = (formData.get("teamId") as string) || null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("invites")
    .insert({
      email,
      role,
      project_id: projectId,
      team_id: teamId,
      created_by: user.id,
    })
    .select("token")
    .single();

  if (error) throw new Error(error.message);
  revalidateAll();
  return data.token as string;
}

export async function updateUserAccess(
  profileId: string,
  role: UserRole,
  projectId: string | null,
  teamId: string | null,
  memberRole: TeamMemberRole | null
) {
  const currentUser = await requireSuperAdmin();
  const supabase = await createClient();

  if (profileId === currentUser.id && role !== "super_admin") {
    throw new Error("You cannot remove your own super admin access.");
  }

  await supabase
    .from("profiles")
    .update({
      role,
      team_id: null,
      client_project_id: role === "client" ? projectId : null,
    })
    .eq("id", profileId);

  await supabase.from("project_managers").delete().eq("profile_id", profileId);
  await supabase.from("team_members").delete().eq("profile_id", profileId);

  if (role === "manager" && projectId) {
    await supabase.from("project_managers").insert({ project_id: projectId, profile_id: profileId });
  }
  if (role === "client" && projectId) {
    await supabase.from("projects").update({ client_user_id: profileId }).eq("id", projectId);
  }
  if ((role === "editor" || role === "viewer") && teamId && memberRole) {
    await supabase.from("team_members").insert({
      team_id: teamId,
      profile_id: profileId,
      member_role: memberRole,
    });
  }

  revalidateAll();
}

export async function revokeInvite(inviteId: string) {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("invites").delete().eq("id", inviteId);
  if (error) throw new Error(error.message);
  revalidateAll();
}

// Legacy exports for gradual cleanup
export async function createTeam(formData: FormData) {
  return createTeamUnderProject(formData);
}

export async function createProject(formData: FormData) {
  return createCompanyProject(formData);
}

export async function updateProfileRole(
  profileId: string,
  role: UserRole,
  teamId: string | null
) {
  return updateUserAccess(profileId, role, null, teamId, role === "editor" ? "editor" : "viewer");
}

export async function updateTeamManager() {
  throw new Error("Use assignProjectManager instead");
}
