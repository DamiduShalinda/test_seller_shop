-- Fields used by the collector handover UI.

alter table public.collections
  add column if not exists handover_proof text;

alter table public.collections
  add column if not exists handed_to_shop_at timestamptz;

