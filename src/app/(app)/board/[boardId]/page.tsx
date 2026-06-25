import { KanbanBoardShell } from "@/components/kanban/kanban-board-shell";
import { requireUser } from "@/lib/auth";
import {
  getBoardWithTasks,
  getComments,
  getTeamMembers,
} from "@/lib/data";
import { notFound } from "next/navigation";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const profile = await requireUser();
  const board = await getBoardWithTasks(boardId);

  if (!board) notFound();

  const teamMembers = await getTeamMembers(board.team_id);
  const allTaskIds = board.columns.flatMap((c) => c.tasks.map((t) => t.id));

  const commentsMap: Record<string, Awaited<ReturnType<typeof getComments>>> = {};
  await Promise.all(
    allTaskIds.map(async (taskId) => {
      commentsMap[taskId] = await getComments(taskId);
    })
  );

  return (
    <div className="flex h-full flex-col p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">{board.name}</h1>
        {board.team?.project && (
          <p className="mt-1 text-sm text-neutral-500">
            Project: {board.team.project.name} · Team: {board.team.name}
          </p>
        )}
        {board.team && !board.team.project && (
          <p className="mt-1 text-sm text-neutral-500">Team: {board.team.name}</p>
        )}
      </div>
      <KanbanBoardShell
        board={board}
        profile={profile}
        teamMembers={teamMembers}
        commentsMap={commentsMap}
      />
    </div>
  );
}
