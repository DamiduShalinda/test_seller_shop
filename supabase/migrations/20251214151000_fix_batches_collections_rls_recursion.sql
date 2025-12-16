-- Fix infinite recursion between batches and collections RLS policies.
-- Previous policies used EXISTS subqueries across the two tables, causing mutual recursion.
-- Use SECURITY DEFINER helper functions to query the other table without invoking its RLS.

create or replace function public.is_batch_collector(p_batch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.collections c
    where c.batch_id = p_batch_id
      and c.collector_id = auth.uid()
  );
$$;

create or replace function public.is_collection_seller(p_batch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.batches b
    where b.id = p_batch_id
      and b.seller_id = auth.uid()
  );
$$;

do $$
begin
  execute 'drop policy if exists batches_select_parties on public.batches';
  execute $policy$
    create policy batches_select_parties
    on public.batches
    for select
    to authenticated
    using (
      is_admin()
      or seller_id = auth.uid()
      or public.is_batch_collector(id)
    );
  $policy$;
exception
  when others then null;
end $$;

do $$
begin
  execute 'drop policy if exists collections_select_parties on public.collections';
  execute $policy$
    create policy collections_select_parties
    on public.collections
    for select
    to authenticated
    using (
      is_admin()
      or (is_collector() and collector_id = auth.uid())
      or public.is_collection_seller(batch_id)
    );
  $policy$;
exception
  when others then null;
end $$;

do $$
begin
  execute 'drop policy if exists collections_update_parties on public.collections';
  execute $policy$
    create policy collections_update_parties
    on public.collections
    for update
    to authenticated
    using (
      is_admin()
      or (is_collector() and collector_id = auth.uid())
      or public.is_collection_seller(batch_id)
    )
    with check (
      is_admin()
      or (is_collector() and collector_id = auth.uid())
      or public.is_collection_seller(batch_id)
    );
  $policy$;
exception
  when others then null;
end $$;

