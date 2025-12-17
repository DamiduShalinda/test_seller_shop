-- Ensure the shop barcode creation RPC no longer conflicts with its output parameter names.
create or replace function public.rpc_shop_create_items(
  p_batch_id uuid,
  p_barcodes text[],
  p_initial_status public.item_status default 'created'
)
returns table (item_id uuid, barcode text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_batch public.batches%rowtype;
  v_existing_count integer;
  v_new_count integer;
  v_clean_barcodes text[];
  v_status public.item_status;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  v_role := public.current_user_role();
  if v_role not in ('shop_owner', 'admin') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_batch_id is null then
    raise exception 'Missing batch_id' using errcode = '22023';
  end if;

  select *
  into v_batch
  from public.batches b
  where b.id = p_batch_id;

  if not found then
    raise exception 'Batch not found' using errcode = 'P0002';
  end if;

  if v_batch.status <> 'collected' then
    raise exception 'Batch must be collected before creating barcodes' using errcode = '22000';
  end if;

  if p_barcodes is null or array_length(p_barcodes, 1) is null then
    raise exception 'Provide at least one barcode' using errcode = '22023';
  end if;

  select array_agg(distinct code)
  into v_clean_barcodes
  from (
    select btrim(value) as code
    from unnest(p_barcodes) as value
    where btrim(value) <> ''
  ) as cleaned;

  v_new_count := coalesce(array_length(v_clean_barcodes, 1), 0);
  if v_new_count = 0 then
    raise exception 'Barcodes empty after trimming' using errcode = '22023';
  end if;

  select count(*)::int
  into v_existing_count
  from public.items i
  where i.batch_id = p_batch_id;

  if v_existing_count + v_new_count > v_batch.quantity then
    raise exception 'Cannot create more items than the recorded quantity'
      using errcode = '22000',
            detail = format(
              'batch_quantity=%s existing_items=%s attempted_new=%s',
              v_batch.quantity,
              v_existing_count,
              v_new_count
            );
  end if;

  if exists (
    select 1
    from public.items i
    where i.barcode = any(v_clean_barcodes)
  ) then
    raise exception 'One or more barcodes already exist' using errcode = '23505';
  end if;

  v_status := coalesce(p_initial_status, 'created');

  return query
    insert into public.items as new_item (batch_id, barcode, status)
    select p_batch_id, code, v_status
    from unnest(v_clean_barcodes) as code
    returning new_item.id, new_item.barcode;
end;
$$;

grant execute on function public.rpc_shop_create_items(uuid, text[], public.item_status) to authenticated;
