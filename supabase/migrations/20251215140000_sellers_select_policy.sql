-- Allow collectors and admins to list sellers for product creation dropdowns.
do $$
begin
  execute 'alter table public.sellers enable row level security';
exception
  when others then null;
end $$;

do $$
begin
  execute 'drop policy if exists sellers_select_for_collectors on public.sellers';
  execute $policy$
    create policy sellers_select_for_collectors
    on public.sellers
    for select
    to authenticated
    using (public.current_user_role() in ('collector', 'admin'));
  $policy$;
exception
  when others then null;
end $$;

grant select on table public.sellers to authenticated;
