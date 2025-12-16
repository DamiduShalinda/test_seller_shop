-- Fix collector handover failing with invalid item status transition created -> in_shop.
-- Some environments enforce item status transitions; ensure we go through in_transit first.

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
  v_already_in_shop integer;
  v_needed integer;
  v_available integer;
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

  select count(*)
  into v_already_in_shop
  from public.items i
  where i.batch_id = v_collection.batch_id
    and i.current_shop_id = p_shop_id
    and i.status = 'in_shop';

  v_needed := greatest(v_collection.collected_quantity - v_already_in_shop, 0);

  if v_needed > 0 then
    select count(*)
    into v_available
    from public.items i
    where i.batch_id = v_collection.batch_id
      and i.current_shop_id is null
      and i.status in ('created', 'in_transit');

    if v_available < v_needed then
      raise exception 'Not enough items available to hand over'
        using errcode = '22000',
              detail = format(
                'needed=%s collected=%s already_in_shop=%s available_unassigned=%s',
                v_needed,
                v_collection.collected_quantity,
                v_already_in_shop,
                v_available
              );
    end if;

    with candidates as (
      select i.id
      from public.items i
      where i.batch_id = v_collection.batch_id
        and i.current_shop_id is null
        and i.status in ('created', 'in_transit')
      order by i.created_at asc
      limit v_needed
    ), mark_in_transit as (
      update public.items i
      set status = 'in_transit'
      from candidates c
      where i.id = c.id
        and i.status = 'created'
      returning i.id
    ), moved as (
      update public.items i
      set current_shop_id = p_shop_id,
          status = 'in_shop'
      from candidates c
      where i.id = c.id
        and i.status = 'in_transit'
      returning 1
    )
    select count(*) into v_moved_count from moved;

    if v_moved_count <> v_needed then
      raise exception 'Failed to move items for handover'
        using errcode = '22000',
              detail = format('moved=%s needed=%s', v_moved_count, v_needed);
    end if;
  end if;

  update public.collections
  set handed_to_shop = true,
      shop_id = p_shop_id,
      handover_proof = btrim(p_handover_proof),
      handed_to_shop_at = now()
  where id = collection_id
  returning *
  into v_collection;

  if v_batch.status = 'collected' then
    update public.batches
    set status = 'in_shop'
    where id = v_batch.id;
  end if;

  return v_collection;
end;
$$;

