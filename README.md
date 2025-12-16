# Seller Shop

Multi-role inventory, pricing, and sales tracking.

## What this system is

Seller Shop is a multi-role platform for tracking inventory from seller submission → collector handover → shop barcode sale, with admin-controlled approvals (discounts, payouts, returns, disputes).

Each user has exactly one role:
- `seller`
- `collector`
- `shop_owner`
- `admin`

## Role dashboards

After login, dashboards live under `/dashboard`:
- Seller: `/dashboard/seller`
- Collector: `/dashboard/collector`
- Shop owner: `/dashboard/shop`
- Admin: `/dashboard/admin`

## Item + batch lifecycle (high level)

Typical states:
`created` → `collecting` → `collected` → `in_shop` → `partially_sold` → `sold` (or `returned`)

Barcode rules (always enforced):
- Each item has a unique barcode.
- Sales must be recorded via barcode scan; manual sales are blocked.

## End-to-end flow (from product to settlement)

This is the typical “happy path” through the system, including pricing, discounts, and wallet settlement.

### 1) Seller creates a product (if it doesn’t exist yet)

- Seller creates a product listing (the item being sold).
- Seller sets a base price for the product (their intended selling price before platform commission and any admin-approved discounts).

### 2) Seller creates a batch for that product

- Seller creates a batch for the product and enters quantity.
- Seller can adjust quantity until collection starts.
- A batch represents a seller-owned, isolated inventory group (the same product from different sellers is always tracked separately).

### 3) Collector creates a collection record (pickup)

- Collector creates/starts a collection for the seller’s batch.
- Collector verifies quantity/condition at pickup (partial collection is supported).

### 4) Seller verifies the collection

- Seller confirms what was collected (this is the seller-side verification step).
- After confirmation, the batch progresses to the next state for handover.

### 5) Admin creates/prints barcodes for items

- Admin generates item-level barcodes for the collected quantity.
- Each barcode is unique and maps to exactly one physical item.
- Barcode-only sales are enforced later by the shop flow (manual sales are blocked).

### 6) Collector hands over to a shop (with proof)

- Collector delivers the verified items to the shop.
- Collector records handover proof.
- Items transition into the shop state (typically `in_shop`) and the batch reflects that it is now in the shop.

### 7) Shop quotes and sells by barcode (offline-first supported)

- Shop quotes by scanning a barcode; the system validates the item state and resolves the correct selling price (base price + commission, minus any eligible discount).
- Shop completes the sale by scanning the barcode (required). The item becomes `sold`; the batch becomes `partially_sold` or `sold` depending on remaining items.
- If offline, the shop can queue sales locally and sync when back online.

### 8) Commission, discounts, and final price

- Commission: the system applies a configurable commission to sales (the seller’s earnings are calculated from the sale price and commission rules).
- Discounts: sellers can request discounts for a batch; admins accept/reject. Accepted discounts apply under the configured limits (e.g., quantity limit, expiry).
- Discount requests that stay pending too long are auto-rejected (see the workflow summary below).
- Admin can override pricing when needed, with warning and audit logging.
- Abuse controls apply (e.g. repeated rejected price/discount attempts are limited).
- Safety rule: discounts cannot result in negative seller profit.

### 9) Wallet settlement and payouts

- When a sale is recorded, the seller wallet is credited and a wallet ledger entry is created (traceable and auditable).
- Seller can request a payout from their wallet balance.
- Admin approves the payout and marks it paid; the wallet is deducted with a corresponding ledger entry.

### 10) Returns / withdrawals and disputes (exception flows)

- Returns/withdrawals: seller can request return of unsold items; admin approves and completes. Returned items transition to `returned` and are removed from shop sellable inventory.
- Disputes: seller can open disputes; admin resolves/rejects with audit logging.

## How to use (by role)

### Seller

Primary goal: submit sellable inventory, track sales earnings, request discounts/payouts, and handle returns/disputes.

Common tasks:
- Create/submit inventory (product + batch) with base price and quantity.
- Track batch status through collection, shop stocking, and sales.
- Request a discount/price change for a batch (admin reviews).
- View wallet balance and ledger entries created from sales.
- Request a payout and track its status until admin completes it.
- Request return/withdrawal of unsold items (admin approves/completes).
- Open disputes when something looks incorrect (admin resolves/rejects).

### Collector

Primary goal: verify seller inventory and complete handover to a shop with proof.

Common tasks:
- View collection tasks and their required quantities.
- Verify quantity/condition at pickup (partial collection is supported).
- Record handover proof when delivering to a shop.
- Ensure the batch/items transition into the correct “in shop” state after handover.

### Shop owner

Primary goal: sell stocked items by barcode and keep the system in sync (even when offline).

Common tasks:
- Quote by barcode (system validates item state and current price/discount).
- Sell by barcode (barcode scan is mandatory).
- Use offline mode when needed; the app queues sales locally and syncs when back online.
- Troubleshoot failed scans by confirming the item is in a sellable state (`in_shop`) and the barcode is correct.

### Admin

Primary goal: oversee workflows and approvals, ensure pricing/commission integrity, and resolve exceptions.

Common tasks:
- Review and decide on discount requests.
- Review payout requests, approve, and mark paid (wallet deducted with ledger entry).
- Review and complete return requests for unsold/expired items.
- Review and resolve disputes.
- Perform admin-only inventory corrections when required (with audit logging).

## Workflows (summary)

- Role dashboards: `seller`, `collector`, `shop_owner`, `admin` under `/dashboard`
- Traceable lifecycle: seller → batch → shop → sale
- Barcode-only sales: shop quotes + sells by barcode (offline queue supported) via Supabase RPCs
- Payouts: sellers request payout; admin approves and marks paid
- Discounts: sellers request; admin accepts/rejects; pending requests auto-reject after 2 days
- Returns/withdrawals: sellers request return of unsold items; admin approves and completes
- Disputes: sellers can open disputes; admin resolves/rejects

## UI

- Tailwind + shadcn/ui theme (New York / Neutral)
- Role-aware sidebar navigation under `/dashboard`

## Example logins (mock users)

If you seed the demo dataset, you can use these accounts.

All mock users share the same password: `Password123!`

| Role | Email |
|---|---|
| Admin (`admin`) | `admin.mock@seller-shop.local` |
| Seller (`seller`) | `seller.mock@seller-shop.local` |
| Collector (`collector`) | `collector.mock@seller-shop.local` |
| Shop owner (`shop_owner`) | `shop.mock@seller-shop.local` |

To seed the demo dataset, see `seller_shop/mock-users-and-data.md`.

## Admin bootstrap

The first admin can be assigned using the `admin-set-role` Edge Function with a one-time `BOOTSTRAP_SECRET` set in Supabase Edge Function secrets. After at least one admin exists, only admins can assign roles.

## Run locally

1. Create a Supabase project: https://database.new
2. Create `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[INSERT SUPABASE PROJECT API PUBLISHABLE OR ANON KEY]
   ```

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

   App runs at http://localhost:3000
