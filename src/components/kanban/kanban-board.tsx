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
  useDroppable,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type ColumnWithTasks = BoardWithColumns["columns"][number];

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
    <div className="flex w-72 shrink-0 flex-col rounded-2xl border border-neutral-200 bg-neutral-50">
      <div className="flex items-center justify-between p-4">
        <h3 className="text-sm font-semibold text-neutral-900">{name}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-neutral-500">
          {tasks.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[160px] flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3 transition ${
          isOver ? "rounded-xl bg-neutral-100 ring-2 ring-neutral-300 ring-inset" : ""
        }`}
      >
        {tasks.map((task) => (
          <TaskCardItem
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            canDrag={canMoveTask(profile, task)}
          />
        ))}
      </div>
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

function findTaskInColumns(columns: ColumnWithTasks[], taskId: string): Task | undefined {
  for (const col of columns) {
    const task = col.tasks.find((t) => t.id === taskId);
    if (task) return task;
  }
}

function findColumnForTask(columns: ColumnWithTasks[], taskId: string): ColumnWithTasks | undefined {
  return columns.find((col) => col.tasks.some((t) => t.id === taskId));
}

function moveTaskBetweenColumns(
  columns: ColumnWithTasks[],
  taskId: string,
  targetColumnId: string
): ColumnWithTasks[] {
  const sourceCol = findColumnForTask(columns, taskId);
  const task = sourceCol?.tasks.find((t) => t.id === taskId);
  if (!sourceCol || !task || sourceCol.id === targetColumnId) return columns;

  return columns.map((col) => {
    if (col.id === sourceCol.id) {
      return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) };
    }
    if (col.id === targetColumnId) {
      const moved: Task = { ...task, column_id: targetColumnId, position: col.tasks.length };
      return { ...col, tasks: [...col.tasks, moved] };
    }
    return col;
  });
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
  const router = useRouter();
  const [columns, setColumns] = useState(board.columns);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskColumnId, setNewTaskColumnId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setColumns(board.columns);
  }, [board.columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function resolveTargetColumnId(overId: string): string | null {
    const column = columns.find((c) => c.id === overId);
    if (column) return column.id;

    const overTask = findTaskInColumns(columns, overId);
    if (overTask) {
      return findColumnForTask(columns, overId)?.id ?? null;
    }

    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const task = findTaskInColumns(columns, event.active.id as string);
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const task = findTaskInColumns(columns, taskId);
    if (!task || !canMoveTask(profile, task)) return;

    const targetColumnId = resolveTargetColumnId(over.id as string);
    if (!targetColumnId || targetColumnId === task.column_id) return;

    const targetCol = columns.find((c) => c.id === targetColumnId);
    if (!targetCol) return;

    const previousColumns = columns;
    const position = targetCol.tasks.length;

    setColumns((prev) => moveTaskBetweenColumns(prev, taskId, targetColumnId));

    startTransition(async () => {
      try {
        await moveTask(taskId, targetColumnId, position, board.id);
        toast.success(COPY.taskMoved);
        router.refresh();
      } catch (err) {
        setColumns(previousColumns);
        toast.error(err instanceof Error ? err.message : "Failed to move task");
      }
    });
  }

  const allEmpty = columns.every((c) => c.tasks.length === 0);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
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
        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <div className="w-72 rotate-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
              <p className="text-sm font-medium text-neutral-900">{activeTask.title}</p>
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
