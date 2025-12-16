-- Admin helper RPCs for barcode preparation.
-- These functions avoid requiring direct SELECT access on sensitive tables from the client.

create or replace function public.rpc_admin_collected_batches(p_limit integer default 50)
returns table (
  batch_id uuid,
  quantity integer,
  status public.batch_status,
  created_at timestamptz,
  product_name text,
  seller_name text,
  item_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id as batch_id,
    b.quantity,
    b.status,
    b.created_at,
    p.name as product_name,
    s.name as seller_name,
    (
      select count(*)::int
      from public.items i
      where i.batch_id = b.id
    ) as item_count
  from public.batches b
  join public.products p on p.id = b.product_id
  join public.sellers s on s.id = b.seller_id
  where public.current_user_role() = 'admin'
    and b.status = 'collected'
  order by b.created_at desc
  limit greatest(coalesce(p_limit, 50), 0);
$$;

create or replace function public.rpc_admin_batch_item_barcodes(p_batch_id uuid, p_limit integer default 500)
returns table (barcode text)
language sql
stable
security definer
set search_path = public
as $$
  select i.barcode
  from public.items i
  where public.current_user_role() = 'admin'
    and i.batch_id = p_batch_id
  order by i.created_at asc
  limit greatest(coalesce(p_limit, 500), 0);
$$;

grant execute on function public.rpc_admin_collected_batches(integer) to authenticated;
grant execute on function public.rpc_admin_batch_item_barcodes(uuid, integer) to authenticated;

