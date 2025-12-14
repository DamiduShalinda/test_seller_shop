-- ===============================
-- ENUMS
-- ===============================

create type user_role as enum (
  'seller',
  'collector',
  'shop_owner',
  'admin'
);

create type batch_status as enum (
  'created',
  'collecting',
  'collected',
  'in_shop',
  'partially_sold',
  'sold',
  'returned'
);

create type item_status as enum (
  'created',
  'in_transit',
  'in_shop',
  'sold',
  'returned'
);

create type payout_status as enum (
  'requested',
  'approved',
  'rejected',
  'paid'
);

create type discount_status as enum (
  'pending',
  'accepted',
  'rejected',
  'expired'
);

-- ===============================
-- USERS & ROLES
-- ===============================

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  created_at timestamptz default now()
);

-- Enforce one role per user
create unique index users_unique_role on users(id, role);

-- ===============================
-- SELLERS / COLLECTORS / SHOPS
-- ===============================

create table sellers (
  id uuid primary key references users(id),
  name text not null
);

create table collectors (
  id uuid primary key references users(id),
  name text not null
);

create table shops (
  id uuid primary key references users(id),
  name text not null,
  offline_enabled boolean default true
);

-- ===============================
-- PRODUCTS (GLOBAL CATALOG)
-- ===============================

create table products (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references users(id),
  name text not null,
  description text,
  archived_at timestamptz,
  created_at timestamptz default now()
);

-- ===============================
-- BATCHES (SELLER-SPECIFIC)
-- ===============================

create table batches (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers(id),
  product_id uuid not null references products(id),
  base_price numeric(10,2) not null check (base_price >= 0),
  quantity integer not null check (quantity > 0),
  status batch_status not null default 'created',
  rejection_count integer not null default 0,
  created_at timestamptz default now()
);

-- Seller cannot add same product twice
create unique index batches_seller_product_unique
on batches(seller_id, product_id);

-- ===============================
-- ITEMS (PER-ITEM BARCODE)
-- ===============================

create table items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id),
  barcode text not null unique,
  status item_status not null default 'created',
  current_shop_id uuid references shops(id),
  created_at timestamptz default now()
);

-- ===============================
-- COLLECTIONS
-- ===============================

create table collections (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id),
  collector_id uuid not null references collectors(id),
  collected_quantity integer not null check (collected_quantity > 0),
  seller_confirmed boolean not null default false,
  handed_to_shop boolean not null default false,
  created_at timestamptz default now()
);

-- ===============================
-- SALES
-- ===============================

create table sales (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id),
  shop_id uuid not null references shops(id),
  sold_price numeric(10,2) not null check (sold_price >= 0),
  sold_at timestamptz default now()
);

-- One item can only be sold once
create unique index sales_unique_item on sales(item_id);

-- ===============================
-- COMMISSIONS
-- ===============================

create table commissions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers(id),
  type text not null check (type in ('percentage', 'fixed')),
  value numeric(10,2) not null check (value >= 0),
  active boolean default true,
  created_at timestamptz default now()
);

-- ===============================
-- DISCOUNTS
-- ===============================

create table discounts (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id),
  item_limit integer,
  discount_price numeric(10,2) not null check (discount_price >= 0),
  status discount_status not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- ===============================
-- WALLETS & PAYOUTS
-- ===============================

create table wallets (
  seller_id uuid primary key references sellers(id),
  balance numeric(12,2) not null default 0
);

create table payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers(id),
  amount numeric(12,2) not null check (amount > 0),
  status payout_status not null default 'requested',
  created_at timestamptz default now()
);

-- ===============================
-- AUDIT LOGS (IMMUTABLE)
-- ===============================

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  entity_id uuid not null,
  action text not null,
  before jsonb,
  after jsonb,
  actor_id uuid not null references users(id),
  created_at timestamptz default now()
);

-- ===============================
-- SAFETY CONSTRAINTS
-- ===============================

-- Prevent negative wallet balances
create or replace function prevent_negative_wallet()
returns trigger as $$
begin
  if new.balance < 0 then
    raise exception 'Wallet balance cannot be negative';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger wallet_balance_check
before update on wallets
for each row
execute function prevent_negative_wallet();

-- ===============================
-- NOTES
-- ===============================
-- • No DELETEs should be allowed in production (handled via RLS)
-- • All corrections must be logged via audit_logs
-- • RLS policies must be added separately
