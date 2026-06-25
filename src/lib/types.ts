export type UserRole =
  | "super_admin"
  | "manager"
  | "editor"
  | "viewer"
  | "client";

export type TeamMemberRole = "editor" | "viewer";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  team_id: string | null;
  client_project_id: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  client_user_id: string | null;
  created_at: string;
  client?: Profile | null;
  managers?: Profile[];
  teams?: Team[];
}

export interface Team {
  id: string;
  name: string;
  project_id: string | null;
  manager_id: string | null;
  created_at: string;
  project?: Project;
}

export interface TeamMember {
  team_id: string;
  profile_id: string;
  member_role: TeamMemberRole;
  created_at: string;
  profile?: Profile;
}

export interface ProjectManager {
  project_id: string;
  profile_id: string;
  created_at: string;
  profile?: Profile;
}

export interface Board {
  id: string;
  name: string;
  team_id: string | null;
  project_id: string | null;
  created_at: string;
  team?: Team;
}

export interface BoardColumn {
  id: string;
  board_id: string;
  name: string;
  position: number;
}

export interface Task {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  priority: TaskPriority;
  due_date: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assignee?: Profile | null;
  creator?: Profile | null;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: Profile;
}

export interface Invite {
  id: string;
  email: string;
  role: UserRole;
  team_id: string | null;
  project_id: string | null;
  token: string;
  expires_at: string;
  used_at: string | null;
}

export interface BoardWithColumns extends Board {
  columns: (BoardColumn & { tasks: Task[] })[];
}
