-- Keep RLS role checks consistent with app logic:
-- read role from public.users, but avoid recursive RLS by using SECURITY DEFINER.

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select u.role
  from public.users u
  where u.id = auth.uid();
$$;

