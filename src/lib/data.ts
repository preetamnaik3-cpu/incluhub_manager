import { createClient } from "@/lib/supabase/server";
import type {
  Board,
  BoardWithColumns,
  Comment,
  Profile,
  Project,
  Task,
  Team,
  TeamMember,
} from "@/lib/types";

const boardSelect = "*, team:teams(*, project:projects(*))";

export async function getBoardsForUser(profile: Profile): Promise<Board[]> {
  const supabase = await createClient();

  if (profile.role === "super_admin") {
    const { data } = await supabase.from("boards").select(boardSelect).order("created_at");
    return (data as Board[]) ?? [];
  }

  if (profile.role === "manager") {
    const { data: managed } = await supabase
      .from("project_managers")
      .select("project_id")
      .eq("profile_id", profile.id);
    const projectIds = managed?.map((m) => m.project_id) ?? [];
    if (projectIds.length === 0) return [];

    const { data: teams } = await supabase
      .from("teams")
      .select("id")
      .in("project_id", projectIds);
    const teamIds = teams?.map((t) => t.id) ?? [];
    if (teamIds.length === 0) return [];

    const { data } = await supabase
      .from("boards")
      .select(boardSelect)
      .in("team_id", teamIds)
      .order("created_at");
    return (data as Board[]) ?? [];
  }

  if (profile.role === "client" && profile.client_project_id) {
    const { data: teams } = await supabase
      .from("teams")
      .select("id")
      .eq("project_id", profile.client_project_id);
    const teamIds = teams?.map((t) => t.id) ?? [];
    if (teamIds.length === 0) return [];

    const { data } = await supabase
      .from("boards")
      .select(boardSelect)
      .in("team_id", teamIds)
      .order("created_at");
    return (data as Board[]) ?? [];
  }

  if (profile.role === "editor" || profile.role === "viewer") {
    const { data: memberships } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("profile_id", profile.id);
    const teamIds = memberships?.map((m) => m.team_id) ?? [];
    if (teamIds.length === 0) return [];

    const { data } = await supabase
      .from("boards")
      .select(boardSelect)
      .in("team_id", teamIds)
      .order("created_at");
    return (data as Board[]) ?? [];
  }

  return [];
}

export async function getProjectsForUser(profile: Profile): Promise<Project[]> {
  const supabase = await createClient();
  const select = "*, client:profiles!projects_client_user_id_fkey(*)";

  if (profile.role === "super_admin") {
    const { data } = await supabase.from("projects").select(select).order("name");
    return (data as Project[]) ?? [];
  }

  if (profile.role === "manager") {
    const { data: managed } = await supabase
      .from("project_managers")
      .select("project_id")
      .eq("profile_id", profile.id);
    const projectIds = managed?.map((m) => m.project_id) ?? [];
    if (projectIds.length === 0) return [];
    const { data } = await supabase.from("projects").select(select).in("id", projectIds);
    return (data as Project[]) ?? [];
  }

  if (profile.role === "client" && profile.client_project_id) {
    const { data } = await supabase
      .from("projects")
      .select(select)
      .eq("id", profile.client_project_id)
      .maybeSingle();
    return data ? [data as Project] : [];
  }

  if (profile.role === "editor" || profile.role === "viewer") {
    const { data: memberships } = await supabase
      .from("team_members")
      .select("team:teams(project_id)")
      .eq("profile_id", profile.id);
    const projectIds = [
      ...new Set(
        (memberships ?? [])
          .map((m) => {
            const team = m.team as { project_id: string | null } | { project_id: string | null }[] | null;
            if (Array.isArray(team)) return team[0]?.project_id;
            return team?.project_id;
          })
          .filter(Boolean) as string[]
      ),
    ];
    if (projectIds.length === 0) return [];
    const { data } = await supabase.from("projects").select(select).in("id", projectIds);
    return (data as Project[]) ?? [];
  }

  return [];
}

