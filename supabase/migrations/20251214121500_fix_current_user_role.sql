-- Fix recursive RLS evaluation:
-- Existing policies call is_admin() -> current_user_role() -> SELECT public.users,
-- while public.users policies also call is_admin(), causing stack depth overflow.
-- Read role from JWT app_metadata instead of querying tables.

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
as $$
  select case (auth.jwt() -> 'app_metadata' ->> 'role')
    when 'seller' then 'seller'::public.user_role
    when 'collector' then 'collector'::public.user_role
    when 'shop_owner' then 'shop_owner'::public.user_role
    when 'admin' then 'admin'::public.user_role
    else null
  end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

