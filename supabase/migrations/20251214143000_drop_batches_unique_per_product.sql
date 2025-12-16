-- Allow sellers to create multiple batches for the same product.
-- Previously there was a unique index on (seller_id, product_id) which prevented this.

drop index if exists public.batches_seller_product_unique;

