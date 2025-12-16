-- Submit a shop sale event while enforcing:
-- - customer price includes commission (validated against quote)
-- - seller wallet is credited only with seller base_price (net)
-- This is a v2 RPC to avoid breaking existing deployments.

create or replace function public.rpc_shop_submit_sale_event_v2(
  p_client_event_id uuid,
  p_barcode text,
  p_sold_price numeric,
  p_seller_amount numeric,
  p_occurred_at timestamptz,
  p_device_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_shop_id uuid;
  v_item public.items%rowtype;
  v_batch public.batches%rowtype;
  v_sale_id uuid;
  v_quote record;
  v_expected_sale_price numeric;
  v_expected_seller_amount numeric;
begin
  v_shop_id := auth.uid();
  if v_shop_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  v_role := public.current_user_role();
  if v_role not in ('shop_owner', 'admin') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_client_event_id is null then
    raise exception 'Missing client_event_id' using errcode = '22023';
  end if;

  if p_barcode is null or btrim(p_barcode) = '' then
    raise exception 'Missing barcode' using errcode = '22023';
  end if;

  select *
  into v_item
  from public.items i
  where i.barcode = p_barcode;

  if not found then
    raise exception 'Item not found' using errcode = 'P0002';
  end if;

  if v_role <> 'admin' and v_item.current_shop_id <> v_shop_id then
    raise exception 'Item is not in this shop' using errcode = '42501';
  end if;

  if v_item.status <> 'in_shop' then
    raise exception 'Item is not sellable' using errcode = '22000';
  end if;

  select *
  into v_batch
  from public.batches b
  where b.id = v_item.batch_id;

  if not found then
    raise exception 'Batch not found' using errcode = 'P0002';
  end if;

  select * into v_quote
  from public.rpc_shop_quote_sale_v2(p_barcode)
  limit 1;

  v_expected_sale_price := (v_quote.sale_price)::numeric;
  v_expected_seller_amount := (v_quote.base_price)::numeric;

  if p_sold_price is null or abs(p_sold_price - v_expected_sale_price) > 0.01 then
    raise exception 'Invalid sold price' using errcode = '22000';
  end if;

  if p_seller_amount is null or abs(p_seller_amount - v_expected_seller_amount) > 0.01 then
    raise exception 'Invalid seller amount' using errcode = '22000';
  end if;

  -- Prevent duplicate sale by item unique constraint.
  insert into public.sales (item_id, shop_id, sold_price, sold_at)
  values (v_item.id, coalesce(v_item.current_shop_id, v_shop_id), p_sold_price, coalesce(p_occurred_at, now()))
  returning id into v_sale_id;

  update public.items
  set status = 'sold'
  where id = v_item.id;

  -- Credit seller wallet with the net amount (seller base price).
  insert into public.wallets (seller_id, balance)
  values (v_batch.seller_id, 0)
  on conflict (seller_id) do nothing;

  update public.wallets
  set balance = balance + p_seller_amount
  where seller_id = v_batch.seller_id;

  begin
    insert into public.wallet_transactions (seller_id, sale_id, amount)
    values (v_batch.seller_id, v_sale_id, p_seller_amount);
  exception
    when undefined_table or undefined_column then
      null;
  end;

  -- Best-effort event log; do not fail the sale if this table differs.
  begin
    insert into public.sale_events (
      shop_id,
      client_event_id,
      barcode,
      sold_price,
      occurred_at,
      received_at,
      status,
      reason
    )
    values (
      coalesce(v_item.current_shop_id, v_shop_id),
      p_client_event_id,
      p_barcode,
      p_sold_price,
      p_occurred_at,
      now(),
      'accepted',
      null
    );
  exception
    when others then
      null;
  end;

  return v_sale_id;
exception
  when others then
    -- Best-effort log rejected events.
    begin
      insert into public.sale_events (
        shop_id,
        client_event_id,
        barcode,
        sold_price,
        occurred_at,
        received_at,
        status,
        reason
      )
      values (
        v_shop_id,
        p_client_event_id,
        p_barcode,
        p_sold_price,
        p_occurred_at,
        now(),
        'rejected',
        sqlerrm
      );
    exception
      when others then null;
    end;
    raise;
end;
$$;

grant execute on function public.rpc_shop_submit_sale_event_v2(uuid, text, numeric, numeric, timestamptz, text) to authenticated;

