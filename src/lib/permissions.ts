import type { Profile, Task, UserRole } from "./types";

export type Action =
  | "view_board"
  | "create_task"
  | "edit_task"
  | "move_task"
  | "delete_task"
  | "assign_task"
  | "comment"
  | "manage_users"
  | "manage_projects"
  | "manage_teams"
  | "manage_team_members";

const ROLE_ACTIONS: Record<UserRole, Action[]> = {
  super_admin: [
    "view_board",
    "create_task",
    "edit_task",
    "move_task",
    "delete_task",
    "assign_task",
    "comment",
    "manage_users",
    "manage_projects",
    "manage_teams",
    "manage_team_members",
  ],
  manager: [
    "view_board",
    "create_task",
    "edit_task",
    "move_task",
    "delete_task",
    "assign_task",
    "comment",
    "manage_teams",
    "manage_team_members",
  ],
  editor: ["view_board", "create_task", "edit_task", "move_task"],
  viewer: ["view_board"],
  client: ["view_board", "comment"],
};

export function can(user: Profile | null, action: Action): boolean {
  if (!user) return false;
  return ROLE_ACTIONS[user.role].includes(action);
}

export function canEditTask(user: Profile, task: Task): boolean {
  if (user.role === "super_admin" || user.role === "manager") return true;
  if (user.role === "editor") return task.assignee_id === user.id;
  return false;
}

export function canMoveTask(user: Profile, task: Task): boolean {
  return canEditTask(user, task);
}

export function canComment(user: Profile): boolean {
  return can(user, "comment");
}

export function isInternalRole(role: UserRole): boolean {
  return role !== "client";
}
