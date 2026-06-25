-- Universal team ↔ manager ↔ board sync for every team/brand

-- 1. Every new team automatically gets a Kanban board
create or replace function public.ensure_team_board()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.boards
    where team_id = new.id and project_id is null
  ) then
    insert into public.boards (name, team_id)
    values (new.name || ' Board', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists team_board_seed on public.teams;
create trigger team_board_seed
  after insert on public.teams
  for each row execute function public.ensure_team_board();

-- 2. When a manager is assigned to any team, link their profile to that team
create or replace function public.sync_team_manager_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.manager_id is not null then
    update public.profiles
    set
      team_id = new.id,
      role = case
        when role in ('viewer', 'editor') then 'admin'::user_role
        else role
      end
    where id = new.manager_id
      and role != 'super_admin';
  end if;
  return new;
end;
$$;

drop trigger if exists team_manager_profile_sync on public.teams;
create trigger team_manager_profile_sync
  after insert or update of manager_id on public.teams
  for each row
  when (new.manager_id is not null)
  execute function public.sync_team_manager_profile();

-- 3. Repair: boards for teams that are missing one
insert into public.boards (name, team_id)
select t.name || ' Board', t.id
from public.teams t
where not exists (
  select 1 from public.boards b
  where b.team_id = t.id and b.project_id is null
);

-- 4. Repair: sync all existing team managers to their team profile
update public.profiles p
set
  team_id = t.id,
  role = case
    when p.role in ('viewer', 'editor') then 'admin'::user_role
    else p.role
  end
from public.teams t
where t.manager_id = p.id
  and p.role != 'super_admin'
  and (p.team_id is distinct from t.id or p.role in ('viewer', 'editor'));
