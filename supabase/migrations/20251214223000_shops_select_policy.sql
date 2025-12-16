-- Allow authenticated users to list shops (needed for collector handover dropdown).
-- Keeps read access scoped to known roles via current_user_role().

do $$
begin
  execute 'alter table public.shops enable row level security';
exception
  when others then null;
end $$;

do $$
begin
  execute 'drop policy if exists shops_select_participants on public.shops';
  execute $policy$
    create policy shops_select_participants
    on public.shops
    for select
    to authenticated
    using (public.current_user_role() in ('seller', 'collector', 'shop_owner', 'admin'));
  $policy$;
exception
  when others then null;
end $$;

grant select on table public.shops to authenticated;

