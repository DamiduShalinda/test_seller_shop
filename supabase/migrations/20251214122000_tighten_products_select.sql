-- Tighten product visibility:
-- remove permissive "select true" policy if present.

do $$
begin
  execute 'drop policy if exists products_select_authenticated on public.products';
exception
  when others then null;
end $$;

