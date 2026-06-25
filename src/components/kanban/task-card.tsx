"use client";

import { ROLE_CONFIG } from "@/lib/roles";
import type { Task, TaskPriority } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, GripVertical } from "lucide-react";

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "bg-neutral-100 text-neutral-600",
  medium: "bg-sky-100 text-sky-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export function TaskCardItem({
  task,
  onClick,
  canDrag,
}: {
  task: Task;
  onClick: () => void;
  canDrag: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: !canDrag });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-xl border border-neutral-200 bg-white p-3 shadow-sm transition hover:shadow-md",
        isDragging && "rotate-1 opacity-90 shadow-lg"
      )}
    >
      <div className="flex items-start gap-2">
        {canDrag && (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab text-neutral-300 hover:text-neutral-500 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <button onClick={onClick} className="flex-1 text-left">
          <p className="text-sm font-medium text-neutral-900">{task.title}</p>
          {task.description && (
            <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
              {task.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                PRIORITY_STYLES[task.priority]
              )}
            >
              {task.priority}
            </span>
            {task.due_date && (
              <span className="flex items-center gap-1 text-[10px] text-neutral-400">
                <Calendar className="h-3 w-3" />
                {formatDate(task.due_date)}
              </span>
            )}
            {task.assignee && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: `${ROLE_CONFIG[task.assignee.role].color}20`,
                  color: ROLE_CONFIG[task.assignee.role].color,
                }}
              >
                {task.assignee.full_name || task.assignee.email}
              </span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
