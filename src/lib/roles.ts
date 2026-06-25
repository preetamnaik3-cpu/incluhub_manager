import type { UserRole } from "./types";

export const ROLE_CONFIG: Record<
  UserRole,
  { label: string; color: string; bg: string; border: string }
> = {
  super_admin: {
    label: "Super Admin",
    color: "#8B5CF6",
    bg: "bg-violet-100",
    border: "border-violet-300",
  },
  manager: {
    label: "Manager",
    color: "#F97316",
    bg: "bg-orange-100",
    border: "border-orange-300",
  },
  editor: {
    label: "Editor",
    color: "#84CC16",
    bg: "bg-lime-100",
    border: "border-lime-300",
  },
  viewer: {
    label: "Viewer",
    color: "#0EA5E9",
    bg: "bg-sky-100",
    border: "border-sky-300",
  },
  client: {
    label: "Client",
    color: "#EC4899",
    bg: "bg-pink-100",
    border: "border-pink-300",
  },
};

export const COPY = {
  tagline: "Incluhub's command center for getting things done.",
  emptyBoard: "Nothing here yet — let's make something happen!",
  taskMoved: "Task moved! Nice work.",
  commentSent: "Comment sent — they'll see it.",
  taskCreated: "Task created! Let's go.",
  greeting: (name: string) => `Hey ${name}, here's what's on your plate today.`,
};

export function getRoleLabel(role: UserRole) {
  return ROLE_CONFIG[role]?.label ?? role;
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: "Full CRM control — all projects, teams, boards, and users",
  manager: "Runs assigned project(s); creates teams and manages editors/viewers",
  editor: "Assigned teams only; edit and move tasks assigned to them",
  viewer: "Assigned teams only; read-only, no comments",
  client: "Sees entire project; view and comment only",
};

export const ASSIGNABLE_ROLES: UserRole[] = [
  "super_admin",
  "manager",
  "editor",
  "viewer",
  "client",
];
