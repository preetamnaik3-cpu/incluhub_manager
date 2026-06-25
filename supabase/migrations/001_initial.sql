-- inclu_manager initial schema for Incluhub

create type user_role as enum (
  'super_admin', 'admin', 'editor', 'viewer', 'client'
);

create type task_priority as enum (
  'low', 'medium', 'high', 'urgent'
);

-- Teams
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  manager_id uuid,
  created_at timestamptz not null default now()
);

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role user_role not null default 'viewer',
  team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.teams
  add constraint teams_manager_id_fkey
  foreign key (manager_id) references public.profiles(id) on delete set null;

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  team_id uuid not null references public.teams(id) on delete cascade,
  client_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Boards
create table public.boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team_id uuid references public.teams(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint board_scope check (team_id is not null or project_id is not null)
);

-- Columns
create table public.columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null,
  position int not null default 0
);

-- Tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  column_id uuid not null references public.columns(id) on delete cascade,
  title text not null,
  description text,
  assignee_id uuid references public.profiles(id) on delete set null,
  priority task_priority not null default 'medium',
  due_date date,
  position int not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Comments
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- Invites (invite-only registration)
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role user_role not null default 'viewer',
  team_id uuid references public.teams(id) on delete set null,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Helper: get current user's role
create or replace function public.get_user_role()
returns user_role
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Helper: get current user's team
create or replace function public.get_user_team_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select team_id from public.profiles where id = auth.uid();
$$;

-- Auto-create profile on signup (role set via invite redemption)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'viewer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger for tasks
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- Seed default columns for new boards
create or replace function public.seed_board_columns()
returns trigger language plpgsql as $$
begin
  insert into public.columns (board_id, name, position) values
    (new.id, 'Backlog', 0),
    (new.id, 'To Do', 1),
    (new.id, 'In Progress', 2),
    (new.id, 'Review', 3),
    (new.id, 'Done', 4);
  return new;
end;
$$;

create trigger board_columns_seed
  after insert on public.boards
  for each row execute function public.seed_board_columns();

-- Indexes
create index idx_profiles_team on public.profiles(team_id);
create index idx_profiles_role on public.profiles(role);
create index idx_projects_team on public.projects(team_id);
create index idx_projects_client on public.projects(client_id);
create index idx_boards_team on public.boards(team_id);
create index idx_boards_project on public.boards(project_id);
create index idx_columns_board on public.columns(board_id);
create index idx_tasks_column on public.tasks(column_id);
create index idx_tasks_assignee on public.tasks(assignee_id);
create index idx_comments_task on public.comments(task_id);

-- RLS
alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.boards enable row level security;
alter table public.columns enable row level security;
alter table public.tasks enable row level security;
alter table public.comments enable row level security;
alter table public.invites enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Internal users can view team profiles"
  on public.profiles for select using (
    public.get_user_role() in ('super_admin', 'admin', 'editor', 'viewer')
    and (
      public.get_user_role() = 'super_admin'
      or team_id = public.get_user_team_id()
    )
  );

create policy "Super admin can update profiles"
  on public.profiles for update using (public.get_user_role() = 'super_admin');

create policy "Users can update own name"
  on public.profiles for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Teams policies
create policy "Internal users can view teams"
  on public.teams for select using (
    public.get_user_role() in ('super_admin', 'admin', 'editor', 'viewer')
  );

create policy "Super admin manages teams"
  on public.teams for all using (public.get_user_role() = 'super_admin');

-- Projects policies
create policy "Internal users view team projects"
  on public.projects for select using (
    public.get_user_role() in ('super_admin', 'admin', 'editor', 'viewer')
    and (public.get_user_role() = 'super_admin' or team_id = public.get_user_team_id())
  );

create policy "Clients view own project"
  on public.projects for select using (
    public.get_user_role() = 'client' and client_id = auth.uid()
  );

create policy "Admins manage projects"
  on public.projects for all using (
    public.get_user_role() in ('super_admin', 'admin')
    and (public.get_user_role() = 'super_admin' or team_id = public.get_user_team_id())
  );

-- Boards policies
create policy "Internal view team boards"
  on public.boards for select using (
    public.get_user_role() in ('super_admin', 'admin', 'editor', 'viewer')
    and (
      public.get_user_role() = 'super_admin'
      or team_id = public.get_user_team_id()
      or project_id in (
        select id from public.projects
        where team_id = public.get_user_team_id()
      )
    )
  );

create policy "Clients view project boards"
  on public.boards for select using (
    public.get_user_role() = 'client'
    and project_id in (
      select id from public.projects where client_id = auth.uid()
    )
  );

create policy "Admins manage boards"
  on public.boards for all using (
    public.get_user_role() in ('super_admin', 'admin')
  );

-- Columns policies (inherit board access)
create policy "View columns via board"
  on public.columns for select using (
    board_id in (select id from public.boards)
  );

create policy "Editors manage columns"
  on public.columns for all using (
    public.get_user_role() in ('super_admin', 'admin')
  );

-- Tasks policies
create policy "View tasks via column"
  on public.tasks for select using (
    column_id in (select id from public.columns)
  );

create policy "Editors create tasks"
  on public.tasks for insert with check (
    public.get_user_role() in ('super_admin', 'admin', 'editor')
  );

create policy "Editors update tasks"
  on public.tasks for update using (
    public.get_user_role() in ('super_admin', 'admin')
    or (
      public.get_user_role() = 'editor'
      and (created_by = auth.uid() or assignee_id = auth.uid())
    )
  );

create policy "Admins delete tasks"
  on public.tasks for delete using (
    public.get_user_role() in ('super_admin', 'admin')
  );

-- Comments policies
create policy "View comments on visible tasks"
  on public.comments for select using (
    task_id in (select id from public.tasks)
  );

create policy "Authenticated users comment"
  on public.comments for insert with check (
    auth.uid() = user_id
    and public.get_user_role() in ('super_admin', 'admin', 'editor', 'client')
  );

-- Invites policies
create policy "Super admin manages invites"
  on public.invites for all using (public.get_user_role() = 'super_admin');

create policy "Anyone can read invite by token for signup"
  on public.invites for select using (true);

-- Redeem invite function
create or replace function public.redeem_invite(invite_token text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  inv public.invites%rowtype;
begin
  select * into inv from public.invites
  where token = invite_token and used_at is null and expires_at > now();

  if not found then
    raise exception 'Invalid or expired invite';
  end if;

  update public.profiles
  set role = inv.role, team_id = inv.team_id
  where id = auth.uid();

  update public.invites set used_at = now() where id = inv.id;
end;
$$;
