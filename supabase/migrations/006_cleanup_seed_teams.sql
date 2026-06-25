-- Remove placeholder seed teams (Production, Management) from 002_seed.sql

update public.profiles
set team_id = null
where team_id in (
  select id from public.teams where name in ('Production', 'Management')
)
   or role in ('manager', 'super_admin', 'client');

delete from public.teams
where name in ('Production', 'Management');
