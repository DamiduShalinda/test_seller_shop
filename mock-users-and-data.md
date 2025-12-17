# Mock users and mock data

This repo can be seeded with a complete demo dataset (Auth users + app roles + sample workflow records).

## Mock users

All mock users share the same password: `Password123!`

| Label | Role | Email |
|---|---|---|
| Admin | `admin` | `admin.mock@seller-shop.local` |
| Seller | `seller` | `seller.mock@seller-shop.local` |
| Collector | `collector` | `collector.mock@seller-shop.local` |
| Shop | `shop_owner` | `shop.mock@seller-shop.local` |

## What gets created

- Auth users (email confirmed) + `public.users` role rows + role tables (`admins`, `sellers`, `collectors`, `shops`)
- One product: `Mock Cinnamon Tea`
- One batch (seller-owned): base price `100.00`, quantity `5`
- Commission for seller: `10%`
- Accepted discount for the batch: price `90.00`, limit `2`, expires in 7 days
- 5 items with barcodes `MOCK-0001` … `MOCK-0005`
- One collection record + seller confirmation + handover proof
- Items stocked into the shop (`in_shop`) and batch moved to `in_shop`
- One sale record at `90.00` (discount applied), item moved to `sold`, batch moved to `partially_sold`
- Wallet balance + wallet ledger entry (seller credited `81.00`)
- One payout request (`20.00`, `requested`)
- One return request (`requested`)
- One open dispute
- One notification + an audit log entry for the seed run

## How to run the seed

Set env vars:

- `NEXT_PUBLIC_SUPABASE_URL` (required)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (required)
- `SUPABASE_SERVICE_ROLE_KEY` (required, for Auth admin + bypass RLS in the seed script)

Then run:

```bash
node scripts/seed-mock-data.mjs
```

After seeding:

- Go to `/dashboard/admin` (login as Admin) to see pending workflows and manage discounts/payouts/returns/disputes.
- Go to `/dashboard/shop` (login as Shop) to quote/sell by barcode.
- Go to `/dashboard/seller` (login as Seller) to see wallet/discounts/returns/disputes.

## Resetting domain data (keep user profiles)

To wipe products/batches/items/collections/etc. without touching existing users, run:

```bash
NEXT_PUBLIC_SUPABASE_URL=... \\
SUPABASE_SERVICE_ROLE_KEY=... \\
node scripts/reset-domain-data.mjs
```

This script truncates all domain tables (products, batches, items, collections, discounts, commissions, wallets, payouts, sales, audit logs) while leaving `auth.users`, `public.users`, and role tables (`sellers`, `collectors`, `shops`, `admins`) intact.
