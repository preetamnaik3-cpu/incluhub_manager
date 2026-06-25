import { AdminOverviewClient } from "./admin-overview-client";
import {
  getAdminStats,
  getAllProfiles,
  getAllTeams,
  getPendingInvites,
} from "@/lib/data";

export default async function AdminOverviewPage() {
  const [stats, profiles, teams, invites] = await Promise.all([
    getAdminStats(),
    getAllProfiles(),
    getAllTeams(),
    getPendingInvites(),
  ]);

  return (
    <AdminOverviewClient
      stats={stats}
      recentUsers={profiles.slice(0, 5)}
      teams={teams}
      invites={invites}
    />
  );
}
