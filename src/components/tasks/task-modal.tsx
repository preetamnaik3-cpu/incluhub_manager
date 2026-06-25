"use client";

import {
  createTask,
  deleteTask,
  updateTask,
} from "@/app/actions/tasks";
import { CommentThread } from "@/components/tasks/comment-thread";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Comment, Profile, Task, TaskPriority } from "@/lib/types";
import { can, canEditTask } from "@/lib/permissions";
import { COPY } from "@/lib/roles";
import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function TaskModal({
  task,
  boardId,
  profile,
  teamMembers,
  comments,
  onClose,
  defaultColumnId,
}: {
  task: Task | null;
  boardId: string;
  profile: Profile;
  teamMembers: Profile[];
  comments: Comment[];
  onClose: () => void;
  defaultColumnId?: string;
}) {
  const isNew = !task;
  const editable = task ? canEditTask(profile, task) : can(profile, "create_task");
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id ?? "");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("boardId", boardId);
      fd.set("title", title);
      fd.set("description", description);
      fd.set("priority", priority);
      fd.set("dueDate", dueDate);
      fd.set("assigneeId", assigneeId);

      if (isNew) {
        fd.set("columnId", defaultColumnId!);
        await createTask(fd);
        toast.success(COPY.taskCreated);
      } else {
        fd.set("taskId", task.id);
        await updateTask(fd);
        toast.success("Task updated!");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!task || !confirm("Delete this task?")) return;
    setLoading(true);
    try {
      await deleteTask(task.id, boardId);
      toast.success("Task deleted.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 p-5">
          <h3 className="text-lg font-bold text-neutral-900">
            {isNew ? "New Task" : "Task Details"}
          </h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-neutral-100">
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={!editable}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!editable}
              rows={3}
              className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                disabled={!editable}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Due date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={!editable}
              />
            </div>
          </div>
          {can(profile, "assign_task") && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {editable && (
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {isNew ? "Create task" : "Save changes"}
              </Button>
              {!isNew && can(profile, "delete_task") && (
                <Button type="button" variant="danger" onClick={handleDelete} disabled={loading}>
                  Delete
                </Button>
              )}
            </div>
          )}
        </form>

        {!isNew && task && (
          <div className="border-t border-neutral-100 p-5">
            <CommentThread
              comments={comments}
              taskId={task.id}
              boardId={boardId}
              profile={profile}
            />
          </div>
        )}
      </div>
    </div>
  );
}
