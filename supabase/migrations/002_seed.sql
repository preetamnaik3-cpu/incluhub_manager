-- Additional policies and seed data for Incluhub

-- Super admin can view all profiles
create policy "Super admin views all profiles"
  on public.profiles for select
  using (public.get_user_role() = 'super_admin');

-- Super admin can view all boards
create policy "Super admin views all boards"
  on public.boards for select
  using (public.get_user_role() = 'super_admin');

-- Note: After creating your super_admin account via signup, promote in SQL Editor:
-- update public.profiles set role = 'super_admin' where email = 'YOUR_EMAIL@example.com';
