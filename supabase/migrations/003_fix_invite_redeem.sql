-- Fix invite redemption for authenticated users

grant execute on function public.redeem_invite(text) to authenticated;

create or replace function public.redeem_invite(invite_token text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  inv public.invites%rowtype;
  user_email text;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in to redeem invite';
  end if;

  select email into user_email from auth.users where id = auth.uid();

  select * into inv from public.invites
  where token = invite_token and used_at is null and expires_at > now();

  if not found then
    raise exception 'Invalid or expired invite';
  end if;

  if lower(trim(inv.email)) != lower(trim(user_email)) then
    raise exception 'Sign in with the invited email: %', inv.email;
  end if;

  update public.profiles
  set role = inv.role, team_id = inv.team_id
  where id = auth.uid();

  update public.invites set used_at = now() where id = inv.id;
end;
$$;
