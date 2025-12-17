-- Allow collectors to create seller products and batches while preserving 
-- authorization and validation through security definer RPCs.

drop function if exists public.collector_create_product(uuid, text, text);
drop function if exists public.collector_create_batch(uuid, numeric, integer);

drop function if exists public.collector_create_batch(uuid, numeric, integer, uuid);

drop function if exists public.collector_create_product(uuid, text);

create or replace function public.collector_create_product(
  p_seller_id uuid,
  p_name text,
  p_description text default null
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_seller public.sellers%rowtype;
  v_product public.products%rowtype;
  v_name text;
  v_description text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  v_role := public.current_user_role();
  if v_role not in ('collector', 'admin') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_seller_id is null then
    raise exception 'Missing seller_id' using errcode = '22023';
  end if;

  select * into v_seller from public.sellers where id = p_seller_id;
  if not found then
    raise exception 'Seller not found' using errcode = 'P0002';
  end if;

  v_name := coalesce(btrim(p_name), '');
  if v_name = '' then
    raise exception 'Missing product name' using errcode = '22023';
  end if;

  v_description := nullif(btrim(coalesce(p_description, '')), '');

  insert into public.products (name, description, created_by)
  values (v_name, v_description, p_seller_id)
  returning * into v_product;

  return v_product;
end;
$$;

create or replace function public.collector_create_product(
  p_seller_id uuid,
  p_name text
)
returns public.products
language sql
security definer
set search_path = public
as $$
  select public.collector_create_product(p_seller_id, p_name, null);
$$;

grant execute on function public.collector_create_product(uuid, text, text) to authenticated;

grant execute on function public.collector_create_product(uuid, text) to authenticated;

create or replace function public.collector_create_batch(
  p_product_id uuid,
  p_base_price numeric,
  p_quantity integer
)
returns public.batches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_product public.products%rowtype;
  v_batch public.batches%rowtype;
  v_price numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  v_role := public.current_user_role();
  if v_role not in ('collector', 'admin') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_product_id is null then
    raise exception 'Missing product_id' using errcode = '22023';
  end if;

  select *
  into v_product
  from public.products
  where id = p_product_id
    and archived_at is null;

  if not found then
    raise exception 'Product not found or archived' using errcode = 'P0002';
  end if;

  if v_product.created_by is null then
    raise exception 'Product missing owner' using errcode = '22000';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Invalid quantity' using errcode = '22023';
  end if;

  if p_base_price is null or p_base_price < 0 then
    raise exception 'Invalid base price' using errcode = '22023';
  end if;

  v_price := round(coalesce(p_base_price, 0), 2);

  insert into public.batches (seller_id, product_id, base_price, quantity)
  values (v_product.created_by, v_product.id, v_price, p_quantity)
  returning * into v_batch;

  return v_batch;
end;
$$;

grant execute on function public.collector_create_batch(uuid, numeric, integer) to authenticated;
