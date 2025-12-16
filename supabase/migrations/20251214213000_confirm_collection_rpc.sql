-- Confirm a collection (seller confirmation) via SECURITY DEFINER RPC.
-- This avoids permission errors when RLS policies/FK checks reference public.batches,
-- and centralizes authorization/validation for the seller confirmation step.

create or replace function public.confirm_collection(collection_id uuid)
returns public.collections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_collection public.collections%rowtype;
  v_batch public.batches%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  v_role := public.current_user_role();
  if v_role not in ('seller', 'admin') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if collection_id is null then
    raise exception 'Missing collection_id' using errcode = '22023';
  end if;

  select *
  into v_collection
  from public.collections c
  where c.id = collection_id;

  if not found then
    raise exception 'Collection not found' using errcode = 'P0002';
  end if;

  select *
  into v_batch
  from public.batches b
  where b.id = v_collection.batch_id;

  if not found then
    raise exception 'Batch not found' using errcode = 'P0002';
  end if;

  if v_role <> 'admin' and v_batch.seller_id <> auth.uid() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if v_collection.seller_confirmed then
    return v_collection;
  end if;

  update public.collections
  set seller_confirmed = true
  where id = collection_id
  returning *
  into v_collection;

  return v_collection;
end;
$$;

grant execute on function public.confirm_collection(uuid) to authenticated;

