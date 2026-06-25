"use client";

import { KanbanBoard } from "@/components/kanban/kanban-board";
import type { BoardWithColumns, Comment, Profile } from "@/lib/types";
import { useSyncExternalStore } from "react";

function KanbanBoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-80 w-72 shrink-0 animate-pulse rounded-2xl bg-neutral-100"
        />
      ))}
    </div>
  );
}

export function KanbanBoardShell({
  board,
  profile,
  teamMembers,
  commentsMap,
}: {
  board: BoardWithColumns;
  profile: Profile;
  teamMembers: Profile[];
  commentsMap: Record<string, Comment[]>;
}) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!mounted) {
    return <KanbanBoardSkeleton />;
  }

  return (
    <KanbanBoard
      board={board}
      profile={profile}
      teamMembers={teamMembers}
      commentsMap={commentsMap}
    />
  );
}
