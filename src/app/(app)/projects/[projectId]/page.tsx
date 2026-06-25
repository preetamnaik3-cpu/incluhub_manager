import { ProjectDetailClient } from "./project-detail-client";
import { requireUser } from "@/lib/auth";
import {
  getAllProfiles,
  getBoardForTeam,
  getProjectManagers,
  getProjectWithTeams,
  getTeamMembersForTeam,
  userManagesProject,
} from "@/lib/data";
import { notFound, redirect } from "next/navigation";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const profile = await requireUser();
  const project = await getProjectWithTeams(projectId);

  if (!project) notFound();

  const canManage =
    profile.role === "super_admin" || (await userManagesProject(profile, projectId));
  const canView =
    canManage ||
    profile.client_project_id === projectId ||
    profile.role === "editor" ||
    profile.role === "viewer";

  if (!canView && profile.role !== "super_admin") redirect("/projects");

  const managers = await getProjectManagers(projectId);
  const allProfiles = profile.role === "super_admin" || canManage ? await getAllProfiles() : [];

  const teamsWithBoards = await Promise.all(
    (project.teams ?? []).map(async (team) => ({
      team,
      board: await getBoardForTeam(team.id),
      members: await getTeamMembersForTeam(team.id),
    }))
  );

  return (
    <ProjectDetailClient
      project={project}
      profile={profile}
      managers={managers}
      teamsWithBoards={teamsWithBoards}
      allProfiles={allProfiles}
      canManage={canManage}
    />
  );
}
