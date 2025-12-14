-- Products owned by creator (seller) with soft-delete (archive).
-- This repo's rule: no historical records are ever deleted.

alter table public.products
  add column if not exists created_by uuid references public.users(id);

alter table public.products
  add column if not exists archived_at timestamptz;

-- RLS policies (best-effort; safe to re-run).
-- NOTE: If your project already manages RLS elsewhere, adjust these accordingly.
do $$
begin
  execute 'alter table public.products enable row level security';
exception
  when others then
    -- ignore (e.g., insufficient privilege in some environments)
    null;
end $$;

do $$
begin
  execute 'drop policy if exists products_select_active on public.products';
  execute 'drop policy if exists products_select_active_or_owned on public.products';
  execute $policy$
    create policy products_select_active_or_owned
    on public.products
    for select
    to authenticated
    using (archived_at is null or created_by = auth.uid());
  $policy$;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  execute 'drop policy if exists products_insert_own on public.products';
  execute $policy$
    create policy products_insert_own
    on public.products
    for insert
    to authenticated
    with check (created_by = auth.uid());
  $policy$;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  execute 'drop policy if exists products_update_own on public.products';
  execute $policy$
    create policy products_update_own
    on public.products
    for update
    to authenticated
    using (created_by = auth.uid())
    with check (created_by = auth.uid());
  $policy$;
exception
  when duplicate_object then null;
end $$;
