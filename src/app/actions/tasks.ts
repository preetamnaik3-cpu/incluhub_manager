"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TaskPriority } from "@/lib/types";

export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const columnId = formData.get("columnId") as string;
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const priority = (formData.get("priority") as TaskPriority) || "medium";
  const dueDate = (formData.get("dueDate") as string) || null;
  const boardId = formData.get("boardId") as string;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { count } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("column_id", columnId);

  const { error } = await supabase.from("tasks").insert({
    column_id: columnId,
    title,
    description,
    priority,
    due_date: dueDate || null,
    position: count ?? 0,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/board/${boardId}`);
}

export async function updateTask(formData: FormData) {
  const supabase = await createClient();
  const taskId = formData.get("taskId") as string;
  const boardId = formData.get("boardId") as string;
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const priority = formData.get("priority") as TaskPriority;
  const dueDate = (formData.get("dueDate") as string) || null;
  const assigneeId = (formData.get("assigneeId") as string) || null;

  const { error } = await supabase
    .from("tasks")
    .update({
      title,
      description,
      priority,
      due_date: dueDate || null,
      assignee_id: assigneeId || null,
    })
    .eq("id", taskId);

  if (error) throw new Error(error.message);
  revalidatePath(`/board/${boardId}`);
}

export async function moveTask(
  taskId: string,
  columnId: string,
  position: number,
  boardId: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({ column_id: columnId, position })
    .eq("id", taskId);

  if (error) throw new Error(error.message);
  revalidatePath(`/board/${boardId}`);
}

export async function deleteTask(taskId: string, boardId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/board/${boardId}`);
}

export async function addComment(formData: FormData) {
  const supabase = await createClient();
  const taskId = formData.get("taskId") as string;
  const boardId = formData.get("boardId") as string;
  const content = formData.get("content") as string;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("comments").insert({
    task_id: taskId,
    user_id: user.id,
    content,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/board/${boardId}`);
}
