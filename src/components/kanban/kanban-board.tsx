"use client";

import { moveTask } from "@/app/actions/tasks";
import { TaskCardItem } from "@/components/kanban/task-card";
import { TaskModal } from "@/components/tasks/task-modal";
import { Button } from "@/components/ui/button";
import type { BoardWithColumns, Comment, Profile, Task } from "@/lib/types";
import { can, canMoveTask } from "@/lib/permissions";
import { COPY } from "@/lib/roles";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

function KanbanColumn({
  id,
  name,
  tasks,
  profile,
  onTaskClick,
  onAddTask,
}: {
  id: string;
  name: string;
  tasks: Task[];
  profile: Profile;
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-2xl border bg-neutral-50 transition ${
        isOver ? "border-neutral-400 bg-neutral-100" : "border-neutral-200"
      }`}
    >
      <div className="flex items-center justify-between p-4">
        <h3 className="text-sm font-semibold text-neutral-900">{name}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-neutral-500">
          {tasks.length}
        </span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3" style={{ minHeight: 120 }}>
          {tasks.map((task) => (
            <TaskCardItem
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              canDrag={canMoveTask(profile, task)}
            />
          ))}
        </div>
      </SortableContext>
      {can(profile, "create_task") && (
        <div className="p-3 pt-0">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-neutral-500"
            onClick={() => onAddTask(id)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add task
          </Button>
        </div>
      )}
    </div>
  );
}

export function KanbanBoard({
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
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskColumnId, setNewTaskColumnId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function findTask(taskId: string): Task | undefined {
    for (const col of board.columns) {
      const task = col.tasks.find((t) => t.id === taskId);
      if (task) return task;
    }
  }

  function findColumnByTaskId(taskId: string) {
    return board.columns.find((col) => col.tasks.some((t) => t.id === taskId));
  }

  function handleDragStart(event: DragStartEvent) {
    const task = findTask(event.active.id as string);
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const task = findTask(taskId);
    if (!task || !canMoveTask(profile, task)) return;

    let targetColumnId = over.id as string;
    const overTask = findTask(over.id as string);
    if (overTask) {
      const col = findColumnByTaskId(overTask.id);
      if (col) targetColumnId = col.id;
    }

    const targetCol = board.columns.find((c) => c.id === targetColumnId);
    if (!targetCol || targetCol.id === task.column_id) return;

    const position = targetCol.tasks.length;

    startTransition(async () => {
      try {
        await moveTask(taskId, targetColumnId, position, board.id);
        toast.success(COPY.taskMoved);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to move task");
      }
    });
  }

  const allEmpty = board.columns.every((c) => c.tasks.length === 0);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {board.columns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              name={column.name}
              tasks={column.tasks}
              profile={profile}
              onTaskClick={setSelectedTask}
              onAddTask={setNewTaskColumnId}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && (
            <div className="rotate-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
              <p className="text-sm font-medium">{activeTask.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {allEmpty && (
        <p className="mt-8 text-center text-sm text-neutral-400">{COPY.emptyBoard}</p>
      )}

      {(selectedTask || newTaskColumnId) && (
        <TaskModal
          task={selectedTask}
          boardId={board.id}
          profile={profile}
          teamMembers={teamMembers}
          comments={selectedTask ? commentsMap[selectedTask.id] ?? [] : []}
          onClose={() => {
            setSelectedTask(null);
            setNewTaskColumnId(null);
          }}
          defaultColumnId={newTaskColumnId ?? undefined}
        />
      )}
    </>
  );
}
