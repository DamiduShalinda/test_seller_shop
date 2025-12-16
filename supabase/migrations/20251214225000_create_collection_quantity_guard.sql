-- Prevent collectors from recording more items than exist in the batch.
-- Enforces: sum(collections.collected_quantity) <= batches.quantity.

create or replace function public.create_collection(
  batch_id uuid,
  collected_quantity integer
)
returns public.collections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_batch public.batches%rowtype;
  v_collection public.collections%rowtype;
  v_existing_total integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  v_role := public.current_user_role();
  if v_role not in ('collector', 'admin') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if batch_id is null then
    raise exception 'Missing batch_id' using errcode = '22023';
  end if;

  if collected_quantity is null or collected_quantity <= 0 then
    raise exception 'Invalid collected_quantity' using errcode = '22023';
  end if;

  select *
  into v_batch
  from public.batches b
  where b.id = batch_id;

  if not found then
    raise exception 'Batch not found' using errcode = 'P0002';
  end if;

  if v_batch.status not in ('created', 'collecting') then
    raise exception 'Batch is not collectable' using errcode = '22000';
  end if;

  select coalesce(sum(c.collected_quantity), 0)::int
  into v_existing_total
  from public.collections c
  where c.batch_id = batch_id;

  if v_existing_total + collected_quantity > v_batch.quantity then
    raise exception 'Collected quantity exceeds batch quantity'
      using errcode = '22000',
            detail = format(
              'batch_quantity=%s already_recorded=%s attempted=%s',
              v_batch.quantity,
              v_existing_total,
              collected_quantity
            );
  end if;

  insert into public.collections (batch_id, collector_id, collected_quantity)
  values (batch_id, auth.uid(), collected_quantity)
  returning *
  into v_collection;

  return v_collection;
end;
$$;

