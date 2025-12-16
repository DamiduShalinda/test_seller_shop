-- Quote sale price for a shop by barcode, including admin commission on top of seller base price.
-- Returns both the customer-facing price and the seller net amount.

create or replace function public.rpc_shop_quote_sale_v2(p_barcode text)
returns table (
  item_id uuid,
  status public.item_status,
  seller_id uuid,
  base_price numeric,
  commission_type text,
  commission_value numeric,
  commission_amount numeric,
  sale_price numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with item_data as (
    select
      i.id as item_id,
      i.status,
      b.seller_id,
      b.base_price
    from public.items i
    join public.batches b on b.id = i.batch_id
    where i.barcode = p_barcode
    limit 1
  ), commission_data as (
    select
      c.type,
      c.value
    from item_data d
    left join public.commissions c
      on c.seller_id = d.seller_id
     and c.active = true
    order by c.created_at desc
    limit 1
  )
  select
    d.item_id,
    d.status,
    d.seller_id,
    d.base_price,
    coalesce(cd.type, 'fixed') as commission_type,
    coalesce(cd.value, 0)::numeric as commission_value,
    case coalesce(cd.type, 'fixed')
      when 'percentage' then round(d.base_price * (coalesce(cd.value, 0) / 100), 2)
      when 'fixed' then round(coalesce(cd.value, 0), 2)
      else 0::numeric
    end as commission_amount,
    round(
      d.base_price +
      case coalesce(cd.type, 'fixed')
        when 'percentage' then round(d.base_price * (coalesce(cd.value, 0) / 100), 2)
        when 'fixed' then round(coalesce(cd.value, 0), 2)
        else 0::numeric
      end,
      2
    ) as sale_price
  from item_data d
  left join commission_data cd on true;
$$;

grant execute on function public.rpc_shop_quote_sale_v2(text) to authenticated;

