import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RoleBadge } from "@/components/ui/role-badge";
import { requireUser } from "@/lib/auth";
import { getBoardsForUser, getMyTasks, getProjectsForUser } from "@/lib/data";
import { COPY } from "@/lib/roles";
import { formatDate } from "@/lib/utils";
import { AlertCircle, Building2, Calendar, CheckCircle2, Kanban } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const profile = await requireUser();
  const tasks = await getMyTasks(profile);
  const boards = await getBoardsForUser(profile);
  const projects = await getProjectsForUser(profile);

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const overdue = tasks.filter((t) => t.due_date && new Date(t.due_date) < now);
  const dueThisWeek = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) >= now && new Date(t.due_date) <= weekEnd
  );

  const showMyTasks = profile.role === "editor" || profile.role === "manager" || profile.role === "super_admin";

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">
          {COPY.greeting(profile.full_name || profile.email.split("@")[0])}
        </h1>
        <div className="mt-2">
          <RoleBadge role={profile.role} />
        </div>
      </div>

      {showMyTasks && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 pt-5">
              <CheckCircle2 className="h-5 w-5 text-neutral-700" />
              <div>
                <p className="text-2xl font-bold">{tasks.length}</p>
                <p className="text-sm text-neutral-500">My assigned tasks</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-5">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{overdue.length}</p>
                <p className="text-sm text-neutral-500">Overdue</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-5">
              <Calendar className="h-5 w-5 text-sky-600" />
              <div>
                <p className="text-2xl font-bold">{dueThisWeek.length}</p>
                <p className="text-sm text-neutral-500">Due this week</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {projects.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Your Projects</h2>
            </CardHeader>
            <CardContent className="space-y-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3 hover:bg-neutral-50"
                >
                  <Building2 className="h-4 w-4 text-neutral-500" />
                  <span className="text-sm font-medium">{project.name}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className={projects.length === 0 ? "lg:col-span-2" : ""}>
          <CardHeader>
            <h2 className="text-lg font-semibold">Your Boards</h2>
            <p className="text-xs text-neutral-400">
              {profile.role === "viewer" && "Read-only · no comments"}
              {profile.role === "client" && "View + comment on your project"}
              {profile.role === "editor" && "Edit & move only your assigned tasks"}
              {profile.role === "manager" && "Full control on your project teams"}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {boards.length === 0 ? (
              <p className="text-sm text-neutral-400">{COPY.emptyBoard}</p>
            ) : (
              boards.map((board) => (
                <Link
                  key={board.id}
                  href={`/board/${board.id}`}
                  className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3 hover:bg-neutral-50"
                >
                  <Kanban className="h-4 w-4 text-neutral-500" />
                  <span className="text-sm font-medium">{board.name}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