export async function getProjectWithTeams(projectId: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*, client:profiles!projects_client_user_id_fkey(*), teams(*)")
    .eq("id", projectId)
    .maybeSingle();
  return data as Project | null;
}

export async function getTeamsForProject(projectId: string): Promise<Team[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teams")
    .select("*")
    .eq("project_id", projectId)
    .order("name");
  return (data as Team[]) ?? [];
}

export async function getTeamMembersForTeam(teamId: string): Promise<TeamMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("*, profile:profiles(*)")
    .eq("team_id", teamId);
  return (data as TeamMember[]) ?? [];
}

export async function getBoardForTeam(teamId: string): Promise<Board | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("boards")
    .select(boardSelect)
    .eq("team_id", teamId)
    .is("project_id", null)
    .maybeSingle();
  return data as Board | null;
}

export async function getBoardWithTasks(boardId: string): Promise<BoardWithColumns | null> {
  const supabase = await createClient();

  const { data: board } = await supabase
    .from("boards")
    .select(boardSelect)
    .eq("id", boardId)
    .single();

  if (!board) return null;

  const { data: columns } = await supabase
    .from("columns")
    .select("*")
    .eq("board_id", boardId)
    .order("position");

  const columnIds = columns?.map((c) => c.id) ?? [];
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!assignee_id(*), creator:profiles!created_by(*)")
    .in("column_id", columnIds.length ? columnIds : ["00000000-0000-0000-0000-000000000000"])
    .order("position");

  const tasksByColumn =
    (tasks as Task[] | null)?.reduce(
      (acc, task) => {
        if (!acc[task.column_id]) acc[task.column_id] = [];
        acc[task.column_id].push(task);
        return acc;
      },
      {} as Record<string, Task[]>
    ) ?? {};

  return {
    ...(board as Board),
    columns: (columns ?? []).map((col) => ({
      ...col,
      tasks: tasksByColumn[col.id] ?? [],
    })),
  };
}

export async function getMyTasks(profile: Profile): Promise<Task[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!assignee_id(*)")
    .eq("assignee_id", profile.id)
    .order("due_date", { ascending: true });
  return (data as Task[]) ?? [];
}

export async function getTeamMembers(teamId: string | null): Promise<Profile[]> {
  if (!teamId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("profile:profiles(*)")
    .eq("team_id", teamId);
  return (data?.map((r) => (r as unknown as { profile: Profile }).profile).filter(Boolean) ?? []);
}

export async function getComments(taskId: string): Promise<Comment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select("*, author:profiles(*)")
    .eq("task_id", taskId)
    .order("created_at");
  return (data as Comment[]) ?? [];
}

export async function getAllProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("email");
  return (data as Profile[]) ?? [];
}

export async function getAllTeams() {
  const supabase = await createClient();
  const { data } = await supabase.from("teams").select("*, project:projects(*)").order("name");
  return data ?? [];
}

export async function getPendingInvites() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invites")
    .select("*")
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getProjectManagers(projectId: string): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_managers")
    .select("profile:profiles(*)")
    .eq("project_id", projectId);
  return (data?.map((r) => (r as unknown as { profile: Profile }).profile).filter(Boolean) ?? []);
}

export async function getAdminStats() {
  const supabase = await createClient();
  const [profiles, projects, teams, invites] = await Promise.all([
    getAllProfiles(),
    supabase.from("projects").select("id"),
    getAllTeams(),
    getPendingInvites(),
  ]);

  const byRole = profiles.reduce(
    (acc, p) => {
      acc[p.role] = (acc[p.role] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    totalUsers: profiles.length,
    totalProjects: projects.data?.length ?? 0,
    totalTeams: teams.length,
    pendingInvites: invites.length,
    byRole,
  };
}

export async function userManagesProject(profile: Profile, projectId: string): Promise<boolean> {
  if (profile.role === "super_admin") return true;
  if (profile.role !== "manager") return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_managers")
    .select("project_id")
    .eq("profile_id", profile.id)
    .eq("project_id", projectId)
    .maybeSingle();
  return !!data;
}
