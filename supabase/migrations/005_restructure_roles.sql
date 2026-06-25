-- Restructure: Project (client company) → Teams → Boards
-- Roles: super_admin, manager, editor, viewer, client

-- 1. Rename admin → manager (avoids enum ADD VALUE + UPDATE in one transaction)
do $$ begin
  alter type user_role rename value 'admin' to 'manager';
exception
  when invalid_parameter_value then
    alter type user_role add value if not exists 'manager';
end $$;

-- 2. Team member sub-roles for editors/viewers on a team
do $$ begin
  create type team_member_role as enum ('editor', 'viewer');
exception when duplicate_object then null;
end $$;

-- 3. Drop old RLS policies BEFORE dropping projects.team_id (policies depend on that column)
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Internal users can view team profiles" on public.profiles;
drop policy if exists "Super admin can update profiles" on public.profiles;
drop policy if exists "Super admin views all profiles" on public.profiles;
drop policy if exists "Users can update own name" on public.profiles;
drop policy if exists "Internal users can view teams" on public.teams;
drop policy if exists "Super admin manages teams" on public.teams;
drop policy if exists "Internal users view team projects" on public.projects;
drop policy if exists "Clients view own project" on public.projects;
drop policy if exists "Admins manage projects" on public.projects;
drop policy if exists "Internal view team boards" on public.boards;
drop policy if exists "Super admin views all boards" on public.boards;
drop policy if exists "Clients view project boards" on public.boards;
drop policy if exists "Admins manage boards" on public.boards;
drop policy if exists "View columns via board" on public.columns;
drop policy if exists "Editors manage columns" on public.columns;
drop policy if exists "View tasks via column" on public.tasks;
drop policy if exists "Editors create tasks" on public.tasks;
drop policy if exists "Editors update tasks" on public.tasks;
drop policy if exists "Admins delete tasks" on public.tasks;
drop policy if exists "View comments on visible tasks" on public.comments;
drop policy if exists "Authenticated users comment" on public.comments;

-- 4. Projects = client companies (Elvix, Kosara)
alter table public.projects add column if not exists client_user_id uuid references public.profiles(id) on delete set null;

-- Drop old job-style project constraints if present
alter table public.projects drop constraint if exists projects_team_id_fkey;
alter table public.projects drop column if exists team_id;

-- 5. Teams belong to a project
alter table public.teams add column if not exists project_id uuid references public.projects(id) on delete cascade;

-- 6. Client users link to their project
alter table public.profiles add column if not exists client_project_id uuid references public.projects(id) on delete set null;

-- 7. Project managers (super admin assigns; same manager can have multiple rows)
create table if not exists public.project_managers (
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, profile_id)
);

-- 8. Team members (editors & viewers assigned to specific teams)
create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  member_role team_member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (team_id, profile_id)
);

create index if not exists idx_team_members_profile on public.team_members(profile_id);
create index if not exists idx_project_managers_profile on public.project_managers(profile_id);
create index if not exists idx_teams_project on public.teams(project_id);

-- 9. Migrate admin → manager (only when rename in step 1 used ADD VALUE instead)
do $$
begin
  if exists (
    select 1 from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'user_role' and e.enumlabel = 'admin'
  ) then
    update public.profiles set role = 'manager'::user_role where role::text = 'admin';
  end if;
end $$;

-- 10. Migrate legacy brand-teams (elevx, kosarah) into company projects
do $$
declare
  t record;
  pid uuid;
begin
  for t in select * from public.teams where lower(name) in ('elevx', 'elvix', 'kosarah', 'kosara') loop
    insert into public.projects (name, description)
    values (
      initcap(case when lower(t.name) in ('elevx', 'elvix') then 'Elvix' else 'Kosara' end),
      'Client company project'
    )
    on conflict do nothing
    returning id into pid;

    if pid is null then
      select id into pid from public.projects
      where lower(name) in ('elvix', 'elevx', 'kosara', 'kosarah')
      limit 1;
    end if;

    update public.teams set project_id = pid where id = t.id;
  end loop;
end $$;

-- 11. Invites: add project_id
alter table public.invites add column if not exists project_id uuid references public.projects(id) on delete set null;

-- 12. Helper functions
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin');
$$;

create or replace function public.get_managed_project_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select project_id from public.project_managers where profile_id = auth.uid();
$$;

create or replace function public.get_member_team_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select team_id from public.team_members where profile_id = auth.uid();
$$;

create or replace function public.get_client_project_id()
returns uuid language sql stable security definer set search_path = public as $$
  select client_project_id from public.profiles where id = auth.uid() and role = 'client';
$$;

