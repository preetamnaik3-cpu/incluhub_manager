import { AdminUsersClient } from "./admin-users-client";
import { requireRole } from "@/lib/auth";
import { getAllProfiles, getAllTeams, getPendingInvites, getProjectsForUser } from "@/lib/data";

export default async function AdminUsersPage() {
  const currentUser = await requireRole(["super_admin"]);
  const [profiles, projects, teams, invites] = await Promise.all([
    getAllProfiles(),
    getProjectsForUser(currentUser),
    getAllTeams(),
    getPendingInvites(),
  ]);

  return (
    <AdminUsersClient
      profiles={profiles}
      projects={projects}
      teams={teams}
      invites={invites}
      currentUserId={currentUser.id}
    />
  );
}
