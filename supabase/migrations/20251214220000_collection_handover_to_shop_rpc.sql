-- When a collector hands a confirmed collection to a shop, move inventory into the shop.
-- This must:
-- - record the shop, proof, and handover timestamp on the collection
-- - assign the collected number of items to the shop (items.current_shop_id) and mark them in_shop
-- - update the batch status from collected -> in_shop
--
-- Note: collections track quantity, not specific item IDs; we assign the oldest available items.

alter table public.collections
  add column if not exists shop_id uuid references public.shops(id);

create or replace function public.handover_collection_to_shop(
  collection_id uuid,
  p_shop_id uuid,
  p_handover_proof text
)
returns public.collections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_collection public.collections%rowtype;
  v_batch public.batches%rowtype;
  v_moved_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  v_role := public.current_user_role();
  if v_role not in ('collector', 'admin') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if collection_id is null then
    raise exception 'Missing collection_id' using errcode = '22023';
  end if;

  if p_shop_id is null then
    raise exception 'Missing shop_id' using errcode = '22023';
  end if;

  if p_handover_proof is null or btrim(p_handover_proof) = '' then
    raise exception 'Missing handover_proof' using errcode = '22023';
  end if;

  select *
  into v_collection
  from public.collections c
  where c.id = collection_id;

  if not found then
    raise exception 'Collection not found' using errcode = 'P0002';
  end if;

  if v_role <> 'admin' and v_collection.collector_id <> auth.uid() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not v_collection.seller_confirmed then
    raise exception 'Seller has not confirmed this collection' using errcode = '22000';
  end if;

  -- Idempotent: if already handed over, return existing row.
  if v_collection.handed_to_shop then
    return v_collection;
  end if;

  -- Ensure the shop exists.
  perform 1 from public.shops s where s.id = p_shop_id;
  if not found then
    raise exception 'Shop not found' using errcode = 'P0002';
  end if;

  select *
  into v_batch
  from public.batches b
  where b.id = v_collection.batch_id;

  if not found then
    raise exception 'Batch not found' using errcode = 'P0002';
  end if;

  -- Move items into the shop (oldest available first).
  with candidates as (
    select i.id
    from public.items i
    where i.batch_id = v_collection.batch_id
      and i.current_shop_id is null
      and i.status in ('created', 'in_transit')
    order by i.created_at asc
    limit v_collection.collected_quantity
  ), moved as (
    update public.items i
    set current_shop_id = p_shop_id,
        status = 'in_shop'
    from candidates c
    where i.id = c.id
    returning 1
  )
  select count(*) into v_moved_count from moved;

  if v_moved_count <> v_collection.collected_quantity then
    raise exception 'Not enough items available to hand over'
      using errcode = '22000',
            detail = format('%s/%s moved', v_moved_count, v_collection.collected_quantity);
  end if;

  -- Record handover on the collection.
  update public.collections
  set handed_to_shop = true,
      shop_id = p_shop_id,
      handover_proof = btrim(p_handover_proof),
      handed_to_shop_at = now()
  where id = collection_id
  returning *
  into v_collection;

  -- Update batch status to reflect it is now in shop.
  if v_batch.status = 'collected' then
    update public.batches
    set status = 'in_shop'
    where id = v_batch.id;
  end if;

  return v_collection;
end;
$$;

grant execute on function public.handover_collection_to_shop(uuid, uuid, text) to authenticated;