create or replace function public.can_access_project(p_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.is_super_admin()
    or p_project_id in (select public.get_managed_project_ids())
    or p_project_id = public.get_client_project_id();
$$;

create or replace function public.can_access_team(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.is_super_admin()
    or p_team_id in (select public.get_member_team_ids())
    or exists (
      select 1 from public.teams t
      where t.id = p_team_id
        and t.project_id in (select public.get_managed_project_ids())
    )
    or exists (
      select 1 from public.teams t
      where t.id = p_team_id
        and t.project_id = public.get_client_project_id()
    );
$$;

-- 13. Update redeem_invite for new model
create or replace function public.redeem_invite(invite_token text)
returns void language plpgsql security definer set search_path = public as $$
declare
  inv public.invites%rowtype;
  user_email text;
begin
  if auth.uid() is null then raise exception 'Must be signed in to redeem invite'; end if;
  select email into user_email from auth.users where id = auth.uid();
  select * into inv from public.invites
  where token = invite_token and used_at is null and expires_at > now();
  if not found then raise exception 'Invalid or expired invite'; end if;
  if lower(trim(inv.email)) != lower(trim(user_email)) then
    raise exception 'Sign in with the invited email: %', inv.email;
  end if;

  update public.profiles
  set role = inv.role,
      team_id = null,
      client_project_id = case when inv.role = 'client' then inv.project_id else null end
  where id = auth.uid();

  if inv.role in ('editor', 'viewer') and inv.team_id is not null then
    insert into public.team_members (team_id, profile_id, member_role)
    values (inv.team_id, auth.uid(), inv.role::text::team_member_role)
    on conflict (team_id, profile_id) do update set member_role = excluded.member_role;
  end if;

  if inv.role = 'manager' and inv.project_id is not null then
    insert into public.project_managers (project_id, profile_id)
    values (inv.project_id, auth.uid())
    on conflict do nothing;
  end if;

  update public.invites set used_at = now() where id = inv.id;
end;
$$;

grant execute on function public.redeem_invite(text) to authenticated;

-- 14. New RLS policies
alter table public.project_managers enable row level security;
alter table public.team_members enable row level security;

create policy "Super admin all profiles" on public.profiles for all using (public.is_super_admin());
create policy "Users view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own name" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Managers view project profiles" on public.profiles for select using (
  public.get_user_role() = 'manager'
  and exists (
    select 1 from public.teams t
    join public.team_members tm on tm.team_id = t.id
    where t.project_id in (select public.get_managed_project_ids())
      and tm.profile_id = profiles.id
  )
);

create policy "Super admin projects" on public.projects for all using (public.is_super_admin());
create policy "Managers view own projects" on public.projects for select using (
  id in (select public.get_managed_project_ids())
);
create policy "Clients view own project" on public.projects for select using (
  id = public.get_client_project_id()
);

create policy "Super admin project_managers" on public.project_managers for all using (public.is_super_admin());
create policy "Managers view own project_managers" on public.project_managers for select using (
  profile_id = auth.uid() or project_id in (select public.get_managed_project_ids())
);

create policy "Super admin teams" on public.teams for all using (public.is_super_admin());
create policy "Managers manage project teams" on public.teams for all using (
  project_id in (select public.get_managed_project_ids())
);
create policy "Members view teams" on public.teams for select using (
  public.can_access_team(id)
);

create policy "Super admin team_members" on public.team_members for all using (public.is_super_admin());
create policy "Managers manage team_members" on public.team_members for all using (
  exists (
    select 1 from public.teams t
    where t.id = team_members.team_id
      and t.project_id in (select public.get_managed_project_ids())
  )
);
create policy "Users view own membership" on public.team_members for select using (profile_id = auth.uid());

create policy "Super admin boards" on public.boards for all using (public.is_super_admin());
create policy "View boards via team access" on public.boards for select using (
  team_id is not null and public.can_access_team(team_id)
);
create policy "Managers manage boards" on public.boards for all using (
  exists (
    select 1 from public.teams t
    where t.id = boards.team_id
      and t.project_id in (select public.get_managed_project_ids())
  )
);

create policy "View columns via board" on public.columns for select using (
  board_id in (select id from public.boards)
);
create policy "Managers manage columns" on public.columns for all using (
  public.get_user_role() in ('super_admin', 'manager')
  and board_id in (select b.id from public.boards b join public.teams t on t.id = b.team_id
    where t.project_id in (select public.get_managed_project_ids()) or public.is_super_admin())
);

create policy "View tasks via column" on public.tasks for select using (
  column_id in (select id from public.columns)
);
create policy "Managers create tasks" on public.tasks for insert with check (
  public.is_super_admin() or public.get_user_role() = 'manager'
);
create policy "Editors create tasks" on public.tasks for insert with check (
  public.get_user_role() = 'editor'
  and exists (
    select 1 from public.columns c
    join public.boards b on b.id = c.board_id
    where c.id = column_id and public.can_access_team(b.team_id)
  )
);
create policy "Managers update tasks" on public.tasks for update using (
  public.is_super_admin() or public.get_user_role() = 'manager'
);
create policy "Editors update own assigned tasks" on public.tasks for update using (
  public.get_user_role() = 'editor' and assignee_id = auth.uid()
);
create policy "Managers delete tasks" on public.tasks for delete using (
  public.is_super_admin() or public.get_user_role() = 'manager'
);

create policy "View comments" on public.comments for select using (
  task_id in (select id from public.tasks)
);
create policy "Client and internal comment" on public.comments for insert with check (
  auth.uid() = user_id
  and public.get_user_role() in ('super_admin', 'manager', 'editor', 'client')
);
